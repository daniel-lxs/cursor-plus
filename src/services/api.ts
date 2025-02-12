import axios from 'axios';
import {
  CursorStats,
  UsageLimitResponse,
  ExtendedAxiosError,
  UsageItem,
  CursorUsageResponse,
} from '../interfaces/types';
import { log } from '../utils/logger';

export async function getCurrentUsageLimit(
  token: string
): Promise<UsageLimitResponse> {
  try {
    const response = await axios.post(
      'https://www.cursor.com/api/dashboard/get-hard-limit',
      {}, // empty JSON body
      {
        headers: {
          Cookie: `WorkosCursorSessionToken=${token}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    log('[API] Error fetching usage limit: ' + error.message, true);
    throw error;
  }
}

export async function setUsageLimit(
  token: string,
  hardLimit: number,
  noUsageBasedAllowed: boolean
): Promise<void> {
  try {
    await axios.post(
      'https://www.cursor.com/api/dashboard/set-hard-limit',
      {
        hardLimit,
        noUsageBasedAllowed,
      },
      {
        headers: {
          Cookie: `WorkosCursorSessionToken=${token}`,
        },
      }
    );
    log(
      `[API] Successfully ${noUsageBasedAllowed ? 'disabled' : 'enabled'} usage-based pricing with limit: $${hardLimit}`
    );
  } catch (error: any) {
    log('[API] Error setting usage limit: ' + error.message, true);
    throw error;
  }
}

export async function checkUsageBasedStatus(
  token: string
): Promise<{ isEnabled: boolean; limit?: number }> {
  try {
    const response = await getCurrentUsageLimit(token);
    return {
      isEnabled: !response.noUsageBasedAllowed,
      limit: response.hardLimit,
    };
  } catch (error: any) {
    log(`[API] Error checking usage-based status: ${error.message}`, true);
    return {
      isEnabled: false,
    };
  }
}

async function fetchMonthData(
  token: string,
  month: number,
  year: number
): Promise<{
  items: UsageItem[];
  hasUnpaidMidMonthInvoice: boolean;
  midMonthPayment: number;
}> {
  log(`[API] Fetching data for ${month}/${year}`);
  try {
    const response = await axios.post(
      'https://www.cursor.com/api/dashboard/get-monthly-invoice',
      {
        month,
        year,
        includeUsageEvents: false,
      },
      {
        headers: {
          Cookie: `WorkosCursorSessionToken=${token}`,
        },
      }
    );
    log(
      '[API] Monthly invoice response: ' +
        JSON.stringify({
          status: response.status,
          hasItems: !!response.data.items,
          items: response.data.items,
          itemCount: response.data.items?.length,
          hasUnpaidInvoice: response.data.hasUnpaidMidMonthInvoice,
        })
    );

    const usageItems: UsageItem[] = [];
    let midMonthPayment = 0;
    if (response.data.items) {
      // First pass: find the maximum request count
      let maxRequestCount = 0;
      for (const item of response.data.items) {
        if (!item.description.includes('Mid-month usage paid')) {
          const requestCount = parseInt(item.description.match(/(\d+)/)[1]);
          maxRequestCount = Math.max(maxRequestCount, requestCount);
        }
      }

      for (const item of response.data.items) {
        log(
          '[API] Processing invoice item: ' +
            JSON.stringify({
              description: item.description,
              cents: item.cents,
            })
        );

        // Check if this is a mid-month payment
        if (item.description.includes('Mid-month usage paid')) {
          // Add to the total mid-month payment amount (convert from cents to dollars)
          midMonthPayment += Math.abs(item.cents) / 100;
          log(
            `[API] Added mid-month payment of $${(Math.abs(item.cents) / 100).toFixed(2)}, total now: $${midMonthPayment.toFixed(2)}`
          );
          continue; // Skip adding this to usage items
        }

        const requestCount = parseInt(item.description.match(/(\d+)/)[1]);
        const cents = item.cents;
        const costPerRequest = cents / requestCount;
        const dollars = cents / 100;

        // Update the model extraction pattern to capture premium/Haiku info
        const modelMatch = item.description.match(
          /(?:to|\(|per such request)(?: |\()?([\w-]+)/
        );
        const model = modelMatch ? modelMatch[1] : 'Default';

        usageItems.push({
          totalDollars: `$${dollars.toFixed(2)}`,
          model: model, // Add extracted model
          requestCount: requestCount,
          costPerRequest: costPerRequest / 100, // Convert to dollars
        });
      }
    }

    return {
      items: usageItems,
      hasUnpaidMidMonthInvoice: response.data.hasUnpaidMidMonthInvoice || false,
      midMonthPayment,
    };
  } catch (error: any) {
    const axiosError = error as ExtendedAxiosError;
    log(
      `[API] Error fetching monthly data for ${month}/${year}: ${axiosError.message}`,
      true
    );
    log(
      '[API] API error details: ' +
        JSON.stringify({
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message,
        }),
      true
    );
    throw error;
  }
}

export async function fetchCursorStats(token: string): Promise<CursorStats> {
  log('[API] Fetching Cursor stats...');
  log(
    '[API] Token format check: ' +
      JSON.stringify({
        containsSeparator: token.includes('%3A%3A'),
        length: token.length,
      })
  );

  // Extract user ID from token
  const userId = token.split('%3A%3A')[0];
  log(`[API] Extracted userId for API calls: ${userId}`);

  log('[API] Fetching premium requests info...');
  try {
    const premiumResponse = await axios.get<CursorUsageResponse>(
      'https://www.cursor.com/api/usage',
      {
        params: { user: userId },
        headers: {
          Cookie: `WorkosCursorSessionToken=${token}`,
        },
      }
    );
    log(
      '[API] Premium response: ' +
        JSON.stringify({
          status: premiumResponse.status,
          hasGPT4: !!premiumResponse.data['gpt-4'],
          numRequests: premiumResponse.data['gpt-4']?.numRequests,
          maxRequests: premiumResponse.data['gpt-4']?.maxRequestUsage,
          startOfMonth: premiumResponse.data.startOfMonth,
        })
    );

    // Get current date for usage-based pricing (which renews on 3rd/4th of each month)
    const currentDate = new Date();
    const usageBasedBillingDay = 3; // Assuming it's the 3rd day of the month
    let usageBasedCurrentMonth = currentDate.getMonth() + 1;
    let usageBasedCurrentYear = currentDate.getFullYear();

    // If we're in the first few days of the month (before billing date),
    // consider the previous month as the current billing period
    if (currentDate.getDate() < usageBasedBillingDay) {
      usageBasedCurrentMonth =
        usageBasedCurrentMonth === 1 ? 12 : usageBasedCurrentMonth - 1;
      if (usageBasedCurrentMonth === 12) {
        usageBasedCurrentYear--;
      }
    }

    // Calculate previous month for usage-based pricing
    const usageBasedLastMonth =
      usageBasedCurrentMonth === 1 ? 12 : usageBasedCurrentMonth - 1;
    const usageBasedLastYear =
      usageBasedCurrentMonth === 1
        ? usageBasedCurrentYear - 1
        : usageBasedCurrentYear;

    const currentMonthData = await fetchMonthData(
      token,
      usageBasedCurrentMonth,
      usageBasedCurrentYear
    );
    const lastMonthData = await fetchMonthData(
      token,
      usageBasedLastMonth,
      usageBasedLastYear
    );

    return {
      currentMonth: {
        month: usageBasedCurrentMonth,
        year: usageBasedCurrentYear,
        usageBasedPricing: currentMonthData,
      },
      lastMonth: {
        month: usageBasedLastMonth,
        year: usageBasedLastYear,
        usageBasedPricing: lastMonthData,
      },
      premiumRequests: {
        current: premiumResponse.data['gpt-4'].numRequests,
        limit: premiumResponse.data['gpt-4'].maxRequestUsage,
        startOfMonth: premiumResponse.data.startOfMonth,
      },
    };
  } catch (error: any) {
    log('[API] Error fetching premium requests: ' + error, true);
    log(
      '[API] API error details: ' +
        JSON.stringify({
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        }),
      true
    );
    throw error;
  }
}

export async function getStripeSessionUrl(token: string): Promise<string> {
  try {
    const response = await axios.get(
      'https://www.cursor.com/api/stripeSession',
      {
        headers: {
          Cookie: `WorkosCursorSessionToken=${token}`,
        },
      }
    );
    // Remove quotes from the response string
    return response.data.replace(/"/g, '');
  } catch (error: any) {
    log('[API] Error getting Stripe session URL: ' + error.message, true);
    throw error;
  }
}

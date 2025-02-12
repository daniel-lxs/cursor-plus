import * as vscode from 'vscode';
import { log } from '../utils/logger';

// Track which thresholds have been notified in the current session
const notifiedThresholds = new Set<number>();
let isNotificationInProgress = false;

// Reset notification tracking
export function resetNotifications() {
  notifiedThresholds.clear();
  isNotificationInProgress = false;
  log('[Notifications] Reset notification tracking');
}

interface UsageInfo {
  percentage: number;
  type: 'premium' | 'usage-based';
  limit?: number;
}

export async function checkAndNotifyUsage(usageInfo: UsageInfo) {
  // Prevent concurrent notifications
  if (isNotificationInProgress) {
    log('[Notifications] Notification already in progress, skipping...');
    return;
  }

  const config = vscode.workspace.getConfiguration('cursorStats');
  const enableAlerts = config.get<boolean>('enableAlerts', true);

  if (!enableAlerts) {
    return;
  }

  try {
    isNotificationInProgress = true;
    const thresholds = config
      .get<number[]>('usageAlertThresholds', [10, 30, 50, 75, 90, 100])
      .sort((a, b) => b - a); // Sort in descending order to get highest threshold first

    const { percentage, type, limit } = usageInfo;

    // Find the highest threshold that has been exceeded
    const highestExceededThreshold = thresholds.find(
      (threshold) => percentage >= threshold
    );

    // Only notify if we haven't notified this threshold yet
    if (
      highestExceededThreshold &&
      !notifiedThresholds.has(highestExceededThreshold)
    ) {
      log(
        `[Notifications] Highest usage threshold ${highestExceededThreshold}% exceeded for ${type} usage`
      );

      let message, detail;
      if (type === 'premium') {
        message = `Premium request usage has reached ${percentage.toFixed(1)}%`;
        if (percentage > 100) {
          message = `Premium request usage has exceeded limit (${percentage.toFixed(1)}%)`;
          detail =
            'Enable usage-based pricing to continue using premium models.';
        } else {
          detail = 'Click View Settings to manage your usage limits.';
        }
      } else {
        message = `Usage-based spending has reached ${percentage.toFixed(1)}% of your $${limit} limit`;
        detail =
          'Click Manage Limit to adjust your usage-based pricing settings.';
      }

      // Show the notification
      const notification = await vscode.window.showWarningMessage(
        message,
        { modal: false, detail },
        type === 'premium' && percentage > 100
          ? 'Enable Usage-Based'
          : type === 'premium'
            ? 'View Settings'
            : 'Manage Limit',
        'Dismiss'
      );

      if (notification === 'View Settings') {
        try {
          await vscode.commands.executeCommand(
            'workbench.action.openSettings',
            '@ext:Dwtexe.cursor-stats'
          );
        } catch (error) {
          log(
            '[Notifications] Failed to open settings directly, trying alternative method...',
            true
          );
          try {
            await vscode.commands.executeCommand(
              'workbench.action.openSettings'
            );
            await vscode.commands.executeCommand(
              'workbench.action.search.toggleQueryDetails'
            );
            await vscode.commands.executeCommand(
              'workbench.action.search.action.replaceAll',
              '@ext:Dwtexe.cursor-stats'
            );
          } catch (fallbackError) {
            log(
              '[Notifications] Failed to open settings with fallback method',
              true
            );
            vscode.window.showErrorMessage(
              'Failed to open Cursor Stats settings. Please try opening VS Code settings manually.'
            );
          }
        }
      } else if (
        notification === 'Manage Limit' ||
        notification === 'Enable Usage-Based'
      ) {
        await vscode.commands.executeCommand('cursor-stats.setLimit');
      }

      // Mark all thresholds up to and including the current one as notified
      thresholds.forEach((threshold) => {
        if (threshold <= highestExceededThreshold) {
          notifiedThresholds.add(threshold);
        }
      });
    }

    // Clear notifications for thresholds that are no longer exceeded
    for (const threshold of notifiedThresholds) {
      if (percentage < threshold) {
        notifiedThresholds.delete(threshold);
        log(
          `[Notifications] Cleared notification for threshold ${threshold}% as usage dropped below it`
        );
      }
    }
  } finally {
    isNotificationInProgress = false;
  }
}

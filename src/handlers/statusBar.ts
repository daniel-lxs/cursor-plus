import * as vscode from 'vscode';
import { log } from '../utils/logger';
import { getCurrentUsageLimit } from '../services/api';
import { 
    CursorTooltipData,
    PremiumStats,
    UsageBasedStats,
    TooltipError 
} from '../interfaces/types';

let statusBarItem: vscode.StatusBarItem;

export function createStatusBarItem(): vscode.StatusBarItem {
    log('[Status Bar] Creating status bar item...');
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'cursor-plus.showStats';
    log('[Status Bar] Status bar alignment: Right, Priority: 100');
    return statusBarItem;
}

export function formatTooltipLine(text: string, maxWidth: number = 50): string {
    if (text.length <= maxWidth) {
        return text;
    }
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    for (const word of words) {
        if ((currentLine + word).length > maxWidth) {
            if (currentLine) {
                lines.push(currentLine.trim());
            }
            currentLine = word;
        } else {
            currentLine += (currentLine ? ' ' : '') + word;
        }
    }
    if (currentLine) {
        lines.push(currentLine.trim());
    }
    return lines.join('\n   ');
}

export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
}

export async function gatherTooltipData(stats: any, token: string | null): Promise<CursorTooltipData> {
    try {
        if (!token) {
            return {
                error: {
                    message: 'No Cursor token found',
                    details: 'Please log in to view statistics'
                },
                lastUpdated: new Date().toLocaleString()
            };
        }

        const data: CursorTooltipData = {
            lastUpdated: new Date().toLocaleString()
        };

        // Get premium stats if available
        if (stats?.premiumRequests) {
            const premiumPercent = Math.round((stats.premiumRequests.current / stats.premiumRequests.limit) * 100);
            data.premiumStats = {
                current: stats.premiumRequests.current,
                limit: stats.premiumRequests.limit,
                startOfMonth: new Date(stats.premiumRequests.startOfMonth).toLocaleDateString(),
                percentage: premiumPercent
            };
        }

        // Get usage based stats if available
        try {
            const limitResponse = await getCurrentUsageLimit(token);
            const totalCost = stats?.lastMonth?.usageBasedPricing?.items?.reduce(
                (sum: number, item: any) => sum + parseFloat(item.totalDollars.replace('$', '')), 
                0
            ) || 0;

            data.usageBasedStats = {
                isEnabled: !limitResponse.noUsageBasedAllowed,
                limit: limitResponse.hardLimit,
                currentCost: totalCost,
                items: stats?.lastMonth?.usageBasedPricing?.items || [],
                billingPeriod: new Date().toLocaleDateString(),
                midMonthPayment: 0 // Add this if you have mid-month payment data
            };
        } catch (error: any) {
            log('[API] Error fetching usage limit: ' + error.message, true);
        }

        return data;
    } catch (error: any) {
        return {
            error: {
                message: 'Error gathering tooltip data',
                details: error.message
            },
            lastUpdated: new Date().toLocaleString()
        };
    }
}

const ICONS = {
    GRAPH: '$(graph)',
    ZAP: '$(zap)',
    CALENDAR: '$(calendar)',
    PULSE: '$(pulse)',
    CHART: '$(chart-line)',
    CREDIT_CARD: '$(credit-card)',
    CHECK: '$(check)',
    X: '$(x)',
    INFO: '$(info)',
    ROCKET: '$(rocket)',
    LIGHT_BULB: '$(light-bulb)',
    ARROW: '$(arrow-right)',
    LOCK: '$(lock)',
    CIRCLE_SLASH: '$(circle-slash)',
    PERSON: '$(person)',
    GEAR: '$(gear)',
    SYNC: '$(sync)',
    CLOCK: '$(clock)',
    ERROR: '$(error)',
    LIST: '$(list-ordered)'
} as const;

function createHeader(title: string): string {
    return `## ${title}\n`;
}

function createErrorSection(error: { message: string; details?: string }): string {
    return `### Error
**Message:** ${error.message}${error.details ? `\n**Details:** ${error.details}` : ''}\n`;
}

function createPremiumSection(stats: NonNullable<CursorTooltipData['premiumStats']>): string {
    return `### Fast Requests
**Billing Period:** ${stats.startOfMonth}  
**Usage:** ${stats.current} out of ${stats.limit}  
**Progress:** ${stats.percentage}% utilized\n`;
}

function createUsageSection(stats: NonNullable<CursorTooltipData['usageBasedStats']>): string {
    const sections: string[] = [];
    
    sections.push(`### Usage-Based Stats`);
    
    if (!stats.isEnabled) {
        sections.push(`**Status:** Currently disabled\n`);
        return sections.join('\n');
    }
    
    if (stats.limit) {
        const usagePercentage = ((stats.currentCost / stats.limit) * 100).toFixed(1);
        sections.push(
            `**Billing Period:** ${stats.billingPeriod}  \n` +
            `**Monthly Limit:** $${stats.limit.toFixed(2)} (${usagePercentage}% used)\n`
        );
    }
    
    if (stats.items.length > 0) {
        sections.push(`#### Usage Breakdown`);
        
        if (stats.midMonthPayment) {
            const unpaidAmount = stats.currentCost - stats.midMonthPayment;
            sections.push(
                `**Total:** $${stats.currentCost.toFixed(2)}  \n` +
                `**Unpaid:** $${unpaidAmount.toFixed(2)}\n`
            );
        } else {
            sections.push(`**Total Cost:** $${stats.currentCost.toFixed(2)}\n`);
        }

        const usageItems = stats.items.map(item => {
            return `- ${item.model}:  
   ${item.calculation} = ${item.totalDollars}`;
        }).join('\n');
        
        sections.push(usageItems + '\n');
    } else {
        sections.push(`**Status:** No usage recorded for this period\n`);
    }

    return sections.join('\n');
}

function createFooter(lastUpdated: string): string {
    return `---

#### Account Management
- ${ICONS.PERSON} [Account Settings](https://www.cursor.com/settings)
- ${ICONS.GEAR} [Extension Settings](command:workbench.action.openSettings?%22@ext%3Adaniel-lxs.cursor-plus%22)
- ${ICONS.LOCK} [Set Usage Limit](command:cursor-plus.setLimit)
- ${ICONS.SYNC} [Refresh Statistics](command:cursor-plus.refreshStats)

**Last Updated:** ${formatRelativeTime(lastUpdated)}\n`;
}

export async function createMarkdownTooltip(tooltipData: CursorTooltipData): Promise<vscode.MarkdownString> {
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;
    tooltip.supportHtml = true;
    tooltip.supportThemeIcons = true;

    const sections: string[] = [];

    // Header
    sections.push(createHeader('Cursor Usage Statistics'));

    // Error State or Stats
    if (tooltipData.error) {
        sections.push(createErrorSection(tooltipData.error));
    } else {
        if (tooltipData.premiumStats) {
            sections.push(createPremiumSection(tooltipData.premiumStats));
        }

        if (tooltipData.usageBasedStats) {
            sections.push(createUsageSection(tooltipData.usageBasedStats));
        }
    }

    // Footer
    sections.push(createFooter(tooltipData.lastUpdated));

    // Join all sections with proper spacing
    tooltip.appendMarkdown(sections.join('\n'));

    return tooltip;
}

export function getStatusBarColor(percentage: number): vscode.ThemeColor {
    // Check if status bar colors are enabled in settings
    const config = vscode.workspace.getConfiguration('cursorStats');
    const colorsEnabled = config.get<boolean>('enableStatusBarColors', true);
    
    if (!colorsEnabled) {
        return new vscode.ThemeColor('statusBarItem.foreground');
    }

    if (percentage >= 95) {
        return new vscode.ThemeColor('charts.red');
    } else if (percentage >= 90) {
        return new vscode.ThemeColor('errorForeground');
    } else if (percentage >= 85) {
        return new vscode.ThemeColor('testing.iconFailed');
    } else if (percentage >= 80) {
        return new vscode.ThemeColor('notebookStatusErrorIcon.foreground');
    } else if (percentage >= 75) {
        return new vscode.ThemeColor('charts.yellow');
    } else if (percentage >= 70) {
        return new vscode.ThemeColor('notificationsWarningIcon.foreground');
    } else if (percentage >= 65) {
        return new vscode.ThemeColor('charts.orange');
    } else if (percentage >= 60) {
        return new vscode.ThemeColor('charts.blue');
    } else if (percentage >= 50) {
        return new vscode.ThemeColor('charts.green');
    } else if (percentage >= 40) {
        return new vscode.ThemeColor('testing.iconPassed');
    } else if (percentage >= 30) {
        return new vscode.ThemeColor('terminal.ansiGreen');
    } else if (percentage >= 20) {
        return new vscode.ThemeColor('symbolIcon.classForeground');
    } else if (percentage >= 10) {
        return new vscode.ThemeColor('debugIcon.startForeground');
    } else {
        return new vscode.ThemeColor('foreground');
    }
}

export function getUsageEmoji(percentage: number): string {
    if (percentage >= 90) {
        return '🔴';
    }
    if (percentage >= 75) {
        return '🟡';
    }
    if (percentage >= 50) {
        return '🟢';
    }
    return '✅';
}

export function getMonthName(month: number): string {
    const months = [
        'January', 'February', 'March', 'April',
        'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
}

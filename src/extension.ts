// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { createMarkdownTooltip, createStatusBarItem, getStatusBarColor, gatherTooltipData } from './handlers/statusBar';
import { initializeLogging, log } from './utils/logger';
import { getCursorTokenFromDB } from './services/database';
import { checkUsageBasedStatus, getCurrentUsageLimit, setUsageLimit, fetchCursorStats, getStripeSessionUrl } from './services/api';
import { checkAndNotifyUsage, resetNotifications } from './handlers/notifications';

let statusBarItem: vscode.StatusBarItem;
let refreshInterval: NodeJS.Timeout;
let outputChannel: vscode.OutputChannel | undefined;
let isWindowFocused: boolean = true; // Add focus state tracking
let statsViewProvider: StatsViewProvider;
let updateStats: () => Promise<void>; // Declare updateStats as a variable

function getRefreshIntervalMs(): number {
    const config = vscode.workspace.getConfiguration('cursorStats');
    const intervalSeconds = Math.max(config.get('refreshInterval', 30), 5); // Minimum 5 seconds
    return intervalSeconds * 1000;
}

function startRefreshInterval() {
    // Clear any existing interval
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    
    // Only start interval if window is focused
    if (isWindowFocused) {
        // Start new interval
        const intervalMs = getRefreshIntervalMs();
        log(`[Refresh] Starting refresh interval: ${intervalMs}ms`);
        refreshInterval = setInterval(updateStats, intervalMs);
    } else {
        log('[Refresh] Window not focused, refresh interval not started');
    }
}

function getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
    const bundlePath = vscode.Uri.joinPath(context.extensionUri, 'out', 'webview', 'bundle.js');
    const cssPath = vscode.Uri.joinPath(context.extensionUri, 'out', 'webview', 'bundle.css');
    
    const bundleUri = webview.asWebviewUri(bundlePath);
    const cssUri = webview.asWebviewUri(cssPath);

    log(`[Webview] Bundle URI: ${bundleUri.toString()}`);
    log(`[Webview] CSS URI: ${cssUri.toString()}`);

    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
            <title>Cursor Statistics</title>
            <link href="${cssUri}" rel="stylesheet">
        </head>
        <body>
            <div id="app"></div>
            <script src="${bundleUri}"></script>
        </body>
        </html>`;
}

class StatsViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;

    constructor(private readonly context: vscode.ExtensionContext) {}

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        token: vscode.CancellationToken
    ): void | Thenable<void> {
        // Return early if the token is cancelled
        if (token.isCancellationRequested) {
            return;
        }

        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview')
            ]
        };

        // Set the webview's initial html content
        webviewView.webview.html = getWebviewContent(webviewView.webview, this.context);

        // Handle visibility changes
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible && !token.isCancellationRequested) {
                updateStats();
            }
        });

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(message => {
            if (message.command === 'refresh' && !token.isCancellationRequested) {
                updateStats();
            }
        });

        webviewView = webviewView;
        
        // Initial update if not cancelled
        if (!token.isCancellationRequested) {
            updateStats();
        }
    }

    public postMessage(message: any) {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }
}

// This method is called when your extension is activated
export async function activate(context: vscode.ExtensionContext) {
    try {
        // Initialize logging first
        initializeLogging(context);
        
        log('[Initialization] Extension activation started');

        // Reset notifications on activation
        resetNotifications();

        // Create status bar item with enhanced logging
        statusBarItem = createStatusBarItem();

        // Register webview view provider
        statsViewProvider = new StatsViewProvider(context);
        const viewRegistration = vscode.window.registerWebviewViewProvider(
            'cursor-stats.statsView',
            statsViewProvider
        );

        // Register command to show stats panel (now focuses the view)
        const showStatsCommand = vscode.commands.registerCommand('cursor-stats.showStats', () => {
            vscode.commands.executeCommand('cursor-stats.statsView.focus');
        });

        // Register command to refresh stats
        const refreshStatsCommand = vscode.commands.registerCommand('cursor-stats.refreshStats', async () => {
            await updateStats();
        });

        // Register command to set usage limit
        const setLimitCommand = vscode.commands.registerCommand('cursor-stats.setLimit', async () => {
            try {
                const token = await getCursorTokenFromDB();
                if (!token) {
                    vscode.window.showErrorMessage('No Cursor token found. Please log in first.');
                    return;
                }

                const input = await vscode.window.showInputBox({
                    title: 'Set Monthly Usage Limit',
                    prompt: 'Enter your monthly usage limit in dollars (e.g. 50)',
                    placeHolder: '50',
                    validateInput: (value) => {
                        const num = parseFloat(value);
                        if (isNaN(num) || num <= 0) {
                            return 'Please enter a valid positive number';
                        }
                        return null;
                    }
                });

                if (input) {
                    const limit = parseFloat(input);
                    await setUsageLimit(token, limit, true);
                    await updateStats();
                    vscode.window.showInformationMessage(`Usage limit set to $${limit}`);
                }
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to set usage limit: ${error.message}`);
            }
        });

        // Add window focus event listeners
        const focusListener = vscode.window.onDidChangeWindowState(e => {
            isWindowFocused = e.focused;
            log(`[Window] Window focus changed: ${isWindowFocused ? 'focused' : 'unfocused'}`);
            
            if (isWindowFocused) {
                // Immediately update stats when window regains focus
                updateStats();
                // Restart the refresh interval
                startRefreshInterval();
            } else {
                // Clear interval when window loses focus
                if (refreshInterval) {
                    clearInterval(refreshInterval);
                    log('[Refresh] Cleared refresh interval due to window losing focus');
                }
            }
        });

        // Modify updateStats to update both status bar and webview
        updateStats = async function() {
            try {
                const token = await getCursorTokenFromDB();
                if (!token) {
                    return;
                }

                const stats = await fetchCursorStats(token);
                const usageStatus = await checkUsageBasedStatus(token);

                // Update webview if provider exists
                statsViewProvider.postMessage({
                    type: 'updateStats',
                    premiumStats: {
                        current: stats.premiumRequests.current,
                        limit: stats.premiumRequests.limit,
                        startOfMonth: stats.premiumRequests.startOfMonth
                    },
                    usageBasedStats: {
                        isEnabled: usageStatus.isEnabled,
                        limit: usageStatus.limit || 0,
                        currentCost: stats.lastMonth.usageBasedPricing.items.reduce(
                            (sum, item) => sum + parseFloat(item.totalDollars.replace('$', '')), 
                            0
                        ),
                        items: stats.lastMonth.usageBasedPricing.items
                    }
                });

                // Update status bar
                const premiumPercent = Math.round((stats.premiumRequests.current / stats.premiumRequests.limit) * 100);
                let usageBasedPercent = 0;
                let totalUsageText = '';
                let totalRequests = stats.premiumRequests.current;

                if (stats.lastMonth.usageBasedPricing.items.length > 0) {
                    const items = stats.lastMonth.usageBasedPricing.items;
                    const totalCost = items.reduce((sum, item) => sum + parseFloat(item.totalDollars.replace('$', '')), 0);
                    
                    if (usageStatus.isEnabled && usageStatus.limit) {
                        usageBasedPercent = (totalCost / usageStatus.limit) * 100;
                    }
                    
                    const costText = ` $(credit-card) $${totalCost.toFixed(2)}`;
                    const config = vscode.workspace.getConfiguration('cursorStats');
                    const showTotalRequests = config.get<boolean>('showTotalRequests', false);
                    
                    if (showTotalRequests) {
                        totalUsageText = ` ${totalRequests}/${stats.premiumRequests.limit}${costText}`;
                    } else {
                        totalUsageText = ` ${stats.premiumRequests.current}/${stats.premiumRequests.limit}${costText}`;
                    }
                } else {
                    totalUsageText = ` ${stats.premiumRequests.current}/${stats.premiumRequests.limit}`;
                }

                // Set status bar color based on usage type
                const usagePercent = usageStatus.isEnabled ? usageBasedPercent : premiumPercent;
                statusBarItem.color = getStatusBarColor(usagePercent);
                statusBarItem.text = `$(graph)${totalUsageText}`;

                // Create tooltip content
                const tooltipData = await gatherTooltipData(stats, token);
                statusBarItem.tooltip = await createMarkdownTooltip(tooltipData);
                statusBarItem.show();

                // Show notifications
                if (usageStatus.isEnabled) {
                    setTimeout(() => {
                        checkAndNotifyUsage({
                            percentage: usageBasedPercent,
                            type: 'usage-based',
                            limit: usageStatus.limit
                        });

                        if (stats.lastMonth.usageBasedPricing.hasUnpaidMidMonthInvoice) {
                            vscode.window.showWarningMessage('⚠️ You have an unpaid mid-month invoice. Please pay it to continue using usage-based pricing.', 'Open Billing Page')
                                .then(async selection => {
                                    if (selection === 'Open Billing Page') {
                                        try {
                                            const stripeUrl = await getStripeSessionUrl(token);
                                            vscode.env.openExternal(vscode.Uri.parse(stripeUrl));
                                        } catch (error) {
                                            vscode.env.openExternal(vscode.Uri.parse('https://www.cursor.com/settings'));
                                        }
                                    }
                                });
                        }
                    }, 1000);
                } else {
                    setTimeout(() => {
                        checkAndNotifyUsage({
                            percentage: premiumPercent,
                            type: 'premium'
                        });
                    }, 1000);
                }
            } catch (error: any) {
                log(`[Critical] Error in updateStats: ${error}`, true);
                statusBarItem.text = "$(error) Cursor Stats: Error";
                statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorBackground');
                statusBarItem.tooltip = await createMarkdownTooltip({
                    error: {
                        message: '⚠️ Error fetching Cursor stats',
                        details: error.message || 'Unknown error occurred'
                    },
                    lastUpdated: new Date().toLocaleString()
                });
                statusBarItem.show();
            }
        };

        // Add to subscriptions
        context.subscriptions.push(
            statusBarItem,
            showStatsCommand,
            refreshStatsCommand,
            setLimitCommand,
            viewRegistration,
            focusListener
        );

        // Show status bar item explicitly
        statusBarItem.show();

        // Start refresh interval
        startRefreshInterval();

        setTimeout(async () => {
            await updateStats();
        }, 1500);

        log('[Initialization] Extension activation completed successfully');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        log(`[Critical] Failed to activate extension: ${errorMessage}`, true);
        if (error instanceof Error && error.stack) {
            log(`[Critical] Stack trace: ${error.stack}`, true);
        }
        throw error;
    }
}

export function deactivate() {
    log('[Deactivation] Extension deactivation started');
    try {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            log('[Deactivation] Refresh interval cleared');
        }
        
        if (outputChannel) {
            outputChannel.dispose();
            log('[Deactivation] Output channel disposed');
        }
        
        log('[Deactivation] Extension deactivation completed successfully');
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        log(`[Critical] Failed to deactivate extension cleanly: ${errorMessage}`, true);
        if (error instanceof Error && error.stack) {
            log(`[Critical] Stack trace: ${error.stack}`, true);
        }
        throw error;
    }
}

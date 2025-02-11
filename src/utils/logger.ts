import * as vscode from "vscode";

let outputChannel: vscode.OutputChannel | undefined;

export function initializeLogging(context: vscode.ExtensionContext): void {
  try {
    outputChannel = vscode.window.createOutputChannel("Cursor Stats");
    context.subscriptions.push(outputChannel);
    log("[Initialization] Output channel created successfully");
  } catch {
    log("[Critical] Failed to create output channel", true);
    throw new Error("Failed to initialize logging system");
  }
}

export function log(message: string, error: boolean = false): void {
  const config = vscode.workspace.getConfiguration("cursorStats");
  const loggingEnabled = config.get<boolean>("enableLogging", false);

  const shouldLog =
    error ||
    (loggingEnabled &&
      (message.includes("[Initialization]") ||
        message.includes("[Status Bar]") ||
        message.includes("[Database]") ||
        message.includes("[Auth]") ||
        message.includes("[Stats]") ||
        message.includes("[API]") ||
        message.includes("[GitHub]") ||
        message.includes("[Panels]") ||
        message.includes("[Command]") ||
        message.includes("[Notifications]") ||
        message.includes("[Refresh]") ||
        message.includes("[Settings]") ||
        message.includes("[Critical]") ||
        message.includes("[Deactivation]")));

  if (shouldLog) {
    safeLog(message, error);
  }
}

function safeLog(message: string, isError: boolean = false): void {
  const timestamp = new Date().toISOString();
  const logLevel = isError ? "ERROR" : "INFO";
  const logMessage = `[${timestamp}] [${logLevel}] ${message}`;

  // Always log to console
  if (isError) {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }

  // Try to log to output channel if it exists
  try {
    outputChannel?.appendLine(logMessage);
  } catch {
    console.error("Failed to write to output channel");
  }

  // Show error messages in the UI for critical issues
  if (isError && message.includes("[Critical]")) {
    try {
      vscode.window.showErrorMessage(`Cursor Stats: ${message}`);
    } catch {
      console.error("Failed to show error message in UI");
    }
  }
}

export function disposeLogger(): void {
  if (outputChannel) {
    outputChannel.dispose();
    outputChannel = undefined;
  }
}

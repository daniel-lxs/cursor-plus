// Type for messages sent from webview to extension
export type WebviewToExtensionMessage = {
  command: string;
  [key: string]: any;
};

// Type for messages sent from extension to webview
export type ExtensionToWebviewMessage = {
  type: string;
  [key: string]: any;
};

// Initialize VS Code API once and export it
export const vscode = typeof acquireVsCodeApi !== 'undefined'
  ? acquireVsCodeApi<WebviewToExtensionMessage>()
  : undefined; 
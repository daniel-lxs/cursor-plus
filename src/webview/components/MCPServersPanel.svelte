<script lang="ts">
  import type { MCPServersPanelProps } from '../types';
  import { vscode } from '../lib/vscode';

  const { servers }: MCPServersPanelProps = $props();
</script>

<main class="mcp-servers-panel">
  <header>
    <h1>MCP Servers</h1>
  </header>

  <div class="content">
    {#if servers.length === 0}
      <div class="empty-state">
        <p>No MCP servers found.</p>
      </div>
    {:else}
      <div class="servers-list">
        {#each servers as server}
          <div class="server-card">
            <div class="server-header">
              <h3>{server.name}</h3>
              <span class="server-type">{server.type}</span>
            </div>
            <div class="server-details">
              <div class="detail-row">
                <span class="label">Identifier:</span>
                <span class="value">{server.identifier}</span>
              </div>
              <div class="detail-row">
                <span class="label">Command:</span>
                <span class="value">{server.command}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</main>

<style>
  .mcp-servers-panel {
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    font-size: 12px;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }

  header {
    display: flex;
    align-items: center;
    padding: 1rem;
    padding-bottom: 0;
    position: sticky;
    top: 0;
    background: var(--vscode-editor-background);
    z-index: 1;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    padding-top: 0.5rem;
  }

  h1 {
    font-size: 1rem;
    margin: 0;
    color: var(--vscode-editor-foreground);
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--vscode-descriptionForeground);
  }

  .servers-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .server-card {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 1rem;
  }

  .server-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  h3 {
    font-size: 0.9rem;
    margin: 0;
    color: var(--vscode-editor-foreground);
  }

  .server-type {
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    border-radius: 3px;
  }

  .server-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-row {
    display: flex;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .label {
    color: var(--vscode-descriptionForeground);
    min-width: 70px;
  }

  .value {
    color: var(--vscode-editor-foreground);
    word-break: break-all;
  }
</style> 
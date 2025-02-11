<script lang="ts">
  import type { PremiumStats, UsageBasedStats } from '../../interfaces/types';
  import { Settings, User, Lock, RefreshCw, Clock } from 'lucide-svelte';
  import ProgressBar from './ProgressBar.svelte';
  import { getNextResetDate } from '../../utils/dateUtils';

  type Props = {
    premiumStats: PremiumStats;
    usageBasedStats: UsageBasedStats;
  };

  const props: Props = $props();
  const stats = $state({
    premium: props.premiumStats,
    usage: props.usageBasedStats,
  });

  let isLoading = $state(true); // Add loading state
  let isUsageBasedEnabled = $state(props.usageBasedStats.isEnabled ?? false); // Initialize with the value from props
  let lastUpdated = $state('');
  let isToggling = $state(false);
  let percentage = $state(0);

  // VSCode API access with proper typing and environment check
  const vscode =
    typeof acquireVsCodeApi !== 'undefined'
      ? acquireVsCodeApi<WebviewToExtensionMessage>()
      : undefined;

  // Define types for messages SENT TO the webview
  type ExtensionToWebviewMessage = {
    type: 'updateStats';
    premiumStats: PremiumStats;
    usageBasedStats: UsageBasedStats;
  };

  // Define a general type for messages RECEIVED FROM the webview
  type WebviewToExtensionMessage = {
    command: string; // Keep it generic
    [key: string]: any; // Allow any other properties
  };

  $effect(() => {
    if (!vscode) return;
    console.log('StatsPanel mounted');

    percentage = Number(
      (stats.usage?.limit
        ? ((stats.usage?.currentCost || 0) / stats.usage.limit) * 100
        : 0
      ).toFixed(1)
    );

    // Listen for messages from the extension
    window.addEventListener('message', (event) => {
      const message: ExtensionToWebviewMessage = event.data; // Cast to the correct type
      console.log('Received message:', message);

      switch (message.type) {
        case 'updateStats':
          stats.premium = message.premiumStats;
          stats.usage = message.usageBasedStats;
          isUsageBasedEnabled = message.usageBasedStats.isEnabled; // Update isUsageBasedEnabled
          isLoading = false; // Set loading to false when data is received
          lastUpdated = new Date().toLocaleTimeString();
          updateChartData();
          isToggling = false;
          break;
      }
    });
  });

  function updateChartData() {
    console.log('Updating chart data with:', stats);
  }

  function handleRefresh() {
    console.log('Refresh clicked');
    vscode.postMessage({
      command: 'refresh',
    });
  }

  function handleToggleUsageBased() {
    isToggling = true;
    vscode.postMessage({ command: 'toggleUsageBasedPricing' });
  }

  function handleSetLimit() {
    vscode.postMessage({ command: 'setLimit' });
  }
</script>

<main class="stats-panel">
  <div class="content">
    <header>
      <h1>Cursor Usage</h1>
      <button onclick={handleRefresh}>
        <RefreshCw size={16} />
      </button>
    </header>

    {#if isLoading}
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <span>Loading stats...</span>
      </div>
    {:else}
      <section>
        <div class="stat-card">
          <div class="stat-header">
            <h2>Premium Fast Requests</h2>
            <span class="usage-badge"
              >{(stats.premium?.limit
                ? ((stats.premium?.current || 0) / stats.premium.limit) * 100
                : 0
              ).toFixed(1)}%</span
            >
          </div>
          <ProgressBar
            percentage={stats.premium?.limit
              ? ((stats.premium?.current || 0) / stats.premium.limit) * 100
              : 0}
          />
          <div class="stat-row compact">
            <span
              >{stats.premium?.current || 0} / {stats.premium?.limit || 0}</span
            >
            <span class="period">
              Reset: {stats.premium?.startOfMonth
                ? getNextResetDate(stats.premium.startOfMonth)
                : '-'}
            </span>
          </div>
        </div>
      </section>

      <section>
        <div class="stat-card">
          <div class="stat-header">
            <h2>Usage-Based Pricing</h2>
            <label class="switch">
              <input
                type="checkbox"
                checked={isUsageBasedEnabled}
                onchange={handleToggleUsageBased}
                disabled={isToggling}
              />
              <span class="slider round"></span>
            </label>
          </div>
          {#if isUsageBasedEnabled}
            <div class="stat-row compact">
              <span>Billing Date</span>
              <span
                >{stats.usage?.billingPeriod
                  ? getNextResetDate(stats.usage.billingPeriod)
                  : '-'}</span
              >
            </div>
            <div class="stat-row compact">
              <span>Monthly Limit</span>
              <span>${stats.usage?.limit || 0}</span>
            </div>
            <div class="stat-row compact">
              <span>Current Cost</span>
              <span>${stats.usage?.currentCost.toFixed(2) || 0}</span>
            </div>

            {#if stats.usage?.midMonthPayment > 0}
              <div class="stat-row compact">
                <span>Mid-Month Payment</span>
                <span>${stats.usage.midMonthPayment.toFixed(2)}</span>
              </div>
              <div class="stat-row compact">
                <span>Remaining Cost</span>
                <span
                  >${(
                    stats.usage.currentCost - stats.usage.midMonthPayment
                  ).toFixed(2)}</span
                >
              </div>
            {/if}
            
            <div class="stat-row compact">
              <ProgressBar
                {percentage}
              />
            </div>
          {/if}
        </div>
      </section>

      {#if stats.usage?.items?.length > 0}
        <section>
          <div class="stat-card">
            <h2>Usage Details</h2>
            <div class="usage-list">
              {#each stats.usage.items as item}
                <div class="usage-item compact">
                  <div class="usage-item-header">
                    <span class="model">{item.model}</span>
                    <span class="cost">{item.totalDollars}</span>
                  </div>
                  <div class="usage-details">
                    <span class="requests">{item.requestCount} requests</span>
                    <span class="cost-per-request"
                      >${item.costPerRequest.toFixed(2)}/req</span
                    >
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </section>
      {/if}
    {/if}
  </div>

  <footer class="management-footer">
    <div class="footer-links">
      <a
        href="https://www.cursor.com/settings"
        target="_blank"
        class="footer-link"
      >
        <User size={16} /> Account Settings
      </a>
      <button
        class="footer-link"
        onclick={() => vscode.postMessage({ command: 'openSettings' })}
      >
        <Settings size={16} /> Extension Settings
      </button>
      <button class="footer-link" onclick={handleSetLimit}>
        <Lock size={16} /> Set Usage Limit
      </button>
      <button class="footer-link" onclick={handleRefresh}>
        <RefreshCw size={16} /> Refresh Statistics
      </button>
    </div>
    <div class="last-updated">
      <Clock size={16} /> &nbsp; Last updated: {lastUpdated}
    </div>
  </footer>
</main>

<style>
  .stats-panel {
    color: var(--vscode-foreground);
    font-family: var(--vscode-font-family);
    font-size: 12px;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .content {
    flex: 1;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  h1 {
    font-size: 1rem;
    margin: 0;
    color: var(--vscode-editor-foreground);
  }

  h2 {
    font-size: 0.9rem;
    margin: 0;
    color: var(--vscode-editor-foreground);
  }

  button {
    background: transparent;
    color: var(--vscode-button-foreground);
    border: none;
    padding: 0.25rem;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    opacity: 0.8;
  }

  button:hover {
    opacity: 1;
    background: var(--vscode-button-hoverBackground);
  }

  .stat-card {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 4px;
    padding: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .stat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
    font-size: 0.9rem;
  }

  .stat-row.compact {
    font-size: 0.8rem;
    opacity: 0.9;
  }

  .usage-badge {
    font-size: 0.7rem;
    opacity: 0.8;
  }

  .usage-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .usage-item {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 3px;
    padding: 0.35rem;
  }

  .usage-item.compact {
    font-size: 0.8rem;
  }

  .usage-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.15rem;
  }

  .model {
    font-weight: bold;
    color: var(--vscode-symbolIcon-classForeground);
  }

  .cost {
    color: var(--vscode-charts-green);
    font-weight: bold;
  }

  .period {
    font-size: 0.75rem;
    opacity: 0.8;
  }

  section {
    margin-bottom: 0.75rem;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    gap: 1rem;
    color: var(--vscode-foreground);
    opacity: 0.8;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--vscode-foreground);
    border-radius: 50%;
    border-top-color: transparent;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .usage-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
  }

  .requests {
    color: var(--vscode-descriptionForeground);
    font-size: 0.75rem;
  }

  .cost-per-request {
    color: var(--vscode-charts-foreground);
    font-size: 0.75rem;
    opacity: 0.8;
  }

  /* Add footer styles */
  .management-footer {
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid var(--vscode-panel-border);
  }

  .footer-links {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .footer-link {
    background: none;
    border: none;
    padding: 0.25rem;
    cursor: pointer;
    text-align: left;
    color: var(--vscode-textLink-foreground);
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.8rem;
  }

  .footer-link:hover {
    text-decoration: underline;
  }

  .last-updated {
    margin-top: 0.75rem;
    font-size: 0.7rem;
    opacity: 0.7;
    color: var(--vscode-descriptionForeground);
  }

  /* Toggle Switch Styles */
  .switch {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 18px;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 17px;
  }

  .slider:before {
    position: absolute;
    content: '';
    height: 14px;
    width: 14px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: var(--vscode-charts-green);
  }

  input:focus + .slider {
    box-shadow: 0 0 1px var(--vscode-charts-green);
  }

  input:checked + .slider:before {
    transform: translateX(18px);
  }

  /* Rounded sliders */
  .slider.round {
    border-radius: 17px;
  }

  .slider.round:before {
    border-radius: 50%;
  }
</style>

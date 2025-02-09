<script lang="ts">
    import { onMount } from 'svelte';
    import type { PremiumStats, UsageBasedStats } from '../types';

    type Props = {
        premiumStats: PremiumStats;
        usageBasedStats: UsageBasedStats;
    };

    const props: Props = $props();
    const stats = $state({
        premium: props.premiumStats,
        usage: props.usageBasedStats
    });

    let isLoading = $state(true);  // Add loading state

    // VSCode API access with proper typing and environment check
    const vscode = typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi<VSCodeMessage>() : undefined;

    // Types for messages
    type VSCodeMessage = {
        command: 'refresh';
    } | {
        type: 'updateStats';
        premiumStats: PremiumStats;
        usageBasedStats: UsageBasedStats;
    };

    onMount(() => {
        if (!vscode) return;
        console.log('StatsPanel mounted');

        // Listen for messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('Received message:', message);
            
            switch (message.type) {
                case 'updateStats':
                    stats.premium = message.premiumStats;
                    stats.usage = message.usageBasedStats;
                    isLoading = false;  // Set loading to false when data is received
                    updateChartData();
                    break;
            }
        });
    });

    function updateChartData() {
        console.log('Updating chart data with:', stats);
    }

    function handleRefresh() {
        console.log('Refresh clicked');
        vscode?.postMessage({
            command: 'refresh'
        });
    }
</script>

<main class="stats-panel">
    <header>
        <h1>Cursor Usage</h1>
        <button onclick={handleRefresh}>
            <span class="icon">🔄</span>
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
                    <span class="usage-badge">{((stats.premium?.current || 0) / (stats.premium?.limit || 1) * 100).toFixed(1)}%</span>
                </div>
                <div class="progress-bar">
                    <div 
                        class="progress" 
                        style="width: {((stats.premium?.current || 0) / (stats.premium?.limit || 1)) * 100}%"
                    ></div>
                </div>
                <div class="stat-row compact">
                    <span>{stats.premium?.current || 0} / {stats.premium?.limit || 0}</span>
                    <span class="period">{new Date(stats.premium?.startOfMonth || '').toLocaleDateString()}</span>
                </div>
            </div>
        </section>

        <section>
            <div class="stat-card">
                <div class="stat-header">
                    <h2>Usage-Based Pricing</h2>
                    <span class="status-badge {stats.usage?.isEnabled ? 'enabled' : 'disabled'}">
                        {stats.usage?.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
                {#if stats.usage?.isEnabled}
                    <div class="stat-row compact">
                        <span>Monthly Limit</span>
                        <span>${stats.usage?.limit || 0}</span>
                    </div>
                    <div class="stat-row compact">
                        <span>Current Cost</span>
                        <span>${stats.usage?.currentCost.toFixed(2) || 0}</span>
                    </div>
                    <div class="progress-bar">
                        <div 
                            class="progress" 
                            style="width: {((stats.usage?.currentCost || 0) / (stats.usage?.limit || 1)) * 100}%"
                        ></div>
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
                                    <span class="cost-per-request">${item.costPerRequest.toFixed(2)}/req</span>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </section>
        {/if}
    {/if}
</main>

<style>
    .stats-panel {
        padding: 0.5rem;
        color: var(--vscode-foreground);
        font-family: var(--vscode-font-family);
        font-size: 12px;
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

    .progress-bar {
        width: 100%;
        height: 4px;
        background: var(--vscode-progressBar-background);
        border-radius: 2px;
        margin: 0.25rem 0;
        overflow: hidden;
    }

    .progress {
        height: 100%;
        background: var(--vscode-progressBar-foreground);
        transition: width 0.3s ease;
    }

    .status-badge {
        padding: 0.15rem 0.35rem;
        border-radius: 3px;
        font-size: 0.7rem;
    }

    .usage-badge {
        font-size: 0.7rem;
        opacity: 0.8;
    }

    .status-badge.enabled {
        background: var(--vscode-testing-iconPassed);
        color: var(--vscode-editor-background);
    }

    .status-badge.disabled {
        background: var(--vscode-testing-iconFailed);
        color: var(--vscode-editor-background);
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
</style> 
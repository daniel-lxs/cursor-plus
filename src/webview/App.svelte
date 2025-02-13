<script lang="ts">
  import StatsPanel from './components/StatsPanel.svelte';
  import MCPServersPanel from './components/MCPServersPanel.svelte';
  import type { AppProps } from './types';

  const { premiumStats, usageBasedStats, servers: initialServers }: AppProps = $props();
  let currentView = $state('stats');
  let servers = $state(initialServers);

  $effect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data;
      console.log('App received message:', message);
      
      if (message.type === 'switchView') {
        currentView = message.view;
        console.log('Switched to view:', currentView);
      } else if (message.type === 'updateMCPServers') {
        servers = message.servers;
        console.log('Updated MCP servers:', servers);
      }
    });
  });

  $effect(() => {
    if (premiumStats.limit > 0) {
      premiumStats.percentage = Math.round(
        (premiumStats.current / premiumStats.limit) * 100
      );
    }
  });

</script>

<main>
  {#if currentView === 'stats'}
    <StatsPanel
      stats={{
        premium: premiumStats,
        usage: usageBasedStats,
      }}
    />
  {:else if currentView === 'mcpServers'}
    <MCPServersPanel servers={servers} />
  {/if}
</main>

<style>
  main {
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
</style>

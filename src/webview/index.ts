import { mount } from 'svelte';

import StatsPanel from './components/StatsPanel.svelte';

const app = document.getElementById('app');
if (app) {
  mount(StatsPanel, {
    target: app,
    props: {
      premiumStats: {
        current: 0,
        limit: 0,
        startOfMonth: '',
      },
      usageBasedStats: {
        isEnabled: false,
        limit: 0,
        currentCost: 0,
        items: [],
        billingPeriod: '',
        midMonthPayment: 0,
      },
    },
  });
}

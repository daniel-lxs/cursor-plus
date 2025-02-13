import { mount } from 'svelte';
import App from './App.svelte';

const app = document.getElementById('app');
if (!app) {
  throw new Error('Could not find app element');
}

// Mount the main App component
mount(App, {
  target: app,
  props: {
    premiumStats: {
      current: 0,
      limit: 0,
      startOfMonth: '',
      percentage: 0
    },
    usageBasedStats: {
      isEnabled: false,
      limit: 0,
      currentCost: 0,
      items: [],
      billingPeriod: '',
      midMonthPayment: 0,
    },
    servers: [],
  },
});

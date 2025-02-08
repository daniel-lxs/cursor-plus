import { mount } from 'svelte';
import type { ComponentType, SvelteComponent } from 'svelte';
import StatsPanel from './components/StatsPanel.svelte';

type Props = {
    premiumStats: {
        current: number;
        limit: number;
        startOfMonth: string;
    };
    usageBasedStats: {
        isEnabled: boolean;
        limit: number;
        currentCost: number;
        items: never[];
    };
};

mount<Props, any>(StatsPanel as unknown as ComponentType<SvelteComponent<Props>>, {
    target: document.getElementById('app')!,
    props: {
        premiumStats: {
            current: 0,
            limit: 0,
            startOfMonth: ''
        },
        usageBasedStats: {
            isEnabled: false,
            limit: 0,
            currentCost: 0,
            items: []
        }
    }
}); 
export interface PremiumStats {
    current: number;
    limit: number;
    startOfMonth: string;
}

export interface UsageBasedStats {
    isEnabled: boolean;
    limit: number;
    currentCost: number;
    items: Array<{
        model: string;
        requests: number;
        totalDollars: string;
    }>;
} 
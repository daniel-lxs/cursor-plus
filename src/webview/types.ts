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
        totalDollars: string;
        requestCount: number;
        costPerRequest: number;
        calculation?: string;
    }>;
} 
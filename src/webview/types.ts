import type { PremiumStats, UsageBasedStats, MCPServer } from '../interfaces/types';

// Props types for each component
export interface StatsProps {
  premium: PremiumStats;
  usage: UsageBasedStats;
}

export interface MCPServersPanelProps {
  servers: MCPServer[];
}

export interface AppProps {
  premiumStats: PremiumStats;
  usageBasedStats: UsageBasedStats;
  servers: MCPServer[];
} 
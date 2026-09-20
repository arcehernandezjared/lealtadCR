export interface LoyaltyRule {
  id: string;
  name: string;
  eventType: string;
  action: string;
  value: string;
  conditions: Record<string, unknown>;
  isActive: boolean;
  priority: number;
}

export interface LoyaltyTier {
  id: string;
  name: string;
  description: string | null;
  minPoints: number;
  color: string;
  order: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  isActive: boolean;
  quantityAvailable: number | null;
  limitPerCustomer: number | null;
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  description: string | null;
  type: "POINTS" | "VISITS" | "STAMPS" | "SPEND" | "MIXED";
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  isActive: boolean;
  rules: LoyaltyRule[];
  tiers: LoyaltyTier[];
  rewards: Reward[];
}

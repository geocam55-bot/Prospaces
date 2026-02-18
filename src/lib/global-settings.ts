/**
 * Global Settings Utility
 * Provides access to organization-wide settings like tax rates and price levels
 */

export interface GlobalSettings {
  taxRate: number;
  taxRate2?: number;
  defaultPriceLevel: string;
  quoteTerms?: string;
}

// Price level mapping constants
export type PriceLevel = 'Retail' | 'VIP' | 'VIP B' | 'VIP A' | 'T5';

export const PRICE_LEVELS: PriceLevel[] = ['Retail', 'VIP', 'VIP B', 'VIP A', 'T5'];

/**
 * Map price level names to inventory tier numbers
 * Retail -> Tier 1, VIP -> Tier 2, VIP B -> Tier 3, VIP A -> Tier 4, T5 -> Tier 5
 */
export function priceLevelToTier(priceLevel: string): number {
  const mapping: Record<string, number> = {
    'Retail': 1,
    'VIP': 2,
    'VIP B': 3,
    'VIPB': 3,
    'VIP A': 4,
    'VIPA': 4,
    'T5': 5,
    // Legacy mappings for backward compatibility with existing contact data
    'Wholesale': 2,
    'Contractor': 3,
    'Premium': 4,
    'Standard': 5,
  };
  return mapping[priceLevel] || 1; // Default to tier 1 (Retail) if not found
}

/**
 * Map inventory tier numbers to price level names
 */
export function tierToPriceLevel(tier: number): PriceLevel {
  const mapping: Record<number, PriceLevel> = {
    1: 'Retail',
    2: 'VIP',
    3: 'VIP B',
    4: 'VIP A',
    5: 'T5',
  };
  return mapping[tier] || 'Retail'; // Default to Retail if not found
}

/**
 * Get global settings for the current organization
 */
export function getGlobalSettings(): GlobalSettings {
  const orgId = localStorage.getItem('currentOrgId') || 'org_001';
  const stored = localStorage.getItem(`global_settings_${orgId}`);
  
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse global settings:', error);
    }
  }
  
  // Default values if not found
  return {
    taxRate: 0,
    taxRate2: 0,
    defaultPriceLevel: 'Retail', // Changed default to Retail
    quoteTerms: 'Payment due within 30 days. All prices in USD.',
  };
}

/**
 * Get the global tax rate for the current organization
 */
export function getGlobalTaxRate(): number {
  const settings = getGlobalSettings();
  return settings.taxRate;
}

/**
 * Get the second tax rate for the current organization
 */
export function getGlobalTaxRate2(): number {
  const settings = getGlobalSettings();
  return settings.taxRate2 || 0;
}

/**
 * Get the default price level for the current organization
 */
export function getDefaultPriceLevel(): string {
  const settings = getGlobalSettings();
  return settings.defaultPriceLevel;
}

/**
 * Get the default quote terms for the current organization
 */
export function getDefaultQuoteTerms(): string {
  const settings = getGlobalSettings();
  return settings.quoteTerms || 'Payment due within 30 days. All prices in USD.';
}
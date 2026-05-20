// Currency utility for HyGreen app
// Default currency: INR (Indian Rupees)

export const DEFAULT_CURRENCY = 'INR';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const CURRENCY_NAMES: Record<string, string> = {
  INR: 'Indian Rupee',
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
};

/**
 * Format price with currency symbol
 * @param amount - The price amount
 * @param currency - Currency code (defaults to INR)
 * @param showCode - Whether to show currency code alongside symbol
 * @returns Formatted price string
 */
export function formatPrice(
  amount: number | string,
  currency: string = DEFAULT_CURRENCY,
  showCode: boolean = false
): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return `${CURRENCY_SYMBOLS[currency] || currency}0.00`;
  }

  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = numAmount.toFixed(2);

  if (showCode) {
    return `${symbol}${formatted} ${currency}`;
  }

  return `${symbol}${formatted}`;
}

/**
 * Get currency symbol
 * @param currency - Currency code (defaults to INR)
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: string = DEFAULT_CURRENCY): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/**
 * Parse price string to number
 * @param priceString - Price string with or without currency symbol
 * @returns Numeric price value
 */
export function parsePrice(priceString: string): number {
  const cleaned = priceString.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Validate currency code
 * @param currency - Currency code to validate
 * @returns True if currency is supported
 */
export function isValidCurrency(currency: string): boolean {
  return currency in CURRENCY_SYMBOLS;
}

/**
 * Get default currency for the application
 * @returns Default currency code (INR)
 */
export function getDefaultCurrency(): string {
  return DEFAULT_CURRENCY;
}

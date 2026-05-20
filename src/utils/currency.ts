// Currency mapping from country to currency code
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // North America
  'United States': 'USD',
  'Canada': 'CAD',
  'Mexico': 'MXN',
  
  // Europe
  'United Kingdom': 'GBP',
  'Germany': 'EUR',
  'France': 'EUR',
  'Italy': 'EUR',
  'Spain': 'EUR',
  'Netherlands': 'EUR',
  'Belgium': 'EUR',
  'Austria': 'EUR',
  'Portugal': 'EUR',
  'Ireland': 'EUR',
  'Greece': 'EUR',
  'Finland': 'EUR',
  
  // Asia
  'India': 'INR',
  'China': 'CNY',
  'Japan': 'JPY',
  'South Korea': 'KRW',
  'Singapore': 'SGD',
  'Hong Kong': 'HKD',
  'Thailand': 'THB',
  'Malaysia': 'MYR',
  'Indonesia': 'IDR',
  'Philippines': 'PHP',
  'Vietnam': 'VND',
  
  // Oceania
  'Australia': 'AUD',
  'New Zealand': 'NZD',
  
  // Middle East
  'United Arab Emirates': 'AED',
  'Saudi Arabia': 'SAR',
  'Israel': 'ILS',
  
  // South America
  'Brazil': 'BRL',
  'Argentina': 'ARS',
  'Chile': 'CLP',
  'Colombia': 'COP',
  
  // Africa
  'South Africa': 'ZAR',
  'Nigeria': 'NGN',
  'Egypt': 'EGP',
  'Kenya': 'KES',
};

// Currency symbols
export const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'INR': '₹',
  'JPY': '¥',
  'CNY': '¥',
  'AUD': 'A$',
  'CAD': 'C$',
  'CHF': 'Fr',
  'HKD': 'HK$',
  'SGD': 'S$',
  'KRW': '₩',
  'MXN': 'Mex$',
  'BRL': 'R$',
  'ZAR': 'R',
  'NZD': 'NZ$',
  'THB': '฿',
  'MYR': 'RM',
  'IDR': 'Rp',
  'PHP': '₱',
  'VND': '₫',
  'AED': 'د.إ',
  'SAR': '﷼',
  'ILS': '₪',
  'NGN': '₦',
  'EGP': 'E£',
  'KES': 'KSh',
  'ARS': '$',
  'CLP': '$',
  'COP': '$',
};

// Get currency code from country
export function getCurrencyFromCountry(country: string): string {
  return COUNTRY_TO_CURRENCY[country] || 'USD';
}

// Get currency symbol
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
}

// Convert price from base currency to target currency
export function convertPrice(
  basePrice: number,
  baseCurrency: string,
  targetCurrency: string,
  exchangeRates: Record<string, number>
): number {
  if (baseCurrency === targetCurrency) {
    return basePrice;
  }

  // Convert to USD first (if base is not USD)
  const priceInUSD = baseCurrency === 'USD' 
    ? basePrice 
    : basePrice / (exchangeRates[baseCurrency] || 1);

  // Convert from USD to target currency
  const convertedPrice = priceInUSD * (exchangeRates[targetCurrency] || 1);

  return convertedPrice;
}

// Format price according to regional standards
export function formatPrice(
  amount: number,
  currencyCode: string,
  locale?: string
): string {
  // Determine locale based on currency if not provided
  const localeMap: Record<string, string> = {
    'USD': 'en-US',
    'EUR': 'de-DE',
    'GBP': 'en-GB',
    'INR': 'en-IN',
    'JPY': 'ja-JP',
    'CNY': 'zh-CN',
    'AUD': 'en-AU',
    'CAD': 'en-CA',
  };

  const formatLocale = locale || localeMap[currencyCode] || 'en-US';

  try {
    return new Intl.NumberFormat(formatLocale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
      maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is not supported
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toFixed(2)}`;
  }
}

// Format price with unit (e.g., "$2.50/kg")
export function formatPriceWithUnit(
  amount: number,
  currencyCode: string,
  unit: string,
  locale?: string
): string {
  const formattedPrice = formatPrice(amount, currencyCode, locale);
  return `${formattedPrice}/${unit}`;
}

// List of supported countries for dropdown
export const SUPPORTED_COUNTRIES = Object.keys(COUNTRY_TO_CURRENCY).sort();

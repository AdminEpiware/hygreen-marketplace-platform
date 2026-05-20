export interface Country {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
}

export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', currency: 'INR', currencySymbol: '₹' },
  { code: 'US', name: 'United States', currency: 'USD', currencySymbol: '$' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', currencySymbol: '£' },
  { code: 'DE', name: 'Germany', currency: 'EUR', currencySymbol: '€' },
  { code: 'FR', name: 'France', currency: 'EUR', currencySymbol: '€' },
  { code: 'IT', name: 'Italy', currency: 'EUR', currencySymbol: '€' },
  { code: 'ES', name: 'Spain', currency: 'EUR', currencySymbol: '€' },
  { code: 'CA', name: 'Canada', currency: 'CAD', currencySymbol: 'C$' },
  { code: 'AU', name: 'Australia', currency: 'AUD', currencySymbol: 'A$' },
  { code: 'JP', name: 'Japan', currency: 'JPY', currencySymbol: '¥' },
  { code: 'CN', name: 'China', currency: 'CNY', currencySymbol: '¥' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', currencySymbol: 'R$' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', currencySymbol: 'Mex$' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', currencySymbol: 'R' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', currencySymbol: 'د.إ' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', currencySymbol: '﷼' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', currencySymbol: 'S$' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', currencySymbol: 'RM' },
  { code: 'TH', name: 'Thailand', currency: 'THB', currencySymbol: '฿' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', currencySymbol: 'Rp' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', currencySymbol: '₱' },
  { code: 'VN', name: 'Vietnam', currency: 'VND', currencySymbol: '₫' },
  { code: 'KR', name: 'South Korea', currency: 'KRW', currencySymbol: '₩' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', currencySymbol: 'NZ$' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', currencySymbol: 'CHF' },
  { code: 'SE', name: 'Sweden', currency: 'SEK', currencySymbol: 'kr' },
  { code: 'NO', name: 'Norway', currency: 'NOK', currencySymbol: 'kr' },
  { code: 'DK', name: 'Denmark', currency: 'DKK', currencySymbol: 'kr' },
  { code: 'PL', name: 'Poland', currency: 'PLN', currencySymbol: 'zł' },
  { code: 'TR', name: 'Turkey', currency: 'TRY', currencySymbol: '₺' },
  { code: 'RU', name: 'Russia', currency: 'RUB', currencySymbol: '₽' },
  { code: 'EG', name: 'Egypt', currency: 'EGP', currencySymbol: 'E£' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', currencySymbol: '₦' },
  { code: 'KE', name: 'Kenya', currency: 'KES', currencySymbol: 'KSh' },
  { code: 'AR', name: 'Argentina', currency: 'ARS', currencySymbol: '$' },
  { code: 'CL', name: 'Chile', currency: 'CLP', currencySymbol: '$' },
  { code: 'CO', name: 'Colombia', currency: 'COP', currencySymbol: '$' },
  { code: 'PE', name: 'Peru', currency: 'PEN', currencySymbol: 'S/' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', currencySymbol: '৳' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', currencySymbol: '₨' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', currencySymbol: 'Rs' },
  { code: 'NP', name: 'Nepal', currency: 'NPR', currencySymbol: 'Rs' },
];

/**
 * Get currency code for a given country
 */
export function getCurrencyForCountry(countryName: string): string {
  const country = COUNTRIES.find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase() || c.code === countryName
  );
  return country?.currency || 'INR'; // Default to INR
}

/**
 * Get currency symbol for a given country
 */
export function getCurrencySymbolForCountry(countryName: string): string {
  const country = COUNTRIES.find(
    (c) => c.name.toLowerCase() === countryName.toLowerCase() || c.code === countryName
  );
  return country?.currencySymbol || '₹'; // Default to INR symbol
}

/**
 * Get country by name or code
 */
export function getCountry(nameOrCode: string): Country | undefined {
  return COUNTRIES.find(
    (c) => c.name.toLowerCase() === nameOrCode.toLowerCase() || c.code === nameOrCode
  );
}

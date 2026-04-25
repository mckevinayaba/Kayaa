export type Country = {
  code: string;
  name: string;
  flag: string;
  currency_code: string;
  currency_symbol: string;
  calling_code: string;
  default_language: 'en' | 'fr';
  secondary_language?: 'en' | 'fr' | 'sw';
  payment_provider: string;
  active: boolean;
  launch_cities: string[];
};

export const COUNTRIES: Country[] = [
  {
    code: 'ZA',
    name: 'South Africa',
    flag: '🇿🇦',
    currency_code: 'ZAR',
    currency_symbol: 'R',
    calling_code: '27',
    default_language: 'en',
    payment_provider: 'yoco',
    active: true,
    launch_cities: [
      'Johannesburg', 'Cape Town', 'Pretoria',
      'Durban', 'Soweto', 'Alexandra', 'Tembisa',
      'Khayelitsha', 'Mitchells Plain', 'Mamelodi',
    ],
  },
  {
    code: 'KE',
    name: 'Kenya',
    flag: '🇰🇪',
    currency_code: 'KES',
    currency_symbol: 'KSh',
    calling_code: '254',
    default_language: 'en',
    secondary_language: 'sw',
    payment_provider: 'pesapal',
    active: false,
    launch_cities: [
      'Nairobi', 'Mombasa', 'Kisumu',
      'Nakuru', 'Kibera', 'Eastleigh', 'Mathare',
    ],
  },
  {
    code: 'NG',
    name: 'Nigeria',
    flag: '🇳🇬',
    currency_code: 'NGN',
    currency_symbol: '₦',
    calling_code: '234',
    default_language: 'en',
    payment_provider: 'paystack',
    active: false,
    launch_cities: [
      'Lagos', 'Abuja', 'Kano',
      'Ibadan', 'Port Harcourt', 'Surulere', 'Ikeja',
    ],
  },
  {
    code: 'GH',
    name: 'Ghana',
    flag: '🇬🇭',
    currency_code: 'GHS',
    currency_symbol: 'GH₵',
    calling_code: '233',
    default_language: 'en',
    payment_provider: 'paystack',
    active: false,
    launch_cities: [
      'Accra', 'Kumasi', 'Tamale',
      'Tema', 'Osu', 'Labadi', 'Madina',
    ],
  },
  {
    code: 'CM',
    name: 'Cameroon',
    flag: '🇨🇲',
    currency_code: 'XAF',
    currency_symbol: 'FCFA',
    calling_code: '237',
    default_language: 'fr',
    secondary_language: 'en',
    payment_provider: 'campay',
    active: false,
    launch_cities: [
      'Douala', 'Yaoundé', 'Bafoussam',
      'Bamenda', 'Garoua', 'Buea', 'New Bell',
    ],
  },
];

export const getCountry = (code: string): Country =>
  COUNTRIES.find(c => c.code === code) ?? COUNTRIES[0];

export const getActiveCountries = (): Country[] =>
  COUNTRIES.filter(c => c.active);

export const getAllCountries = (): Country[] => COUNTRIES;

// Detect country from browser timezone
export function detectCountryFromTimezone(): Country {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const map: Record<string, string> = {
      'Africa/Johannesburg': 'ZA',
      'Africa/Nairobi':      'KE',
      'Africa/Lagos':        'NG',
      'Africa/Accra':        'GH',
      'Africa/Douala':       'CM',
    };
    const code = map[tz];
    if (code) return getCountry(code);
  } catch { /* ignore */ }
  return COUNTRIES[0];
}

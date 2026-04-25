import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  type Country,
  getCountry,
  detectCountryFromTimezone,
} from '../config/countries';
import { type CategoryConfig, getCategoryLabels } from '../config/categoryLabels';

const COUNTRY_KEY  = 'kayaa_country_code';
const LANGUAGE_KEY = 'kayaa_language';

interface CountryContextType {
  selectedCountry: Country;
  setSelectedCountry: (country: Country) => void;
  categoryLabels: CategoryConfig[];
  currencySymbol: string;
  callingCode: string;
  preferredLanguage: 'en' | 'fr';
  setPreferredLanguage: (lang: 'en' | 'fr') => void;
}

const CountryContext = createContext<CountryContextType | null>(null);

export function CountryProvider({ children }: { children: ReactNode }) {
  const [selectedCountry, setSelectedCountryState] = useState<Country>(() => {
    const saved = localStorage.getItem(COUNTRY_KEY);
    if (saved) return getCountry(saved);
    const detected = detectCountryFromTimezone();
    localStorage.setItem(COUNTRY_KEY, detected.code);
    return detected;
  });

  const [preferredLanguage, setPreferredLanguageState] = useState<'en' | 'fr'>(() => {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === 'en' || saved === 'fr') return saved;
    // Default: follow country default_language
    const country = getCountry(localStorage.getItem(COUNTRY_KEY) ?? 'ZA');
    return country.default_language;
  });

  useEffect(() => {
    localStorage.setItem(COUNTRY_KEY, selectedCountry.code);
  }, [selectedCountry]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, preferredLanguage);
  }, [preferredLanguage]);

  function setSelectedCountry(country: Country) {
    setSelectedCountryState(country);
    localStorage.setItem(COUNTRY_KEY, country.code);
    // Reset language to country default when switching countries
    const lang = country.default_language;
    setPreferredLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  }

  function setPreferredLanguage(lang: 'en' | 'fr') {
    setPreferredLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  }

  const categoryLabels = getCategoryLabels(selectedCountry.code, preferredLanguage);

  return (
    <CountryContext.Provider value={{
      selectedCountry,
      setSelectedCountry,
      categoryLabels,
      currencySymbol:      selectedCountry.currency_symbol,
      callingCode:         selectedCountry.calling_code,
      preferredLanguage,
      setPreferredLanguage,
    }}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useCountry must be used within CountryProvider');
  return ctx;
}

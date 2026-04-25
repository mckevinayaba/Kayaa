import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  type Country,
  getCountry,
  detectCountryFromTimezone,
} from '../config/countries';
import { type CategoryConfig, getCategoryLabels } from '../config/categoryLabels';

const STORAGE_KEY = 'kayaa_country_code';

interface CountryContextType {
  selectedCountry: Country;
  setSelectedCountry: (country: Country) => void;
  categoryLabels: CategoryConfig[];
  currencySymbol: string;
  callingCode: string;
}

const CountryContext = createContext<CountryContextType | null>(null);

export function CountryProvider({ children }: { children: ReactNode }) {
  const [selectedCountry, setSelectedCountryState] = useState<Country>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return getCountry(saved);
    const detected = detectCountryFromTimezone();
    localStorage.setItem(STORAGE_KEY, detected.code);
    return detected;
  });

  // Sync to localStorage whenever the country changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedCountry.code);
  }, [selectedCountry]);

  function setSelectedCountry(country: Country) {
    setSelectedCountryState(country);
    localStorage.setItem(STORAGE_KEY, country.code);
  }

  const categoryLabels = getCategoryLabels(selectedCountry.code);

  return (
    <CountryContext.Provider value={{
      selectedCountry,
      setSelectedCountry,
      categoryLabels,
      currencySymbol: selectedCountry.currency_symbol,
      callingCode:    selectedCountry.calling_code,
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

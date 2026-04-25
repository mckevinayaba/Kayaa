export type CategoryKey =
  | 'barbershop' | 'salon' | 'food' | 'tavern'
  | 'spaza' | 'church' | 'carwash' | 'cafe'
  | 'gym' | 'market' | 'mechanic' | 'other';

export type CategoryConfig = {
  key: CategoryKey;
  label: string;
  emoji: string;
};

export const CATEGORY_LABELS: Record<string, CategoryConfig[]> = {
  ZA: [
    { key: 'barbershop', label: 'Barbershop',          emoji: '💈' },
    { key: 'salon',      label: 'Salon',               emoji: '💅' },
    { key: 'food',       label: 'Shisanyama / Food',   emoji: '🍖' },
    { key: 'tavern',     label: 'Tavern',               emoji: '🍺' },
    { key: 'spaza',      label: 'Spaza Shop',           emoji: '🛒' },
    { key: 'church',     label: 'Church / Faith',       emoji: '⛪' },
    { key: 'carwash',    label: 'Car Wash',             emoji: '🚗' },
    { key: 'cafe',       label: 'Café',                 emoji: '☕' },
    { key: 'gym',        label: 'Gym / Fitness',        emoji: '💪' },
    { key: 'market',     label: 'Market Stall',         emoji: '🏪' },
    { key: 'mechanic',   label: 'Mechanic / Garage',   emoji: '🔧' },
    { key: 'other',      label: 'Other Place',          emoji: '📍' },
  ],
  KE: [
    { key: 'barbershop', label: 'Kinyozi',                    emoji: '💈' },
    { key: 'salon',      label: 'Salon ya Nywele',            emoji: '💅' },
    { key: 'food',       label: 'Mama Lishe / Nyama Choma',  emoji: '🍖' },
    { key: 'tavern',     label: 'Local Bar',                  emoji: '🍺' },
    { key: 'spaza',      label: 'Duka',                       emoji: '🛒' },
    { key: 'church',     label: 'Church / Kanisa',            emoji: '⛪' },
    { key: 'carwash',    label: 'Car Wash',                   emoji: '🚗' },
    { key: 'cafe',       label: 'Café / Coffee Shop',         emoji: '☕' },
    { key: 'gym',        label: 'Gym / Fitness',              emoji: '💪' },
    { key: 'market',     label: 'Market / Soko',              emoji: '🏪' },
    { key: 'mechanic',   label: 'Mechanic / Garage',          emoji: '🔧' },
    { key: 'other',      label: 'Other Place',                emoji: '📍' },
  ],
  NG: [
    { key: 'barbershop', label: 'Barbing Saloon',         emoji: '💈' },
    { key: 'salon',      label: 'Hair Salon',             emoji: '💅' },
    { key: 'food',       label: 'Buka / Bukateria',       emoji: '🍖' },
    { key: 'tavern',     label: 'Beer Parlour',           emoji: '🍺' },
    { key: 'spaza',      label: 'Provision Store',        emoji: '🛒' },
    { key: 'church',     label: 'Church / Fellowship',    emoji: '⛪' },
    { key: 'carwash',    label: 'Car Wash',               emoji: '🚗' },
    { key: 'cafe',       label: 'Café / Eatery',          emoji: '☕' },
    { key: 'gym',        label: 'Gym / Fitness Centre',   emoji: '💪' },
    { key: 'market',     label: 'Market Stall',           emoji: '🏪' },
    { key: 'mechanic',   label: 'Mechanic / Vulcanizer',  emoji: '🔧' },
    { key: 'other',      label: 'Other Place',            emoji: '📍' },
  ],
  GH: [
    { key: 'barbershop', label: 'Barbershop',            emoji: '💈' },
    { key: 'salon',      label: 'Hair Salon',            emoji: '💅' },
    { key: 'food',       label: 'Chop Bar / Spot',       emoji: '🍖' },
    { key: 'tavern',     label: 'Drinking Bar / Spot',   emoji: '🍺' },
    { key: 'spaza',      label: 'Kiosk / Provisions',    emoji: '🛒' },
    { key: 'church',     label: 'Church / Fellowship',   emoji: '⛪' },
    { key: 'carwash',    label: 'Car Wash',              emoji: '🚗' },
    { key: 'cafe',       label: 'Café / Coffee Shop',    emoji: '☕' },
    { key: 'gym',        label: 'Gym / Fitness',         emoji: '💪' },
    { key: 'market',     label: 'Market Stall',          emoji: '🏪' },
    { key: 'mechanic',   label: 'Mechanic / Garage',     emoji: '🔧' },
    { key: 'other',      label: 'Other Place',           emoji: '📍' },
  ],
  CM: [
    { key: 'barbershop', label: 'Salon de Coiffure',        emoji: '💈' },
    { key: 'salon',      label: 'Salon de Beauté',          emoji: '💅' },
    { key: 'food',       label: 'Maquis / Coin Braisé',    emoji: '🍖' },
    { key: 'tavern',     label: 'Cabaret / Bar',            emoji: '🍺' },
    { key: 'spaza',      label: 'Boutique / Alimentation',  emoji: '🛒' },
    { key: 'church',     label: 'Église / Fellowship',      emoji: '⛪' },
    { key: 'carwash',    label: 'Lavage Auto',              emoji: '🚗' },
    { key: 'cafe',       label: 'Café / Boulangerie',       emoji: '☕' },
    { key: 'gym',        label: 'Salle de Sport',           emoji: '💪' },
    { key: 'market',     label: 'Marché / Tablier',         emoji: '🏪' },
    { key: 'mechanic',   label: 'Garage / Mécanicien',      emoji: '🔧' },
    { key: 'other',      label: 'Autre Lieu',               emoji: '📍' },
  ],
};

export const getCategoryLabels = (countryCode: string): CategoryConfig[] =>
  CATEGORY_LABELS[countryCode] ?? CATEGORY_LABELS['ZA'];

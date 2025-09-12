import { createContext, useContext, useEffect, useState } from 'react';

// Import English translations
import commonEn from '../../locales/en/common.json';
import authEn from '../../locales/en/auth.json';
import adminEn from '../../locales/en/admin.json';
import userEn from '../../locales/en/user.json';
import dealerEn from '../../locales/en/dealer.json';
import deliveryEn from '../../locales/en/delivery.json';
import shopkeeperEn from '../../locales/en/shopkeeper.json';
import formsEn from '../../locales/en/forms.json';

// Import Hindi translations
import commonHi from '../../locales/hi/common.json';
import authHi from '../../locales/hi/auth.json';
import adminHi from '../../locales/hi/admin.json';
import userHi from '../../locales/hi/user.json';
import dealerHi from '../../locales/hi/dealer.json';
import deliveryHi from '../../locales/hi/delivery.json';
import shopkeeperHi from '../../locales/hi/shopkeeper.json';
import formsHi from '../../locales/hi/forms.json';

// Import Tamil translations
import commonTa from '../../locales/ta/common.json';
import authTa from '../../locales/ta/auth.json';
import adminTa from '../../locales/ta/admin.json';
import userTa from '../../locales/ta/user.json';
import dealerTa from '../../locales/ta/dealer.json';
import deliveryTa from '../../locales/ta/delivery.json';
import shopkeeperTa from '../../locales/ta/shopkeeper.json';
import formsTa from '../../locales/ta/forms.json';

// Import Dzongkha translations
import commonDz from '../../locales/dz/common.json';
import authDz from '../../locales/dz/auth.json';
import adminDz from '../../locales/dz/admin.json';
import userDz from '../../locales/dz/user.json';
import dealerDz from '../../locales/dz/dealer.json';
import deliveryDz from '../../locales/dz/delivery.json';
import shopkeeperDz from '../../locales/dz/shopkeeper.json';
import formsDz from '../../locales/dz/forms.json';

// Import Nepali translations
import commonNe from '../../locales/ne/common.json';
import authNe from '../../locales/ne/auth.json';
import adminNe from '../../locales/ne/admin.json';
import userNe from '../../locales/ne/user.json';
import dealerNe from '../../locales/ne/dealer.json';
import deliveryNe from '../../locales/ne/delivery.json';
import shopkeeperNe from '../../locales/ne/shopkeeper.json';
import formsNe from '../../locales/ne/forms.json';

// Import Bengali translations
import commonBn from '../../locales/bn/common.json';
import authBn from '../../locales/bn/auth.json';
import adminBn from '../../locales/bn/admin.json';
import userBn from '../../locales/bn/user.json';
import dealerBn from '../../locales/bn/dealer.json';
import deliveryBn from '../../locales/bn/delivery.json';
import shopkeeperBn from '../../locales/bn/shopkeeper.json';
import formsBn from '../../locales/bn/forms.json';

// Import Sinhala translations
import commonSi from '../../locales/si/common.json';
import authSi from '../../locales/si/auth.json';
import adminSi from '../../locales/si/admin.json';
import userSi from '../../locales/si/user.json';
import dealerSi from '../../locales/si/dealer.json';
import deliverySi from '../../locales/si/delivery.json';
import shopkeeperSi from '../../locales/si/shopkeeper.json';
import formsSi from '../../locales/si/forms.json';

const translations = {
  en: {
    // Flatten common translations to root level for the landing page
    ...commonEn,
    // Keep namespaced translations for specific pages
    common: commonEn,
    auth: authEn,
    admin: adminEn,
    user: userEn,
    dealer: dealerEn,
    delivery: deliveryEn,
    shopkeeper: shopkeeperEn,
    forms: formsEn
  },
  hi: {
    // Flatten common translations to root level for the landing page
    ...commonHi,
    // Keep namespaced translations for specific pages
    common: commonHi,
    auth: authHi,
    admin: adminHi,
    user: userHi,
    dealer: dealerHi,
    delivery: deliveryHi,
    shopkeeper: shopkeeperHi,
    forms: formsHi
  },
  ta: {
    // Flatten common translations to root level for the landing page
    ...commonTa,
    // Keep namespaced translations for specific pages
    common: commonTa,
    auth: authTa,
    admin: adminTa,
    user: userTa,
    dealer: dealerTa,
    delivery: deliveryTa,
    shopkeeper: shopkeeperTa,
    forms: formsTa
  },
  dz: {
    // Flatten common translations to root level for the landing page
    ...commonDz,
    // Keep namespaced translations for specific pages
    common: commonDz,
    auth: authDz,
    admin: adminDz,
    user: userDz,
    dealer: dealerDz,
    delivery: deliveryDz,
    shopkeeper: shopkeeperDz,
    forms: formsDz
  },
  ne: {
    // Flatten common translations to root level for the landing page
    ...commonNe,
    // Keep namespaced translations for specific pages
    common: commonNe,
    auth: authNe,
    admin: adminNe,
    user: userNe,
    dealer: dealerNe,
    delivery: deliveryNe,
    shopkeeper: shopkeeperNe,
    forms: formsNe
  },
  bn: {
    // Flatten common translations to root level for the landing page
    ...commonBn,
    // Keep namespaced translations for specific pages
    common: commonBn,
    auth: authBn,
    admin: adminBn,
    user: userBn,
    dealer: dealerBn,
    delivery: deliveryBn,
    shopkeeper: shopkeeperBn,
    forms: formsBn
  },
  si: {
    // Flatten common translations to root level for the landing page
    ...commonSi,
    // Keep namespaced translations for specific pages
    common: commonSi,
    auth: authSi,
    admin: adminSi,
    user: userSi,
    dealer: dealerSi,
    delivery: deliverySi,
    shopkeeper: shopkeeperSi,
    forms: formsSi
  }
};

export const languages = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸'
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    flag: '🇮🇳'
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳'
  },
  {
    code: 'dz',
    name: 'Dzongkha',
    nativeName: 'རྫོང་ཁ',
    flag: '🇧🇹'
  },
  {
    code: 'ne',
    name: 'Nepali',
    nativeName: 'नेपाली',
    flag: '🇳🇵'
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇧🇩'
  },
  {
    code: 'si',
    name: 'Sinhala',
    nativeName: 'සිංහල',
    flag: '🇱🇰'
  }
];

// Create Context
const TranslationContext = createContext();

// Provider Component
export const TranslationProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    // Get locale from localStorage or browser language
    const savedLocale = localStorage.getItem('locale');
    const browserLocale = navigator.language.split('-')[0];
    const preferredLocale = savedLocale || (translations[browserLocale] ? browserLocale : 'en');
    setLocale(preferredLocale);
  }, []);

  const changeLanguage = (newLocale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let translation = translations[locale];
    
    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        // Fallback to English if translation not found
        translation = translations.en;
        for (const k of keys) {
          if (translation && translation[k]) {
            translation = translation[k];
          } else {
            return key; // Return the key if translation not found
          }
        }
        break;
      }
    }
    
    // Handle string interpolation (e.g., {name} replacement)
    if (typeof translation === 'string' && translation.includes('{')) {
      return translation.replace(/{(\w+)}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match;
      });
    }
    
    return translation || key;
  };

  return (
    <TranslationContext.Provider value={{ locale, changeLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

// Hook to use translation
export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

// Static translation helper for server-side rendering
export const getStaticTranslations = (locale = 'en') => {
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let translation = translations[locale];
    
    for (const k of keys) {
      if (translation && translation[k]) {
        translation = translation[k];
      } else {
        // Fallback to English if translation not found
        translation = translations.en;
        for (const k of keys) {
          if (translation && translation[k]) {
            translation = translation[k];
          } else {
            return key; // Return the key if translation not found
          }
        }
        break;
      }
    }
    
    // Handle string interpolation (e.g., {name} replacement)
    if (typeof translation === 'string' && translation.includes('{')) {
      return translation.replace(/{(\w+)}/g, (match, param) => {
        return params[param] !== undefined ? params[param] : match;
      });
    }
    
    return translation || key;
  };

  return { t, locale };
};

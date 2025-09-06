import { createContext, useContext, useEffect, useState } from 'react';
import en from '../../locales/en/common.json';
import hi from '../../locales/hi/common.json';
import ta from '../../locales/ta/common.json';
import dz from '../../locales/dz/common.json';
import ne from '../../locales/ne/common.json';
import bn from '../../locales/bn/common.json';
import si from '../../locales/si/common.json';

const translations = {
  en,
  hi,
  ta,
  dz,
  ne,
  bn,
  si
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

  const t = (key) => {
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
  const t = (key) => {
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
    
    return translation || key;
  };

  return { t, locale };
};

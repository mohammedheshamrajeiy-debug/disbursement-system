import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import { createContext, useContext } from "react";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

const STORAGE_KEY = "app_lang";

function detectInitialLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "en" || v === "ar") return v;
  } catch {
    /* ignore */
  }
  return "en";
}

function applyDocLang(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

const initial = detectInitialLang();
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: initial,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

applyDocLang(initial);

i18n.on("languageChanged", (lang) => {
  applyDocLang(lang);
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
});

// Keeps the same API the app already consumed (lang / t / toggleLanguage /
// setLanguage) so existing callers keep working while being backed by i18next.
const LanguageContext = createContext({
  lang: "en",
  t: i18n.t.bind(i18n),
  toggleLanguage: () => {},
  setLanguage: i18n.changeLanguage.bind(i18n),
});

export function useLanguage() {
  const { t, i18n: i } = useTranslation();
  return {
    lang: i.language,
    t,
    toggleLanguage: () => i.changeLanguage(i.language === "ar" ? "en" : "ar"),
    setLanguage: i.changeLanguage.bind(i),
  };
}

export function LanguageProvider({ children }) {
  // i18next is a global singleton configured above; this provider exists so
  // main.jsx can keep wrapping the app. The dir/lang attributes and
  // localStorage persistence are handled by the languageChanged listener.
  return (
    <LanguageContext.Provider value={useLanguage()}>{children}</LanguageContext.Provider>
  );
}

export default i18n;

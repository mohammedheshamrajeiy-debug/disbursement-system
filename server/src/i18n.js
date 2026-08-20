import i18next from 'i18next';
import Backend from 'i18next-http-middleware';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const resources = {
  en: {
    translation: JSON.parse(
      readFileSync(join(__dirname, 'locales', 'en.json'), 'utf8'),
    ),
  },
  ar: {
    translation: JSON.parse(
      readFileSync(join(__dirname, 'locales', 'ar.json'), 'utf8'),
    ),
  },
};

i18next.use(Backend.LanguageDetector).init({
  resources,
  fallbackLng: 'ar',
  preload: ['en', 'ar'],
});

export const middleware = Backend.handle(i18next);

// Translator for code paths that run without a request context (services
// called from scripts/tests, default params, ...) -> always Arabic.
export function t(key, params) {
  return i18next.t(key, params || {});
}

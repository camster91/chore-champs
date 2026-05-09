'use client'

import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import enSample from '@/locales/en/sample.json'
import enUI from '@/locales/en/ui.json'

let initialized = false

export function initClientI18n(locale: string = 'en') {
  if (initialized) return
  i18next.use(initReactI18next).init({
    lng: locale,
    fallbackLng: 'en',
    resources: {
      en: { translation: enSample, ui: enUI },
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  })
  initialized = true
}

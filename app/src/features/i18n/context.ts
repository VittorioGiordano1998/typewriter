import { createContext, useContext } from 'react'
import type { Language } from '../../core/storage-schema'
import { en, type Dict } from './en'
import { it } from './it'

export const DICTS: Record<Language, Dict> = { en, it }

export function detectLanguage(): Language {
  try {
    return navigator.language.toLowerCase().startsWith('it') ? 'it' : 'en'
  } catch {
    return 'en'
  }
}

export interface I18n {
  readonly lang: Language
  readonly t: Dict
  setLang(lang: Language): void
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

import { useMemo, type ReactNode } from 'react'
import type { Language } from '../../core/storage-schema'
import { DICTS, I18nContext, type I18n } from './context'

interface Props {
  lang: Language
  onLangChange(lang: Language): void
  children: ReactNode
}

/** Controlled by the settings store, so the language persists with everything else. */
export function I18nProvider({ lang, onLangChange, children }: Props) {
  const value = useMemo<I18n>(() => ({ lang, t: DICTS[lang], setLang: onLangChange }), [lang, onLangChange])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

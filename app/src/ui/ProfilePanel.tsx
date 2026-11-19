import { useState } from 'react'
import { supabase } from '../features/cloud/client'
import { changePassword as updatePassword } from '../features/cloud/password'
import { useI18n } from '../features/i18n/context'
import { Panel } from './Panel'

export function ProfilePanel({ email, onClose }: { email: string; onClose(): void }) {
  const { t } = useI18n()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [code, setCode] = useState('')
  const [needsCode, setNeedsCode] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const changePassword = async () => {
    if (!supabase || busy) return
    if (password !== confirmation) { setMessage(t.passwordMismatch); return }
    setBusy(true)
    setMessage('')
    const result = await updatePassword(supabase, current, password, needsCode ? code : undefined)
    if (result === 'codeSent') { setNeedsCode(true); setMessage(t.passwordCodeSent) }
    else if (result === 'codeError') setMessage(t.passwordCodeError)
    else if (result === 'error') setMessage(t.passwordError)
    else {
      setCurrent(''); setPassword(''); setConfirmation(''); setCode(''); setNeedsCode(false)
      setMessage(t.passwordChanged)
    }
    setBusy(false)
  }

  const inputClass = 'mt-1 w-full rounded border border-paper/40 bg-transparent p-2 focus-visible:outline-2 focus-visible:outline-brass'
  return <Panel title={t.profile} onClose={onClose}>
    <p className="mb-5 break-all text-sm text-paper/70">{t.profileEmail} <strong className="text-paper">{email}</strong></p>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void changePassword() }}>
      <label className="block">{t.currentPassword}<input className={inputClass} type="password" autoComplete="current-password" required value={current} onChange={(event) => setCurrent(event.target.value)} /></label>
      <label className="block">{t.newPassword}<input className={inputClass} type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      <label className="block">{t.confirmPassword}<input className={inputClass} type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
      {needsCode && <label className="block">{t.passwordCode}<input className={inputClass} inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(event) => setCode(event.target.value)} /></label>}
      <button className="rounded-lg bg-brass px-4 py-2 text-desk disabled:opacity-50" type="submit" disabled={busy}>{t.passwordChange}</button>
      {message && <p role="status">{message}</p>}
    </form>
  </Panel>
}

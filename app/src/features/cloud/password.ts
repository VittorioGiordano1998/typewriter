import type { SupabaseClient } from '@supabase/supabase-js'

export type PasswordChangeResult = 'changed' | 'codeSent' | 'codeError' | 'error'

/** Changes the authenticated user's password, requesting a verification code if required. */
export async function changePassword(
  client: SupabaseClient,
  current: string,
  password: string,
  code?: string,
): Promise<PasswordChangeResult> {
  try {
    const { error } = await client.auth.updateUser({ password, current_password: current, ...(code ? { nonce: code } : {}) })
    if (!error) return 'changed'
    if (error.code !== 'reauthentication_needed' || code) return 'error'
    const result = await client.auth.reauthenticate()
    return result.error ? 'codeError' : 'codeSent'
  } catch {
    return 'error'
  }
}

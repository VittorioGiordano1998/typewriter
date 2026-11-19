import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { changePassword } from '../src/features/cloud/password'

function mockClient(error: { code: string } | null, sendError: object | null = null) {
  const updateUser = vi.fn().mockResolvedValue({ error })
  const reauthenticate = vi.fn().mockResolvedValue({ error: sendError })
  return { client: { auth: { updateUser, reauthenticate } } as unknown as SupabaseClient, updateUser, reauthenticate }
}

describe('password changes', () => {
  it('sends the current and new password to Supabase', async () => {
    const mock = mockClient(null)
    expect(await changePassword(mock.client, 'old', 'new')).toBe('changed')
    expect(mock.updateUser).toHaveBeenCalledWith({ current_password: 'old', password: 'new' })
  })
  it('requests a verification code when required', async () => {
    const mock = mockClient({ code: 'reauthentication_needed' })
    expect(await changePassword(mock.client, 'old', 'new')).toBe('codeSent')
    expect(mock.reauthenticate).toHaveBeenCalledOnce()
  })
  it('submits a code and reports errors without resending it', async () => {
    const mock = mockClient({ code: 'reauthentication_not_valid' })
    expect(await changePassword(mock.client, 'old', 'new', '123456')).toBe('error')
    expect(mock.updateUser).toHaveBeenCalledWith({ current_password: 'old', password: 'new', nonce: '123456' })
    expect(mock.reauthenticate).not.toHaveBeenCalled()
  })
  it('reports failures to send a code', async () => {
    const mock = mockClient({ code: 'reauthentication_needed' }, { message: 'unavailable' })
    expect(await changePassword(mock.client, 'old', 'new')).toBe('codeError')
  })
})

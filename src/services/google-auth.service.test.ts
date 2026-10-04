import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('axios')
vi.mock('../config/keys.js', () => ({ env: { GOOGLE_CLIENT_ID: 'web-client-id' } }))
vi.mock('../config/logger.js', () => ({ default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }))

import { GoogleAuthService } from './google-auth.service.js'

const validClaims = {
  aud: 'web-client-id',
  iss: 'https://accounts.google.com',
  sub: '1234',
  email: 'ada@example.com',
  email_verified: 'true',
  name: 'Ada Lovelace',
  picture: 'https://example.com/ada.png',
}

describe('GoogleAuthService.verifyIdToken', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockReset()
  })

  it('returns the profile for a valid token', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: validClaims })
    const profile = await GoogleAuthService.verifyIdToken('token')
    expect(axios.get).toHaveBeenCalledWith('https://oauth2.googleapis.com/tokeninfo', { params: { id_token: 'token' } })
    expect(profile).toEqual({
      sub: '1234',
      email: 'ada@example.com',
      emailVerified: true,
      name: 'Ada Lovelace',
      picture: 'https://example.com/ada.png',
    })
  })

  it('accepts the bare accounts.google.com issuer and reports unverified emails', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { ...validClaims, iss: 'accounts.google.com', email_verified: 'false' } })
    const profile = await GoogleAuthService.verifyIdToken('token')
    expect(profile.emailVerified).toBe(false)
  })

  it('rejects when the tokeninfo call fails', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('400'))
    await expect(GoogleAuthService.verifyIdToken('token')).rejects.toThrow(/invalid or expired/i)
  })

  it('rejects a token issued to a different audience', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { ...validClaims, aud: 'other-client' } })
    await expect(GoogleAuthService.verifyIdToken('token')).rejects.toThrow('Invalid Google token')
  })

  it('rejects an unexpected issuer', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { ...validClaims, iss: 'https://evil.example.com' } })
    await expect(GoogleAuthService.verifyIdToken('token')).rejects.toThrow('Invalid Google token')
  })

  it('rejects a token with no email', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { ...validClaims, email: undefined } })
    await expect(GoogleAuthService.verifyIdToken('token')).rejects.toThrow(/no email/i)
  })
})

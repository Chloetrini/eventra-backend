import axios from 'axios'
import { env } from '../config/keys.js'
import logger from '../config/logger.js'

interface GoogleProfile {
  sub: string
  email: string
  emailVerified: boolean
  name: string
  picture?: string
}

export class GoogleAuthService {
  /**
   * Verifies a Google OAuth access token (from the client's implicit-flow
   * login, see useGoogleLogin on the frontend) and returns the associated
   * profile. Two calls, not one, and both matter:
   *
   * 1. tokeninfo — confirms this access token was actually issued to *our*
   *    app (checks `aud`/`azp` against GOOGLE_CLIENT_ID). Skipping this
   *    step would mean any valid Google access token from ANY app could be
   *    replayed against our backend to authenticate as its owner — the
   *    token being real and valid isn't the same as it being ours.
   * 2. userinfo — the actual profile data, fetched only once step 1 passes.
   */
  static async verifyAccessToken(accessToken: string): Promise<GoogleProfile> {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new Error('Google sign-in is not configured on this server')
    }

    const { data: tokenInfo } = await axios
      .get('https://oauth2.googleapis.com/tokeninfo', { params: { access_token: accessToken } })
      .catch(() => {
        throw new Error('Invalid or expired Google token')
      })

    const issuedForUs = tokenInfo.aud === env.GOOGLE_CLIENT_ID || tokenInfo.azp === env.GOOGLE_CLIENT_ID
    if (!issuedForUs) {
      logger.warn({ aud: tokenInfo.aud, azp: tokenInfo.azp }, 'Google token audience mismatch — possible token replay')
      throw new Error('Invalid Google token')
    }

    const { data: profile } = await axios
      .get('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } })
      .catch(() => {
        throw new Error('Could not fetch Google profile')
      })

    if (!profile.email) {
      throw new Error('Google account has no email on file')
    }

    return {
      sub: profile.sub,
      email: profile.email,
      emailVerified: profile.email_verified === true || profile.email_verified === 'true',
      name: profile.name || profile.email.split('@')[0],
      picture: profile.picture,
    }
  }

  /**
   * Verifies a Google ID token (sent by the mobile app's native Google
   * Sign-In, configured with our web client id) and returns the profile
   * from its claims. tokeninfo validates the signature and expiry; we still
   * have to check the audience is ours and the issuer is Google.
   */
  static async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new Error('Google sign-in is not configured on this server')
    }

    const { data: tokenInfo } = await axios
      .get('https://oauth2.googleapis.com/tokeninfo', { params: { id_token: idToken } })
      .catch(() => {
        throw new Error('Invalid or expired Google token')
      })

    if (tokenInfo.aud !== env.GOOGLE_CLIENT_ID) {
      logger.warn({ aud: tokenInfo.aud }, 'Google ID token audience mismatch — possible token replay')
      throw new Error('Invalid Google token')
    }

    if (tokenInfo.iss !== 'accounts.google.com' && tokenInfo.iss !== 'https://accounts.google.com') {
      logger.warn({ iss: tokenInfo.iss }, 'Google ID token has an unexpected issuer')
      throw new Error('Invalid Google token')
    }

    if (!tokenInfo.email) {
      throw new Error('Google account has no email on file')
    }

    return {
      sub: tokenInfo.sub,
      email: tokenInfo.email,
      emailVerified: tokenInfo.email_verified === true || tokenInfo.email_verified === 'true',
      name: tokenInfo.name || tokenInfo.email.split('@')[0],
      picture: tokenInfo.picture,
    }
  }
}

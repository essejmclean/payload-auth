/**
 * @module helpers/get-signed-cookie
 *
 * Utilities for verifying and extracting signed cookie values.
 *
 * Signed cookies use HMAC-SHA256 to ensure the cookie value hasn't been tampered with.
 * The signature is appended to the value with a `.` separator.
 */
import { getWebcryptoSubtle } from '@better-auth/utils'
import { parseCookies } from 'better-auth/cookies'
import { type CookiePrefixOptions } from 'better-auth'

/** HMAC-SHA256 algorithm configuration for Web Crypto API */
const algorithm = { name: 'HMAC', hash: 'SHA-256' }

/**
 * Applies cookie prefix to the key name based on security settings.
 *
 * @param key - The base cookie key name
 * @param prefix - Optional prefix type (`'secure'` or `'host'`)
 * @returns The prefixed key, or `undefined` if an invalid prefix is provided
 *
 * @internal
 */
const getCookieKey = (key: string, prefix?: CookiePrefixOptions) => {
  let finalKey = key
  if (prefix) {
    if (prefix === 'secure') {
      finalKey = '__Secure-' + key
    } else if (prefix === 'host') {
      finalKey = '__Host-' + key
    } else {
      return undefined
    }
  }
  return finalKey
}

/**
 * Imports a secret string or buffer as a Web Crypto HMAC key.
 *
 * @param secret - The signing secret as a string or BufferSource
 * @returns A CryptoKey suitable for HMAC verification
 *
 * @internal
 */
const getCryptoKey = async (secret: string | BufferSource) => {
  const secretBuf = typeof secret === 'string' ? new TextEncoder().encode(secret) : secret
  return await getWebcryptoSubtle().importKey('raw', secretBuf, algorithm, false, ['sign', 'verify'])
}

/**
 * Verifies an HMAC-SHA256 signature against a value.
 *
 * @param base64Signature - The base64-encoded signature to verify
 * @param value - The original value that was signed
 * @param secret - The CryptoKey used for verification
 * @returns `true` if the signature is valid, `false` otherwise
 *
 * @internal
 */
const verifySignature = async (base64Signature: string, value: string, secret: CryptoKey): Promise<boolean> => {
  try {
    const signatureBinStr = atob(base64Signature)
    const signature = new Uint8Array(signatureBinStr.length)
    for (let i = 0, len = signatureBinStr.length; i < len; i++) {
      signature[i] = signatureBinStr.charCodeAt(i)
    }
    return await getWebcryptoSubtle().verify(algorithm, secret, signature, new TextEncoder().encode(value))
  } catch (e) {
    return false
  }
}

/**
 * Extracts and verifies a signed cookie value.
 *
 * Signed cookies consist of a value and an HMAC-SHA256 signature separated by a `.`.
 * This function parses the cookie string, finds the specified cookie, verifies its
 * signature, and returns the original value if valid.
 *
 * **Cookie format:** `value.base64signature`
 *
 * The signature is expected to be exactly 44 characters (base64-encoded 32-byte HMAC)
 * and end with `=` (base64 padding).
 *
 * @param cookies - The raw cookie header string (e.g., from `req.headers.get('cookie')`)
 * @param key - The cookie key name to look for
 * @param secret - The signing secret used to verify the signature
 * @param prefix - Optional cookie prefix (`'secure'` adds `__Secure-`, `'host'` adds `__Host-`)
 * @returns The verified cookie value if valid, `false` if signature verification fails,
 *          or `null` if the cookie doesn't exist or has an invalid format
 *
 * @example Basic usage
 * ```ts
 * const sessionToken = await getSignedCookie(
 *   req.headers.get('cookie') ?? '',
 *   'better-auth.session_token',
 *   process.env.BETTER_AUTH_SECRET!
 * )
 *
 * if (sessionToken) {
 *   // Token is verified and safe to use
 *   console.log('Session token:', sessionToken)
 * } else if (sessionToken === false) {
 *   // Signature verification failed - possible tampering
 *   console.error('Invalid signature')
 * } else {
 *   // Cookie not found
 *   console.log('No session cookie')
 * }
 * ```
 *
 * @example With secure prefix
 * ```ts
 * // For cookies set with __Secure- prefix
 * const token = await getSignedCookie(cookies, 'session', secret, 'secure')
 * // Looks for cookie named '__Secure-session'
 * ```
 */
export async function getSignedCookie(cookies: string, key: string, secret: string, prefix?: CookiePrefixOptions) {
  const parsedCookies = cookies ? parseCookies(cookies) : undefined

  const finalKey = getCookieKey(key, prefix)
  if (!finalKey) {
    return null
  }
  const value = parsedCookies?.get(finalKey)
  if (!value) {
    return null
  }
  const signatureStartPos = value.lastIndexOf('.')
  if (signatureStartPos < 1) {
    return null
  }
  const signedValue = value.substring(0, signatureStartPos)
  const signature = value.substring(signatureStartPos + 1)
  if (signature.length !== 44 || !signature.endsWith('=')) {
    return null
  }
  const secretKey = await getCryptoKey(secret)
  const isVerified = await verifySignature(signature, signedValue, secretKey)
  return isVerified ? signedValue : false
}

/**
 * @module helpers/get-ip
 *
 * Extracts client IP address from request headers.
 */
import type { BetterAuthOptions } from 'better-auth'

/**
 * Extracts the client's IP address from request headers.
 *
 * This function checks multiple headers commonly used by proxies and CDNs to forward
 * the original client IP address. It respects Better Auth's IP tracking configuration
 * and returns `null` if tracking is disabled.
 *
 * **Header priority (default):**
 * 1. `x-client-ip`
 * 2. `x-forwarded-for` (uses first IP if comma-separated)
 * 3. `cf-connecting-ip` (Cloudflare)
 * 4. `fastly-client-ip` (Fastly)
 * 5. `x-real-ip` (nginx)
 * 6. `x-cluster-client-ip`
 * 7. `x-forwarded`
 * 8. `forwarded-for`
 * 9. `forwarded`
 *
 * In development/test environments, always returns `'127.0.0.1'` for consistency.
 *
 * @param headers - The request Headers object
 * @param options - Better Auth options (used to check IP tracking config)
 * @returns The client IP address string, or `null` if not found or tracking is disabled
 *
 * @example Basic usage
 * ```ts
 * const ip = getIp(req.headers, betterAuthOptions)
 * if (ip) {
 *   console.log('Client IP:', ip)
 * }
 * ```
 *
 * @example With custom IP headers
 * ```ts
 * // In Better Auth options:
 * {
 *   advanced: {
 *     ipAddress: {
 *       ipAddressHeaders: ['x-real-ip', 'x-forwarded-for']
 *     }
 *   }
 * }
 * ```
 *
 * @example Disabling IP tracking
 * ```ts
 * // In Better Auth options:
 * {
 *   advanced: {
 *     ipAddress: {
 *       disableIpTracking: true
 *     }
 *   }
 * }
 * // getIp() will return null
 * ```
 */
export function getIp(headers: Headers, options: BetterAuthOptions): string | null {
  if (options.advanced?.ipAddress?.disableIpTracking) {
    return null
  }
  const testIP = '127.0.0.1'
  if ((process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') ?? false) {
    return testIP
  }
  const ipHeaders = options.advanced?.ipAddress?.ipAddressHeaders
  const keys = ipHeaders || [
    'x-client-ip',
    'x-forwarded-for',
    'cf-connecting-ip',
    'fastly-client-ip',
    'x-real-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ]
  for (const key of keys) {
    const value = headers.get(key)
    if (typeof value === 'string') {
      const ip = value.split(',')[0]?.trim()
      if (ip) return ip
    }
  }
  return null
}

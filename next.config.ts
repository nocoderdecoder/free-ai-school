import type { NextConfig } from "next";

function originFromUrl(value: string | undefined) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

const supabaseOrigin = originFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
const aiPathFormSources = [
  "'self'",
  'https://accounts.google.com',
  supabaseOrigin,
].filter(Boolean).join(' ')
const aiPathConnectSources = [
  "'self'",
  'https://api.openai.com',
  supabaseOrigin,
].filter(Boolean).join(' ')

const aiPathContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `form-action ${aiPathFormSources}`,
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  `connect-src ${aiPathConnectSources}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join('; ')

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  experimental: {
    viewTransition: true,
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self), payment=(), usb=()' },
        { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      ],
    }, {
      source: '/ai-path/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: aiPathContentSecurityPolicy },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      ],
    }]
  },
};

export default nextConfig;

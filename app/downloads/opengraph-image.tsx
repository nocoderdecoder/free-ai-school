import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Free AI Guides — anshul.ai'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: '#0a0a0a',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          }}
        />
        {/* Decorative gradient blob */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.05) 60%, transparent 100%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Icon */}
          <div
            style={{
              fontSize: '64px',
              lineHeight: 1,
            }}
          >
            📄
          </div>

          <div
            style={{
              fontSize: '68px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: 1.1,
            }}
          >
            Free AI Guides
          </div>
          <div
            style={{
              fontSize: '26px',
              color: 'rgba(255,255,255,0.6)',
              letterSpacing: '-0.3px',
            }}
          >
            25 practical guides for business professionals
          </div>
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            left: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '2px',
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            }}
          />
          <div
            style={{
              fontSize: '20px',
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.5px',
            }}
          >
            anshul.ai/downloads
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}

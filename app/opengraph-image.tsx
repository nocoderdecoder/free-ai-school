import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Anshul Gupta — AI Strategy & GTM Leader'
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
        {/* Purple/indigo gradient accent bar */}
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
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.05) 60%, transparent 100%)',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: 1.1,
            }}
          >
            Anshul Gupta
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '-0.5px',
            }}
          >
            AI Strategy &amp; GTM Leader
          </div>
          <div
            style={{
              fontSize: '22px',
              color: 'rgba(255,255,255,0.4)',
              marginTop: '8px',
            }}
          >
            Building AI tools for business professionals
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
            anshul.ai
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}

import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 100,
            fontWeight: 800,
            fontFamily: 'sans-serif',
            letterSpacing: '-3px',
            lineHeight: 1,
          }}
        >
          A
        </div>
      </div>
    ),
    { width: 180, height: 180 }
  )
}

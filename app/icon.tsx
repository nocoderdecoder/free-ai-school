import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize: 18,
            fontWeight: 800,
            fontFamily: 'sans-serif',
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}
        >
          A
        </div>
      </div>
    ),
    { width: 32, height: 32 }
  )
}

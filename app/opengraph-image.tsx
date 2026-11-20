import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Anshul Gupta | GTM Strategy and Applied AI'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center',
      width: '100%', height: '100%', background: '#fbfbfa', padding: '80px', color: '#1b2722' }}>
      <div style={{ display: 'flex', fontSize: 28, color: '#315b47', marginBottom: 28 }}>anshul.ai</div>
      <div style={{ display: 'flex', fontSize: 72, fontWeight: 600, marginBottom: 24 }}>Anshul Gupta</div>
      <div style={{ display: 'flex', fontSize: 40, maxWidth: 900, lineHeight: 1.3 }}>Go-to-market strategy and applied AI</div>
      <div style={{ display: 'flex', fontSize: 24, color: '#58635c', marginTop: 36 }}>Google · Previously Unilever and GSK · Kellogg MBA</div>
    </div>,
    size
  )
}

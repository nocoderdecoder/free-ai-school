import { renderToBuffer } from '@react-pdf/renderer'
import { GUIDES } from '@/app/lib/pdf/content'
import { PdfDocument } from '@/app/lib/pdf/PdfTemplate'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const guide = GUIDES[slug]
  if (!guide) {
    return Response.json({ error: 'Guide not found' }, { status: 404 })
  }

  try {
    const buffer = await renderToBuffer(<PdfDocument {...guide} />)
    // Convert Node.js Buffer to ArrayBuffer for the Web Response API
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${slug}.pdf"`,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    console.error('[pdf/route] renderToBuffer failed:', error)
    return Response.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from 'next-sanity'
import { GUIDES } from '@/app/lib/pdf/content'
import { PdfDocument } from '@/app/lib/pdf/PdfTemplate'
import { sanityGuideToPdfGuide } from '@/app/lib/pdf/fromSanity'

export const runtime = 'nodejs'

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Prefer the Sanity-managed guide if one exists for this slug; fall back to
  // the hardcoded content.ts map so existing PDF downloads never break while
  // the migration to Sanity is in progress (see scripts/migrate-pdf-guides.ts).
  let guide = null
  try {
    const sanityDoc = await client.fetch(
      `*[_type == "pdfGuide" && slug.current == $slug][0] { title, subtitle, category, sections }`,
      { slug }
    )
    if (sanityDoc) guide = sanityGuideToPdfGuide(sanityDoc)
  } catch (error) {
    console.error('[pdf/route] Sanity fetch failed, falling back to content.ts:', error)
  }

  if (!guide) {
    guide = GUIDES[slug]
  }

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
    const msg = error instanceof Error ? error.stack || error.message : String(error)
    return Response.json({ error: 'Failed to generate PDF', detail: msg }, { status: 500 })
  }
}

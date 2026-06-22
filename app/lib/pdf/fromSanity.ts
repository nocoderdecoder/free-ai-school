/**
 * Converts a `pdfGuide` Sanity document (see sanity/schemaTypes/pdfGuide.js)
 * back into the `Guide` shape that `PdfDocument` (PdfTemplate.tsx) expects.
 * This is the inverse of the section conversion in
 * scripts/migrate-pdf-guides.ts.
 */
import type { PdfSection } from './PdfTemplate'

type SanityPdfGuide = {
  title: string
  subtitle?: string
  category: string
  sections?: Array<Record<string, any> & { _type: string }>
}

type Guide = {
  title: string
  subtitle: string
  category: string
  sections: PdfSection[]
}

function convertSanitySection(section: Record<string, any> & { _type: string }): PdfSection | null {
  switch (section._type) {
    case 'tableSection':
      return {
        type: 'table',
        heading: section.heading,
        columns: section.columns ?? [],
        rows: (section.rows ?? []).map((row: any) => row.cells ?? []),
      }
    case 'gridSection':
      return {
        type: 'grid',
        heading: section.heading,
        cells: (section.cells ?? []).map((c: any) => ({
          label: c.label,
          value: c.value,
          color: c.color,
        })),
      }
    case 'ratingsSection':
      return {
        type: 'ratings',
        heading: section.heading,
        items: (section.items ?? []).map((i: any) => ({
          label: i.label,
          score: i.score,
          max: i.max,
          note: i.note,
        })),
      }
    case 'flowSection':
      return {
        type: 'flow',
        heading: section.heading,
        steps: (section.steps ?? []).map((s: any) => ({
          label: s.label,
          description: s.description,
        })),
      }
    case 'calloutSection':
      return {
        type: 'callout',
        text: section.text,
        style: section.style,
      }
    case 'bulletsSection':
      return {
        type: 'bullets',
        heading: section.heading,
        bullets: section.bullets ?? [],
      }
    default:
      return null
  }
}

export function sanityGuideToPdfGuide(doc: SanityPdfGuide): Guide {
  const sections = (doc.sections ?? [])
    .map(convertSanitySection)
    .filter((s): s is PdfSection => s !== null)

  return {
    title: doc.title,
    subtitle: doc.subtitle ?? '',
    category: doc.category,
    sections,
  }
}

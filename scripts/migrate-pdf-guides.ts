/**
 * migrate-pdf-guides.ts
 *
 * One-off migration: reads the hardcoded GUIDES map from
 * app/lib/pdf/content.ts and creates a corresponding `pdfGuide` Sanity
 * document for each guide. Safe to re-run — uses createOrReplace keyed by a
 * deterministic _id, so running it again just re-syncs the content.
 *
 * Usage (from the project root — requires tsx to import the .ts source):
 *   npx tsx scripts/migrate-pdf-guides.ts            Migrate all 27 guides
 *   npx tsx scripts/migrate-pdf-guides.ts --dry-run   Preview without writing
 *   npx tsx scripts/migrate-pdf-guides.ts --slug chatgpt-quick-reference
 *
 * Requires SANITY_WRITE_TOKEN in .env.local (same token used by
 * publish-article.mjs — an Editor token, not a deploy token).
 *
 * Note: this file must stay a .ts file (not .mjs) — tsx's loader hooks only
 * apply to the entry file's static imports when the entry itself is .ts.
 */

import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { GUIDES } from '../app/lib/pdf/content'

const PROJECT_ID = '8w4exnl4'
const DATASET = 'production'
const API_VERSION = '2024-01-01'

// ─── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const flags: Record<string, string | boolean> = {}
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    const key = args[i].slice(2)
    flags[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true
  }
}

const DRY_RUN = Boolean(flags['dry-run'])

// ─── Load .env.local (Next.js style) ─────────────────────────────────────────

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
  }
}

const token = process.env.SANITY_WRITE_TOKEN
if (!token && !DRY_RUN) {
  console.error(`
❌  Missing SANITY_WRITE_TOKEN

Add it to .env.local:
  SANITY_WRITE_TOKEN=sk...

Get a token at: https://www.sanity.io/manage → your project → API → Tokens
Create an "Editor" token (can write documents, not deploy schema).
  `)
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  token: token || 'dry-run',
  useCdn: false,
})

// ─── Section conversion: PdfSection (content.ts shape) → pdfGuide Sanity shape ──
// Tables in content.ts are `string[][]` rows; the Sanity schema models each row
// as `{ cells: string[] }` since Sanity arrays-of-arrays aren't supported.

function randomKey() {
  return Math.random().toString(36).slice(2, 10)
}

function convertSection(section: any): Record<string, any> {
  const type = section.type || 'bullets' // legacy { heading, bullets } shape has no `type`

  switch (type) {
    case 'table':
      return {
        _type: 'tableSection',
        _key: randomKey(),
        heading: section.heading,
        columns: section.columns,
        rows: section.rows.map((cells: string[]) => ({ _key: randomKey(), cells })),
      }
    case 'grid':
      return {
        _type: 'gridSection',
        _key: randomKey(),
        heading: section.heading,
        cells: section.cells.map((c: any) => ({ _key: randomKey(), ...c })),
      }
    case 'ratings':
      return {
        _type: 'ratingsSection',
        _key: randomKey(),
        heading: section.heading,
        items: section.items.map((i: any) => ({ _key: randomKey(), ...i })),
      }
    case 'flow':
      return {
        _type: 'flowSection',
        _key: randomKey(),
        heading: section.heading,
        steps: section.steps.map((s: any) => ({ _key: randomKey(), ...s })),
      }
    case 'callout':
      return {
        _type: 'calloutSection',
        _key: randomKey(),
        text: section.text,
        style: section.style || 'tip',
      }
    case 'bullets':
    default:
      return {
        _type: 'bulletsSection',
        _key: randomKey(),
        heading: section.heading,
        bullets: section.bullets,
      }
  }
}

// ─── Build + publish one guide ────────────────────────────────────────────────

async function migrateGuide(slug: string, guide: any) {
  const doc = {
    _type: 'pdfGuide',
    _id: `pdfGuide-${slug}`,
    title: guide.title,
    slug: { _type: 'slug', current: slug },
    subtitle: guide.subtitle,
    category: guide.category,
    sections: guide.sections.map(convertSection),
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] Would migrate: "${guide.title}" (${slug}) → ${doc.sections.length} sections`)
    return
  }

  await client.createOrReplace(doc)
  console.log(`  ✅  Migrated: "${guide.title}" (${slug})`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const allSlugs = Object.keys(GUIDES)
  const slugSet: Record<string, any> = GUIDES
  const slugs = flags.slug ? [String(flags.slug)] : allSlugs

  if (flags.slug && !slugSet[String(flags.slug)]) {
    console.error(`Unknown slug: ${flags.slug}`)
    process.exit(1)
  }

  console.log(`\n${DRY_RUN ? '🔍 DRY RUN — ' : ''}Migrating ${slugs.length} PDF guide(s) to Sanity...\n`)

  let ok = 0
  let fail = 0
  for (const slug of slugs) {
    try {
      await migrateGuide(slug, slugSet[slug])
      ok++
    } catch (err: any) {
      console.error(`  ❌  Error on ${slug}: ${err.message}`)
      fail++
    }
  }

  console.log(`\n${ok} migrated, ${fail} failed.\n`)
}

main()

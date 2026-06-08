import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

export type PdfSection =
  | { type: 'bullets'; heading: string; bullets: string[] }
  | { type: 'table'; heading: string; columns: string[]; rows: string[][] }
  | {
      type: 'grid'
      heading: string
      cells: Array<{ label: string; value: string; color?: string }>
    }
  | {
      type: 'ratings'
      heading: string
      items: Array<{ label: string; score: number; max: number; note: string }>
    }
  | {
      type: 'flow'
      heading: string
      steps: Array<{ label: string; description: string }>
    }
  | { type: 'callout'; text: string; style?: 'info' | 'tip' | 'warning' }

// Backward-compat: old guides use `{ heading, bullets }` with no `type`.
type LegacySection = { heading: string; bullets: string[] }
type AnySection = PdfSection | LegacySection

export type PdfDocProps = {
  title: string
  subtitle: string
  category: string
  sections: AnySection[]
}

const COLORS = {
  bg: '#ffffff',
  text: '#1a1a1a',
  accent: '#10b981',
  secondary: '#64748b',
  border: '#e2e8f0',
  highlight: '#f0fdf4',
  rowAlt: '#f8fafc',
  white: '#ffffff',
  // Callout tints
  infoBg: '#eff6ff',
  infoBar: '#3b82f6',
  tipBg: '#f0fdf4',
  tipBar: '#10b981',
  warnBg: '#fffbeb',
  warnBar: '#f59e0b',
}

// Header height: content ~17pt + marginBottom 28pt = 45pt
// Page paddingTop must be > 45 so fixed header doesn't overlap content on page 2.
// We use 80pt: 36pt breathing room above header + ~44pt for header height.
const PAGE_H_PAD = 44
const PAGE_V_PAD_TOP = 80   // must be ≥ header height (content+margin)
const PAGE_V_PAD_BOT = 52   // space for footer

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    paddingTop: PAGE_V_PAD_TOP,
    paddingBottom: PAGE_V_PAD_BOT,
    paddingLeft: PAGE_H_PAD,
    paddingRight: PAGE_H_PAD,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
  },

  // ── Fixed header (renders on every page) ──────────────────────────────────
  header: {
    position: 'absolute',
    top: 24,
    left: PAGE_H_PAD,
    right: PAGE_H_PAD,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: COLORS.text,
  },
  pill: {
    backgroundColor: COLORS.accent,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 99,
  },

  // ── Title block ───────────────────────────────────────────────────────────
  titleBlock: {
    marginBottom: 22,
    paddingBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 20,
    lineHeight: 1.25,
    marginBottom: 8,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.secondary,
    lineHeight: 1.5,
  },

  // ── Shared section wrapper ────────────────────────────────────────────────
  section: {
    marginBottom: 18,
  },
  sectionHeading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: COLORS.accent,
    marginBottom: 8,
  },

  // ── Bullets ───────────────────────────────────────────────────────────────
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bulletMark: {
    width: 12,
    color: COLORS.accent,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    color: COLORS.text,
    lineHeight: 1.5,
    fontSize: 10,
  },

  // ── Table ─────────────────────────────────────────────────────────────────
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 3,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
  },
  tableHeaderCell: {
    flex: 1,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 8,
    paddingRight: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: '#0ea572',
  },
  tableHeaderCellLast: {
    flex: 1,
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 8,
    paddingRight: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: COLORS.white,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  tableCell: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    fontSize: 9,
    color: COLORS.text,
    lineHeight: 1.4,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  tableCellLast: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    fontSize: 9,
    color: COLORS.text,
    lineHeight: 1.4,
  },
  tableCellBold: {
    fontFamily: 'Helvetica-Bold',
    color: COLORS.text,
  },

  // ── Grid (3-column cards, NO negative margins) ────────────────────────────
  gridRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  gridCard: {
    flex: 1,
    marginRight: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 10,
  },
  gridCardLast: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 10,
  },
  gridLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  gridLabel: {
    fontSize: 8,
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: 'Helvetica-Bold',
  },
  gridValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 1.3,
  },

  // ── Ratings ───────────────────────────────────────────────────────────────
  ratingItem: {
    marginBottom: 10,
  },
  ratingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  ratingLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: COLORS.text,
  },
  ratingScore: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: COLORS.accent,
  },
  ratingBarBg: {
    height: 7,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 3,
  },
  ratingBarFill: {
    height: 7,
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  ratingNote: {
    fontSize: 8,
    color: COLORS.secondary,
  },

  // ── Flow ──────────────────────────────────────────────────────────────────
  flowStep: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  flowLeft: {
    width: 28,
    alignItems: 'center',
  },
  flowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowNumber: {
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
  },
  flowConnector: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.border,
    marginTop: 2,
    marginBottom: 2,
    marginLeft: 9,
  },
  flowBody: {
    flex: 1,
    paddingLeft: 6,
    paddingBottom: 10,
  },
  flowLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: COLORS.text,
    marginBottom: 2,
    marginTop: 2,
  },
  flowDesc: {
    fontSize: 9,
    color: COLORS.secondary,
    lineHeight: 1.4,
  },

  // ── Callout ───────────────────────────────────────────────────────────────
  calloutWrap: {
    flexDirection: 'row',
    borderRadius: 4,
    marginBottom: 4,
  },
  calloutBar: {
    width: 4,
    borderRadius: 2,
  },
  calloutBody: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
  },
  calloutText: {
    fontSize: 10,
    color: COLORS.text,
    lineHeight: 1.5,
  },

  // ── Fixed footer ──────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 20,
    left: PAGE_H_PAD,
    right: PAGE_H_PAD,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: COLORS.secondary,
  },
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeSection(s: AnySection): PdfSection {
  if (!('type' in s) || !s.type) {
    const legacy = s as LegacySection
    return { type: 'bullets', heading: legacy.heading, bullets: legacy.bullets }
  }
  return s as PdfSection
}

// Split cells into rows of 3 for the grid
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ── Section renderers ─────────────────────────────────────────────────────────

function Bullets({ heading, bullets }: { heading: string; bullets: string[] }) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {bullets.map((bullet, j) => (
        <View key={j} style={styles.bulletRow} wrap={false}>
          <Text style={styles.bulletMark}>•</Text>
          <Text style={styles.bulletText}>{bullet}</Text>
        </View>
      ))}
    </View>
  )
}

function Table({
  heading,
  columns,
  rows,
}: {
  heading: string
  columns: string[]
  rows: string[][]
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      <View style={styles.table}>
        {/* Header row — fixed so it repeats if table spans pages */}
        <View style={styles.tableHeaderRow} fixed>
          {columns.map((col, i) => (
            <Text
              key={i}
              style={
                i === columns.length - 1
                  ? styles.tableHeaderCellLast
                  : styles.tableHeaderCell
              }
            >
              {col}
            </Text>
          ))}
        </View>
        {rows.map((row, r) => (
          <View
            key={r}
            style={[
              styles.tableRow,
              { backgroundColor: r % 2 === 0 ? COLORS.white : COLORS.rowAlt },
            ]}
            wrap={false}
          >
            {row.map((cell, c) => (
              <Text
                key={c}
                style={[
                  c === row.length - 1 ? styles.tableCellLast : styles.tableCell,
                  ...(c === 0 ? [styles.tableCellBold] : []),
                ]}
              >
                {cell}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

function Grid({
  heading,
  cells,
}: {
  heading: string
  cells: Array<{ label: string; value: string; color?: string }>
}) {
  const rows = chunk(cells, 3)
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.gridRow}>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={ci === row.length - 1 ? styles.gridCardLast : styles.gridCard}
            >
              <View style={styles.gridLabelRow}>
                {cell.color ? (
                  <View style={[styles.gridDot, { backgroundColor: cell.color }]} />
                ) : null}
                <Text style={styles.gridLabel}>{cell.label}</Text>
              </View>
              <Text style={styles.gridValue}>{cell.value}</Text>
            </View>
          ))}
          {/* Pad short rows so flex distributes correctly */}
          {row.length === 2 && <View style={{ flex: 1 }} />}
          {row.length === 1 && (
            <>
              <View style={{ flex: 1 }} />
              <View style={{ flex: 1 }} />
            </>
          )}
        </View>
      ))}
    </View>
  )
}

function Ratings({
  heading,
  items,
}: {
  heading: string
  items: Array<{ label: string; score: number; max: number; note: string }>
}) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {items.map((item, i) => {
        const pct = Math.max(0, Math.min(1, item.score / item.max))
        return (
          <View key={i} style={styles.ratingItem} wrap={false}>
            <View style={styles.ratingTopRow}>
              <Text style={styles.ratingLabel}>{item.label}</Text>
              <Text style={styles.ratingScore}>
                {item.score}/{item.max}
              </Text>
            </View>
            <View style={styles.ratingBarBg}>
              <View style={[styles.ratingBarFill, { width: `${pct * 100}%` }]} />
            </View>
            <Text style={styles.ratingNote}>{item.note}</Text>
          </View>
        )
      })}
    </View>
  )
}

function Flow({
  heading,
  steps,
}: {
  heading: string
  steps: Array<{ label: string; description: string }>
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <View key={i} wrap={false}>
            <View style={styles.flowStep}>
              <View style={styles.flowLeft}>
                <View style={styles.flowCircle}>
                  <Text style={styles.flowNumber}>{i + 1}</Text>
                </View>
              </View>
              <View style={styles.flowBody}>
                <Text style={styles.flowLabel}>{step.label}</Text>
                <Text style={styles.flowDesc}>{step.description}</Text>
              </View>
            </View>
            {!isLast && (
              <View style={styles.flowConnector} />
            )}
          </View>
        )
      })}
    </View>
  )
}

function Callout({
  text,
  style,
}: {
  text: string
  style?: 'info' | 'tip' | 'warning'
}) {
  const variant =
    style === 'info'
      ? { bg: COLORS.infoBg, bar: COLORS.infoBar }
      : style === 'warning'
        ? { bg: COLORS.warnBg, bar: COLORS.warnBar }
        : { bg: COLORS.tipBg, bar: COLORS.tipBar }
  return (
    <View style={styles.section} wrap={false}>
      <View style={[styles.calloutWrap, { backgroundColor: variant.bg }]}>
        <View style={[styles.calloutBar, { backgroundColor: variant.bar }]} />
        <View style={styles.calloutBody}>
          <Text style={styles.calloutText}>{text}</Text>
        </View>
      </View>
    </View>
  )
}

function renderSection(section: PdfSection, key: number) {
  switch (section.type) {
    case 'table':
      return (
        <Table
          key={key}
          heading={section.heading}
          columns={section.columns}
          rows={section.rows}
        />
      )
    case 'grid':
      return <Grid key={key} heading={section.heading} cells={section.cells} />
    case 'ratings':
      return (
        <Ratings key={key} heading={section.heading} items={section.items} />
      )
    case 'flow':
      return <Flow key={key} heading={section.heading} steps={section.steps} />
    case 'callout':
      return <Callout key={key} text={section.text} style={section.style} />
    case 'bullets':
    default:
      return (
        <Bullets
          key={key}
          heading={section.heading}
          bullets={section.bullets}
        />
      )
  }
}

// ── Main document ──────────────────────────────────────────────────────────────

export function PdfDocument({ title, subtitle, category, sections }: PdfDocProps) {
  const normalized = sections.map(normalizeSection)
  return (
    <Document title={title} author="anshul.ai" subject={category}>
      <Page size="A4" style={styles.page} wrap>
        {/* Fixed header — absolute-positioned so it never disrupts content flow */}
        <View style={styles.header} fixed>
          <Text style={styles.brand}>anshul.ai</Text>
          <Text style={styles.pill}>{category}</Text>
        </View>

        {/* Title block — never split across pages */}
        <View style={styles.titleBlock} wrap={false}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {normalized.map((section, i) => renderSection(section, i))}

        {/* Fixed footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Free AI School — anshul.ai</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}

export default PdfDocument

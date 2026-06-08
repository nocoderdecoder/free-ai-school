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

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    paddingTop: 36,
    paddingBottom: 36,
    paddingLeft: 44,
    paddingRight: 44,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  brand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: COLORS.text,
  },
  pill: {
    backgroundColor: COLORS.accent,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 999,
  },
  titleBlock: {
    marginBottom: 26,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 26,
    lineHeight: 1.15,
    marginBottom: 10,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    lineHeight: 1.5,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: COLORS.accent,
    marginBottom: 10,
  },

  // Bullets
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingRight: 8,
  },
  bulletMark: {
    width: 12,
    color: COLORS.accent,
    fontFamily: 'Helvetica-Bold',
  },
  bulletText: {
    flex: 1,
    color: COLORS.text,
    lineHeight: 1.5,
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.accent,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: COLORS.white,
  },
  tableCell: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    color: COLORS.text,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  tableCellLast: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    color: COLORS.text,
  },

  // Grid
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  gridCard: {
    width: '33.333%',
    padding: 4,
  },
  gridCardInner: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 10,
    height: '100%',
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
    fontSize: 9,
    color: COLORS.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: COLORS.text,
    lineHeight: 1.3,
  },

  // Ratings
  ratingItem: {
    marginBottom: 12,
  },
  ratingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: COLORS.text,
  },
  ratingScore: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: COLORS.accent,
  },
  ratingBarBg: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 3,
  },
  ratingBarFill: {
    height: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  ratingNote: {
    fontSize: 9,
    color: COLORS.secondary,
  },

  // Flow
  flowStep: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  flowLeft: {
    width: 30,
    alignItems: 'center',
  },
  flowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowNumber: {
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
  },
  flowConnector: {
    width: 2,
    flexGrow: 1,
    backgroundColor: COLORS.accent,
    marginTop: 2,
    marginBottom: 2,
  },
  flowBody: {
    flex: 1,
    paddingBottom: 12,
    paddingLeft: 4,
  },
  flowLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: COLORS.text,
    marginBottom: 2,
  },
  flowDesc: {
    fontSize: 10,
    color: COLORS.secondary,
    lineHeight: 1.4,
  },

  // Callout
  callout: {
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  calloutBar: {
    width: 4,
  },
  calloutBody: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
  },
  calloutText: {
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 1.5,
  },

  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 9,
    color: COLORS.secondary,
  },
})

function normalizeSection(s: AnySection): PdfSection {
  if (!('type' in s) || !s.type) {
    const legacy = s as LegacySection
    return { type: 'bullets', heading: legacy.heading, bullets: legacy.bullets }
  }
  return s as PdfSection
}

function Bullets({ heading, bullets }: { heading: string; bullets: string[] }) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {bullets.map((bullet, j) => (
        <View key={j} style={styles.bulletRow}>
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
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          {columns.map((col, i) => (
            <Text key={i} style={styles.tableHeaderCell}>
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
          >
            {row.map((cell, c) => (
              <Text
                key={c}
                style={
                  c === row.length - 1 ? styles.tableCellLast : styles.tableCell
                }
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
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      <View style={styles.gridWrap}>
        {cells.map((cell, i) => (
          <View key={i} style={styles.gridCard}>
            <View style={styles.gridCardInner}>
              <View style={styles.gridLabelRow}>
                {cell.color ? (
                  <View
                    style={[styles.gridDot, { backgroundColor: cell.color }]}
                  />
                ) : null}
                <Text style={styles.gridLabel}>{cell.label}</Text>
              </View>
              <Text style={styles.gridValue}>{cell.value}</Text>
            </View>
          </View>
        ))}
      </View>
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
          <View key={i} style={styles.ratingItem}>
            <View style={styles.ratingTopRow}>
              <Text style={styles.ratingLabel}>{item.label}</Text>
              <Text style={styles.ratingScore}>
                {item.score}/{item.max}
              </Text>
            </View>
            <View style={styles.ratingBarBg}>
              <View
                style={[
                  styles.ratingBarFill,
                  { width: `${pct * 100}%` },
                ]}
              />
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
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1
        return (
          <View key={i} style={styles.flowStep}>
            <View style={styles.flowLeft}>
              <View style={styles.flowCircle}>
                <Text style={styles.flowNumber}>{i + 1}</Text>
              </View>
              {!isLast ? <View style={styles.flowConnector} /> : null}
            </View>
            <View style={styles.flowBody}>
              <Text style={styles.flowLabel}>{step.label}</Text>
              <Text style={styles.flowDesc}>{step.description}</Text>
            </View>
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
      <View style={[styles.callout, { backgroundColor: variant.bg }]}>
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

export function PdfDocument({ title, subtitle, category, sections }: PdfDocProps) {
  const normalized = sections.map(normalizeSection)
  return (
    <Document title={title} author="anshul.ai" subject={category}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <Text style={styles.brand}>anshul.ai</Text>
          <Text style={styles.pill}>{category}</Text>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {normalized.map((section, i) => renderSection(section, i))}

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

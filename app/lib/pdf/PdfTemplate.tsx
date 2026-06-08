import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'

export type PdfSection = {
  heading: string
  bullets: string[]
}

export type PdfDocProps = {
  title: string
  subtitle: string
  category: string
  sections: PdfSection[]
}

const COLORS = {
  bg: '#ffffff',
  text: '#111111',
  muted: '#6b7280',
  accent: '#10b981',
  accentSoft: '#ecfdf5',
  border: '#e5e7eb',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: 'Helvetica',
    fontSize: 11,
    lineHeight: 1.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  brand: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: COLORS.text,
  },
  pill: {
    backgroundColor: COLORS.accentSoft,
    color: COLORS.accent,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  titleBlock: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 28,
    lineHeight: 1.15,
    marginBottom: 12,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 1.5,
  },
  section: {
    marginBottom: 22,
  },
  sectionHeading: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: COLORS.accent,
    marginBottom: 10,
  },
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
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 9,
    color: COLORS.muted,
  },
})

export function PdfDocument({ title, subtitle, category, sections }: PdfDocProps) {
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

        {sections.map((section, i) => (
          <View key={i} style={styles.section} wrap={false}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            {section.bullets.map((bullet, j) => (
              <View key={j} style={styles.bulletRow}>
                <Text style={styles.bulletMark}>•</Text>
                <Text style={styles.bulletText}>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}

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

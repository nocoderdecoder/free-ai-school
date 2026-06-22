// pdfGuide: structured content for the downloadable PDF guides, migrated from
// the hardcoded GUIDES map in app/lib/pdf/content.ts. Each `sections` entry is
// one of the typed variants PdfTemplate.tsx renders (bullets, table, grid,
// ratings, flow, callout) — mirrored here as a Sanity array of named objects
// so editors can manage guide content without a code deploy.
const bulletsSection = {
  name: 'bulletsSection',
  title: 'Bullets',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Heading', type: 'string', validation: Rule => Rule.required() },
    { name: 'bullets', title: 'Bullets', type: 'array', of: [{ type: 'string' }] },
  ],
  preview: { select: { title: 'heading' }, prepare: ({ title }) => ({ title: `Bullets: ${title}` }) },
}

const tableSection = {
  name: 'tableSection',
  title: 'Table',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Heading', type: 'string', validation: Rule => Rule.required() },
    { name: 'columns', title: 'Columns', type: 'array', of: [{ type: 'string' }] },
    {
      name: 'rows',
      title: 'Rows',
      type: 'array',
      of: [{ type: 'object', name: 'row', fields: [{ name: 'cells', title: 'Cells', type: 'array', of: [{ type: 'string' }] }] }],
    },
  ],
  preview: { select: { title: 'heading' }, prepare: ({ title }) => ({ title: `Table: ${title}` }) },
}

const gridSection = {
  name: 'gridSection',
  title: 'Grid',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Heading', type: 'string', validation: Rule => Rule.required() },
    {
      name: 'cells',
      title: 'Cells',
      type: 'array',
      of: [{
        type: 'object',
        name: 'cell',
        fields: [
          { name: 'label', title: 'Label', type: 'string' },
          { name: 'value', title: 'Value', type: 'string' },
          { name: 'color', title: 'Color (hex)', type: 'string' },
        ],
      }],
    },
  ],
  preview: { select: { title: 'heading' }, prepare: ({ title }) => ({ title: `Grid: ${title}` }) },
}

const ratingsSection = {
  name: 'ratingsSection',
  title: 'Ratings',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Heading', type: 'string', validation: Rule => Rule.required() },
    {
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{
        type: 'object',
        name: 'ratingItem',
        fields: [
          { name: 'label', title: 'Label', type: 'string' },
          { name: 'score', title: 'Score', type: 'number' },
          { name: 'max', title: 'Max', type: 'number', initialValue: 10 },
          { name: 'note', title: 'Note', type: 'string' },
        ],
      }],
    },
  ],
  preview: { select: { title: 'heading' }, prepare: ({ title }) => ({ title: `Ratings: ${title}` }) },
}

const flowSection = {
  name: 'flowSection',
  title: 'Flow',
  type: 'object',
  fields: [
    { name: 'heading', title: 'Heading', type: 'string', validation: Rule => Rule.required() },
    {
      name: 'steps',
      title: 'Steps',
      type: 'array',
      of: [{
        type: 'object',
        name: 'flowStep',
        fields: [
          { name: 'label', title: 'Label', type: 'string' },
          { name: 'description', title: 'Description', type: 'text', rows: 2 },
        ],
      }],
    },
  ],
  preview: { select: { title: 'heading' }, prepare: ({ title }) => ({ title: `Flow: ${title}` }) },
}

const calloutSection = {
  name: 'calloutSection',
  title: 'Callout',
  type: 'object',
  fields: [
    { name: 'text', title: 'Text', type: 'text', rows: 3, validation: Rule => Rule.required() },
    {
      name: 'style',
      title: 'Style',
      type: 'string',
      options: { list: ['info', 'tip', 'warning'] },
      initialValue: 'tip',
    },
  ],
  preview: { select: { title: 'text' }, prepare: ({ title }) => ({ title: `Callout: ${title}` }) },
}

export const pdfGuideObjectTypes = [
  bulletsSection,
  tableSection,
  gridSection,
  ratingsSection,
  flowSection,
  calloutSection,
]

export default {
  name: 'pdfGuide',
  title: 'PDF Guide',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      description: 'Must match the existing download URL slug (e.g. "chatgpt-quick-reference")',
      validation: Rule => Rule.required()
    },
    {
      name: 'subtitle',
      title: 'Subtitle',
      type: 'text',
      rows: 2,
    },
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: ['AI Tools', 'Comparison', 'Prompting', 'Business Functions'],
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'sections',
      title: 'Sections',
      type: 'array',
      of: [
        { type: 'bulletsSection' },
        { type: 'tableSection' },
        { type: 'gridSection' },
        { type: 'ratingsSection' },
        { type: 'flowSection' },
        { type: 'calloutSection' },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'category',
    }
  }
}

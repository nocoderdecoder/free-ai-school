export default {
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Project Name',
      type: 'string',
      validation: Rule => Rule.required()
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name' },
      validation: Rule => Rule.required()
    },
    {
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description: 'One-line description shown on listing card',
      validation: Rule => Rule.required()
    },
    {
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Live', value: 'Live' },
          { title: 'Running', value: 'Running' },
          { title: 'Internal', value: 'Internal' },
          { title: 'Demo', value: 'Demo' },
          { title: 'Built', value: 'Built' },
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'featured',
      title: 'Featured',
      type: 'boolean',
      description: 'Show at top of projects listing',
      initialValue: false,
    },
    {
      name: 'year',
      title: 'Year',
      type: 'number',
      description: 'Year built or launched'
    },
    {
      name: 'url',
      title: 'Live URL',
      type: 'url',
      description: 'Leave blank if private or internal'
    },
    {
      name: 'tools',
      title: 'Tools & Technologies',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'e.g. Claude API, Next.js, Sanity, n8n'
    },
    {
      name: 'impact',
      title: 'Impact Summary',
      type: 'string',
      description: 'One-line quantified outcome e.g. "94 articles automated, 0 manual hours"'
    },
    {
      name: 'coverImage',
      title: 'Cover Image',
      type: 'image',
      options: { hotspot: true },
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: '2-3 sentences for the listing card'
    },
    {
      name: 'body',
      title: 'Case Study Body',
      type: 'array',
      of: [
        { type: 'block' },
        {
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'alt', title: 'Alt text', type: 'string' },
            { name: 'caption', title: 'Caption', type: 'string' }
          ]
        }
      ]
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'tagline',
    }
  }
}

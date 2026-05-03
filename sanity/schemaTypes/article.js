export default {
  name: 'article',
  title: 'Article',
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
      validation: Rule => Rule.required()
    },
    {
      name: 'module',
      title: 'Module',
      type: 'string',
      options: {
        list: [
          { title: 'Module 1: Foundations', value: 'foundations' },
          { title: 'Module 2: The Tools Layer', value: 'tools' },
          { title: 'Module 3: AI in Your Organization', value: 'organization' },
          { title: 'Module 4: Hands-On for Non-Engineers', value: 'hands-on' },
        ]
      },
      validation: Rule => Rule.required()
    },
    {
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: 'Short summary shown in article listings'
    },
    {
      name: 'readTime',
      title: 'Read Time (minutes)',
      type: 'number'
    },
    {
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime'
    },
    {
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
  { type: 'block' },
  {
    type: 'image',
    options: { hotspot: true },
    fields: [
      {
        name: 'alt',
        title: 'Alt text',
        type: 'string',
        description: 'Describe the image for accessibility'
      },
      {
        name: 'caption',
        title: 'Caption',
        type: 'string'
      }
    ]
  }
]
    }
  ]
}
// caseStudy: richer project write-ups than the `project` schema's generic
// `body` field supports. The `project` schema already has a Portable Text
// `body` field, which covers most case studies fine. This schema is for the
// subset of projects that warrant a deeper, structured write-up — separate
// problem/architecture/automation-vs-manual/scale/lessons sections instead of
// one undifferentiated rich-text blob. Kept optional/standalone (not required
// for every project) and linked back to `project` via `relatedProject`.
export default {
  name: 'caseStudy',
  title: 'Case Study',
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
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      description: '2-3 sentences for listing cards'
    },
    {
      name: 'relatedProject',
      title: 'Related Project',
      type: 'reference',
      to: [{ type: 'project' }],
      description: 'Optional link back to the project this case study expands on'
    },
    {
      name: 'problem',
      title: 'Problem',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'What problem was being solved, and why it mattered'
    },
    {
      name: 'architecture',
      title: 'Architecture',
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
      ],
      description: 'How it was built — system design, stack, data flow'
    },
    {
      name: 'automationVsManual',
      title: 'Automation vs Manual',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'What is automated end-to-end vs what still needs a human'
    },
    {
      name: 'scale',
      title: 'Scale',
      type: 'object',
      description: 'Quantified scale of the project',
      fields: [
        { name: 'metric', title: 'Metric label', type: 'string', description: 'e.g. "Articles published"' },
        { name: 'value', title: 'Value', type: 'string', description: 'e.g. "94" or "0 manual hours/week"' },
        { name: 'note', title: 'Note', type: 'string', description: 'Optional context for the number' },
      ]
    },
    {
      name: 'lessonsLearned',
      title: 'Lessons Learned',
      type: 'array',
      of: [{ type: 'block' }],
      description: 'What worked, what broke, what you would do differently'
    },
    {
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    },
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'excerpt',
    }
  }
}

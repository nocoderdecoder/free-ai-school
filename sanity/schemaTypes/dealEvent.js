export default {
  name: "deal-event",
  title: "Deal / Event",
  type: "document",
  fields: [
    {
      name: "editorialReviewed",
      title: "Reviewed for public publication",
      type: "boolean",
      initialValue: false,
      description:
        "Enable only after checking claims, dates, citations, and confidentiality. Unreviewed documents remain in the CMS but are not shown publicly.",
    },
    {
      name: "sourceUrls",
      title: "Primary sources checked",
      type: "array",
      of: [{ type: "url" }],
    },
    {
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      validation: (Rule) => Rule.required(),
    },
    {
      name: "type",
      title: "Type",
      type: "string",
      options: {
        list: [
          { title: "Event (conference, keynote, launch)", value: "event" },
          { title: "Deal (acquisition, merger, funding)", value: "deal" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: "eventName",
      title: "Event Name",
      type: "string",
      description:
        'Optional. Human name of the event, e.g. "Google I/O 2026". Leave blank for deals.',
    },
    {
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
      description: "2-3 sentences shown in the listing card",
    },
    {
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
    },
    {
      name: "readTime",
      title: "Read Time (minutes)",
      type: "number",
    },
    {
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block" }],
    },
  ],
};

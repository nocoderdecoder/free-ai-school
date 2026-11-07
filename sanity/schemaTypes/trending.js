export default {
  name: "trending",
  title: "Trending",
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
      name: "excerpt",
      title: "Excerpt",
      type: "text",
      rows: 3,
    },
    {
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
    },
    {
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block" }],
    },
  ],
};

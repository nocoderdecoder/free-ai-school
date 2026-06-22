// Editorial (light) variant — the site's single canonical theme for rich text content.
export const editorialComponents = {
  block: {
    normal:     ({ children }: any) => <p className="mb-6 leading-relaxed text-[#888888] text-lg">{children}</p>,
    h2:         ({ children }: any) => <h2 className="font-serif text-2xl mt-10 mb-4 text-[#1a1a1a]" style={{ fontWeight: 400 }}>{children}</h2>,
    h3:         ({ children }: any) => <h3 className="font-serif text-xl mt-8 mb-3 text-[#1a1a1a]" style={{ fontWeight: 400 }}>{children}</h3>,
    blockquote: ({ children }: any) => (
      <blockquote
        className="border-l-2 pl-6 my-8 italic rounded-r-lg py-4 pr-4"
        style={{ borderColor: 'var(--ed-trending-dot)', background: 'var(--ed-card-warm)', color: 'var(--ed-text-secondary)' }}
      >
        {children}
      </blockquote>
    ),
  },
  marks: {
    strong: ({ children }: any) => <strong className="font-semibold text-[#222222]">{children}</strong>,
    em:     ({ children }: any) => <em className="italic text-[#888888]">{children}</em>,
    link:   ({ children, value }: any) => (
      <a href={value?.href} target="_blank" rel="noopener noreferrer" className="text-[#222222] underline underline-offset-4 hover:text-[#555555] transition">
        {children}
      </a>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="mb-6 space-y-2 list-none pl-0">{children}</ul>,
  },
  listItem: {
    bullet: ({ children }: any) => (
      <li className="text-[#888888] text-lg leading-relaxed flex gap-3">
        <span className="text-[#bbbbbb] mt-1 shrink-0">—</span>
        <span>{children}</span>
      </li>
    ),
  },
}

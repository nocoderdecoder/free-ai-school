export const components = {
  block: {
    normal:     ({ children }: any) => <p className="mb-6 leading-relaxed text-white/80 text-lg">{children}</p>,
    h2:         ({ children }: any) => <h2 className="text-2xl font-bold mt-10 mb-4 text-white">{children}</h2>,
    h3:         ({ children }: any) => <h3 className="text-xl font-semibold mt-8 mb-3 text-white">{children}</h3>,
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-white/20 pl-6 my-8 text-white/50 italic">{children}</blockquote>,
  },
  marks: {
    strong: ({ children }: any) => <strong className="font-semibold text-white">{children}</strong>,
    em:     ({ children }: any) => <em className="italic text-white/70">{children}</em>,
    link:   ({ children, value }: any) => (
      <a href={value?.href} target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-4 hover:text-white/70 transition">
        {children}
      </a>
    ),
  },
  list: {
    bullet: ({ children }: any) => <ul className="mb-6 space-y-2 list-none pl-0">{children}</ul>,
  },
  listItem: {
    bullet: ({ children }: any) => (
      <li className="text-white/80 text-lg leading-relaxed flex gap-3">
        <span className="text-white/30 mt-1 shrink-0">—</span>
        <span>{children}</span>
      </li>
    ),
  },
}

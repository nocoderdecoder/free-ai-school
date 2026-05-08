'use client'

const tools = [
  { name: 'Claude',       color: '#D97559' },
  { name: 'ChatGPT',      color: '#10A37F' },
  { name: 'Gemini',       color: '#4285F4' },
  { name: 'Perplexity',   color: '#5561EB' },
  { name: 'Midjourney',   color: '#FFFFFF' },
  { name: 'n8n',          color: '#EA4B71' },
  { name: 'Zapier',       color: '#FF4A00' },
  { name: 'Make',         color: '#9B51E0' },
  { name: 'Next.js',      color: '#FFFFFF' },
  { name: 'Vercel',       color: '#FFFFFF' },
  { name: 'Python',       color: '#3776AB' },
  { name: 'Sanity',       color: '#F03E2F' },
  { name: 'LangChain',    color: '#1C7C54' },
  { name: 'Windsurf',     color: '#00B4D8' },
  { name: 'HeyGen',       color: '#7C3AED' },
  { name: 'Notion',       color: '#FFFFFF' },
  { name: 'Fireflies',    color: '#FF5F6D' },
  { name: 'Google Colab', color: '#F9AB00' },
  { name: 'Gradio',       color: '#FF7C00' },
  { name: 'GitHub',       color: '#FFFFFF' },
]

export function ToolsMarquee() {
  const doubled = [...tools, ...tools]

  return (
    <div
      className="overflow-hidden py-6"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
      }}
    >
      <div className="marquee-track flex gap-4 w-max">
        {doubled.map((tool, i) => (
          <div
            key={`${tool.name}-${i}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full shrink-0"
            style={{
              border: `1px solid ${tool.color}28`,
              background: `${tool.color}0a`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: tool.color }}
            />
            <span className="text-xs text-white/55 whitespace-nowrap">{tool.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

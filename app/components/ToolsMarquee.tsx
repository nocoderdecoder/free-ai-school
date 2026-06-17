import {
  siAnthropic, siGooglegemini, siPerplexity,
  siN8n, siZapier, siMake, siNextdotjs, siVercel,
  siPython, siSanity, siLangchain, siWindsurf,
  siNotion, siGooglecolab, siGradio, siGithub,
  siReplit, siHuggingface, siCloudflare, siElevenlabs, siGooglecloud,
} from 'simple-icons'

type Tool = {
  name: string
  color: string
  icon?: { path: string }
  initials?: string
}

const tools: Tool[] = [
  { name: 'n8n',          color: '#EA4B71', icon: siN8n },
  { name: 'Zapier',       color: '#FF4A00', icon: siZapier },
  { name: 'Vercel',       color: '#FFFFFF', icon: siVercel },
  { name: 'Make',         color: '#9B51E0', icon: siMake },
  { name: 'Next.js',      color: '#FFFFFF', icon: siNextdotjs },
  { name: 'Claude',       color: '#D97559', icon: siAnthropic },
  { name: 'ChatGPT',      color: '#10A37F', initials: 'AI' },
  { name: 'Gemini',       color: '#4285F4', icon: siGooglegemini },
  { name: 'Perplexity',   color: '#5561EB', icon: siPerplexity },
  { name: 'Midjourney',   color: '#FFFFFF', initials: 'MJ' },
  { name: 'Python',       color: '#3776AB', icon: siPython },
  { name: 'Sanity',       color: '#F03E2F', icon: siSanity },
  { name: 'LangChain',    color: '#1C7C54', icon: siLangchain },
  { name: 'Windsurf',     color: '#00B4D8', icon: siWindsurf },
  { name: 'HeyGen',       color: '#7C3AED', initials: 'HG' },
  { name: 'Notion',       color: '#FFFFFF', icon: siNotion },
  { name: 'Fireflies',    color: '#FF5F6D', initials: 'FF' },
  { name: 'Google Colab', color: '#F9AB00', icon: siGooglecolab },
  { name: 'Gradio',       color: '#FF7C00', icon: siGradio },
  { name: 'GitHub',       color: '#FFFFFF', icon: siGithub },
  { name: 'Replit',       color: '#F26207', icon: siReplit },
  { name: 'Hugging Face', color: '#FFD21E', icon: siHuggingface },
  { name: 'Cloudflare',   color: '#F48120', icon: siCloudflare },
  { name: 'ElevenLabs',   color: '#FFFFFF', icon: siElevenlabs },
  { name: 'Google Cloud', color: '#4285F4', icon: siGooglecloud },
  { name: 'Lovable',      color: '#FF3366', initials: 'LV' },
  { name: 'Descript',     color: '#7B61FF', initials: 'DE' },
  { name: 'AWS',          color: '#FF9900', initials: 'AWS' },
]

function ToolChip({ tool }: { tool: Tool }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{
        border: `1px solid ${tool.color}28`,
        background: `${tool.color}0d`,
      }}
    >
      {tool.icon ? (
        <svg
          role="img"
          viewBox="0 0 24 24"
          className="w-3.5 h-3.5 shrink-0"
          style={{ fill: tool.color }}
        >
          <path d={tool.icon.path} />
        </svg>
      ) : (
        <span
          className="text-[9px] font-bold shrink-0 leading-none"
          style={{ color: tool.color }}
        >
          {tool.initials}
        </span>
      )}
      <span className="text-xs text-white/55 whitespace-nowrap">{tool.name}</span>
    </div>
  )
}

export function ToolsMarquee() {
  return (
    <div className="max-w-3xl mx-auto px-8 py-6">
      <div className="flex flex-wrap gap-2.5">
        {tools.map((tool) => (
          <ToolChip key={tool.name} tool={tool} />
        ))}
      </div>
    </div>
  )
}

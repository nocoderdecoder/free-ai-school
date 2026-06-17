const tools = [
  'n8n', 'Zapier', 'Vercel', 'Make', 'Next.js',
  'Claude', 'ChatGPT', 'Gemini', 'Perplexity', 'Midjourney',
  'Python', 'Sanity', 'LangChain', 'Windsurf', 'HeyGen',
  'Notion', 'Fireflies', 'Google Colab', 'Gradio', 'GitHub',
  'Replit', 'Hugging Face', 'Cloudflare', 'ElevenLabs', 'Google Cloud',
  'Lovable', 'Descript', 'AWS',
]

export function ToolsMarquee() {
  return (
    <div className="py-6 px-8 flex flex-wrap justify-center gap-2">
      {tools.map((name) => (
        <span
          key={name}
          className="text-xs text-white/40 border border-white/[0.06] px-3 py-1.5 rounded-full"
        >
          {name}
        </span>
      ))}
    </div>
  )
}

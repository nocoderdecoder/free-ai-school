// Plain HTML/text email templates for anshul.ai.
// Kept dependency-free (no react-email) — @react-email is not installed and
// these are simple enough that a template string is the right tool.

const BRAND_COLOR = '#6366f1'
const SITE_URL = 'https://anshul.ai'

function emailShell(bodyHtml: string, preview?: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      ${preview ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preview}</div>` : ''}
      <div style="padding: 32px 24px 8px;">
        <a href="${SITE_URL}" style="text-decoration: none; color: ${BRAND_COLOR}; font-weight: 700; font-size: 18px;">anshul.ai</a>
      </div>
      <div style="padding: 0 24px 32px;">
        ${bodyHtml}
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 0;" />
      <div style="padding: 20px 24px; color: #999; font-size: 12px;">
        You're receiving this because you subscribed at anshul.ai.
        <a href="${SITE_URL}" style="color: #999;">Visit the site</a>.
      </div>
    </div>
  `
}

export function welcomeEmail(): { subject: string; html: string; text: string } {
  const subject = 'Welcome to anshul.ai'

  const html = emailShell(
    `
      <h2 style="color: ${BRAND_COLOR}; margin-bottom: 8px;">You're in.</h2>
      <p style="font-size: 15px; line-height: 1.6;">
        Thanks for subscribing. You'll get a weekly digest of what's new — trending AI news,
        notable deals &amp; events, and any fresh lessons or tools — straight to your inbox.
      </p>
      <p style="font-size: 15px; line-height: 1.6;">
        While you wait for the first digest, here's where to start:
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 10px 0;">
            <a href="${SITE_URL}/learn" style="color: ${BRAND_COLOR}; font-weight: 600; text-decoration: none;">AI School →</a>
            <div style="color: #666; font-size: 13px;">Free, structured lessons on AI — no fluff.</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">
            <a href="${SITE_URL}/tools" style="color: ${BRAND_COLOR}; font-weight: 600; text-decoration: none;">Tools →</a>
            <div style="color: #666; font-size: 13px;">Practical AI tools you can use right now.</div>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0;">
            <a href="${SITE_URL}/downloads" style="color: ${BRAND_COLOR}; font-weight: 600; text-decoration: none;">Downloads →</a>
            <div style="color: #666; font-size: 13px;">Templates and guides, free to grab.</div>
          </td>
        </tr>
      </table>
      <p style="font-size: 15px; line-height: 1.6;">
        Talk soon,<br />Anshul
      </p>
    `,
    'Thanks for subscribing — here is where to start.'
  )

  const text = `You're in.

Thanks for subscribing to anshul.ai. You'll get a weekly digest of what's new — trending AI news, notable deals & events, and any fresh lessons or tools.

While you wait for the first digest, here's where to start:
- AI School: ${SITE_URL}/learn
- Tools: ${SITE_URL}/tools
- Downloads: ${SITE_URL}/downloads

Talk soon,
Anshul`

  return { subject, html, text }
}

export interface DigestItem {
  title: string
  url: string
  excerpt?: string
}

export interface DigestSections {
  trending: DigestItem[]
  dealsEvents: DigestItem[]
  articles: DigestItem[]
}

export function weeklyDigestEmail(sections: DigestSections, weekOf: string): { subject: string; html: string; text: string } {
  const totalCount = sections.trending.length + sections.dealsEvents.length + sections.articles.length
  const subject = `This week on anshul.ai: ${totalCount} new ${totalCount === 1 ? 'thing' : 'things'}`

  function renderSection(title: string, items: DigestItem[]): string {
    if (items.length === 0) return ''
    const rows = items
      .map(
        (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
            <a href="${item.url}" style="color: ${BRAND_COLOR}; font-weight: 600; text-decoration: none; font-size: 15px;">${item.title}</a>
            ${item.excerpt ? `<div style="color: #666; font-size: 13px; margin-top: 4px;">${item.excerpt}</div>` : ''}
          </td>
        </tr>
      `
      )
      .join('')

    return `
      <h3 style="color: #1a1a1a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin: 28px 0 4px; color: ${BRAND_COLOR};">${title}</h3>
      <table style="width: 100%; border-collapse: collapse;">${rows}</table>
    `
  }

  const html = emailShell(
    `
      <h2 style="color: ${BRAND_COLOR}; margin-bottom: 4px;">Your week in AI</h2>
      <p style="color: #666; font-size: 13px; margin-top: 0;">Week of ${weekOf}</p>
      ${renderSection('Trending', sections.trending)}
      ${renderSection('Deals &amp; Events', sections.dealsEvents)}
      ${renderSection('AI School', sections.articles)}
    `,
    `${totalCount} new things on anshul.ai this week`
  )

  function renderTextSection(title: string, items: DigestItem[]): string {
    if (items.length === 0) return ''
    return `\n${title.toUpperCase()}\n${items.map((i) => `- ${i.title}: ${i.url}`).join('\n')}\n`
  }

  const text = `Your week in AI — week of ${weekOf}
${renderTextSection('Trending', sections.trending)}${renderTextSection('Deals & Events', sections.dealsEvents)}${renderTextSection('AI School', sections.articles)}
Visit ${SITE_URL} for more.`

  return { subject, html, text }
}

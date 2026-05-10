/**
 * publish-claude-module.mjs
 * Writes and publishes the 5-article Claude module to Sanity.
 */

import { createClient } from '@sanity/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const client = createClient({
  projectId: '8w4exnl4',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

// ─── Portable Text helpers ────────────────────────────────────────────────────

function key() { return Math.random().toString(36).slice(2, 10) }

function toBlocks(text) {
  const blocks = []
  let para = []

  const flush = () => {
    const t = para.join(' ').trim()
    if (t) blocks.push({ _type: 'block', _key: key(), style: 'normal', markDefs: [], children: [{ _type: 'span', _key: key(), text: t, marks: [] }] })
    para = []
  }

  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t) { flush(); continue }
    if (t.startsWith('## ')) { flush(); blocks.push({ _type: 'block', _key: key(), style: 'h2', markDefs: [], children: [{ _type: 'span', _key: key(), text: t.slice(3).trim(), marks: [] }] }); continue }
    if (t.startsWith('### ')) { flush(); blocks.push({ _type: 'block', _key: key(), style: 'h3', markDefs: [], children: [{ _type: 'span', _key: key(), text: t.slice(4).trim(), marks: [] }] }); continue }
    para.push(t)
  }
  flush()
  return blocks
}

// ─── Articles ─────────────────────────────────────────────────────────────────

const articles = [

// ─── 1 ───────────────────────────────────────────────────────────────────────
{
  slug: 'claude-what-it-actually-is',
  title: 'What Claude Actually Is',
  excerpt: 'Claude is an AI assistant made by Anthropic. Before you get into what it can do, it helps to understand what it is, how it is structured, and why it behaves differently from other tools.',
  readTime: 6,
  body: `
What Claude Actually Is

Claude is an AI assistant made by Anthropic. If you have used it, you probably noticed it feels different from other tools. It is more careful. It pushes back sometimes. It explains its reasoning. It declines certain requests and tells you why.

That is not a quirk. Anthropic was founded specifically to build AI that behaves more predictably. The people who started it had worked on other AI systems and left because they wanted to focus on what happens when AI gets things wrong. That focus shows up in how Claude behaves.

## Claude is not one product, it is three

Claude comes in three versions: Haiku, Sonnet, and Opus.

Haiku is fast and cheap. It handles simple, high-volume tasks where speed matters more than depth.

Sonnet sits in the middle. It is what most people use for most things. Fast enough for daily work, capable enough for complex tasks.

Opus is the most capable. It is slower and costs more if you are using the API. Use it when the task genuinely requires more thinking, like working through a complex document or reasoning through a problem with many moving parts.

When you use claude.ai in the browser, you can switch between these models depending on what you are doing.

## Two ways to access Claude

The first is claude.ai. This is the chat interface most people use. Log in, start a conversation, work the way you would in any messaging tool.

The second is the API. This is for connecting Claude to other software, running automations, or building your own tools. You do not need to understand this yet, but it is worth knowing it exists.

## What Claude is genuinely good at

Claude works well for writing, reasoning, and handling long documents. It can hold a lot of context in a conversation, which means you can give it a lengthy contract, a detailed report, or a complex brief and it keeps track of everything as you go.

It is also reasonably honest about uncertainty. It will tell you when it is not sure rather than confidently producing something wrong. That said, it does make mistakes. It can misread a document. It can misinterpret a question. Treating it as a starting point rather than a final answer is the right habit.

## What Claude is not

Claude is not a search engine. It does not browse the internet by default. Its knowledge has a cutoff date, so recent events may not be in what it knows.

The people who get the most from Claude are the ones who treat it like a capable colleague who needs clear context and good feedback, not a tool that produces perfect output on the first try.
`},

// ─── 2 ───────────────────────────────────────────────────────────────────────
{
  slug: 'claude-interface-everything-worth-knowing',
  title: 'The Claude Interface: Everything Worth Knowing',
  excerpt: 'Most people open claude.ai and start typing. That works. But there is a lot more in the interface that most people walk past without noticing.',
  readTime: 7,
  body: `
The Claude Interface: Everything Worth Knowing

Most people open claude.ai and start typing. That works for simple things. But there is a lot in the interface that most people walk past without noticing.

Here is what is actually worth understanding.

## Projects

Projects are the most underused feature in Claude.

A Project is a persistent workspace. You create one for a specific context, like a client, a team, or a recurring type of work, and it keeps everything together. Conversations inside a Project share the same context. Documents you upload stay available. Instructions you write apply to every conversation inside it.

The practical use: create a Project for your job. Upload your job description, a company strategy doc, a few examples of your writing style. Now Claude has permanent context about who you are and what you do without you re-explaining it every time.

## Artifacts

When Claude creates something self-contained, it opens it in a side panel called an Artifact.

This happens with documents, tables, code, and interactive tools. The Artifact sits on the right side of the screen. You keep talking on the left, Claude updates the Artifact on the right as you give feedback.

This is more useful than it sounds. Instead of Claude dumping text into the chat that you then copy somewhere else, the Artifact becomes a working document you refine in real time. You can also run some Artifacts directly in the browser, calculators, trackers, simple tools, no extra software needed.

## File uploads

Claude can read files. PDFs, Word documents, spreadsheets, images, code files.

Upload a long report and ask for the three most important takeaways. Upload a spreadsheet and ask it to find patterns. Upload an image and ask what is in it.

The upload button is in the chat bar. The file size limit is generous enough for most real documents.

## Switching models

In the top bar, you can switch between Haiku, Sonnet, and Opus mid-conversation.

Most of the time Sonnet handles things well. If you are doing something that needs more depth, like analysing a long contract or working through a complex argument, switching to Opus gives you more capability at the cost of slightly slower responses.

## Voice

Claude has a voice mode, available on mobile through the Claude app. You can speak to it and it responds.

Useful for thinking out loud, drafting something while walking, or working through a problem when typing feels like friction.

## What the interface does not have

No memory across Projects by default. Start a new conversation outside a Project and Claude has no knowledge of anything you discussed before.

No internet access unless specifically enabled. Claude works from its training data and whatever you put into the conversation itself. Knowing these limits helps you work around them rather than being surprised by them.
`},

// ─── 3 ───────────────────────────────────────────────────────────────────────
{
  slug: 'claude-how-to-prompt-well',
  title: 'How to Prompt Claude Well',
  excerpt: 'Most people treat Claude like a search engine. Short question, wait for answer. That works for simple things. For anything more complex, the way you write the prompt changes the result significantly.',
  readTime: 6,
  body: `
How to Prompt Claude Well

Most people treat Claude like a search engine. Short question, wait for an answer. That works for simple things.

For anything more complex, the way you write the prompt changes the result significantly. Here is what actually makes a difference.

## Give context, not just a request

The gap between a weak prompt and a useful one is almost always context.

Weak: "Write an email to my client about the delay."

Better: "I manage a software project. Our client expected delivery this Friday. A bug will push the deadline by one week. The client is usually calm but values directness. Write an email from me explaining the delay without being overly apologetic."

Claude does not know who your client is, what your relationship looks like, or what tone you want. The more you give it, the closer the first draft will be to what you actually need.

## Tell it what role to play

Claude responds differently depending on the lens you give it.

"Act as a senior marketing director reviewing this strategy" produces different feedback than "proofread this." You do not need elaborate role definitions. A single sentence changes the output. "You are a skeptical investor" or "you are a first-year employee reading this for the first time" gives Claude a point of view that shapes what it notices.

## Use Projects for permanent context

If you find yourself re-explaining the same things at the start of every conversation, set up a Project.

In a Project's instructions, write things like: "I am a CFO at a 200-person company. I work with non-technical stakeholders. Keep explanations jargon-free. My writing style is direct and short."

Claude applies those instructions to every conversation inside the Project. You stop repeating yourself.

## Ask Claude to check its own work

Claude can critique its own output if you ask.

After it writes something, try: "Read this back as if you are the intended audience. What is unclear?" Or: "What are the three weakest parts of this argument?"

This surfaces problems you might not catch yourself, especially when you are too close to the content.

## Break complex tasks into steps

If you ask Claude to do too many things at once, you get a response that tries to do too many things and does them all poorly.

Better to go step by step. Ask for an outline. Review it. Ask for the full piece based on the outline. Then ask for edits. Each step is a chance to course-correct before investing more effort in the wrong direction.

## When Claude pushes back

Claude will sometimes decline a request or raise concerns.

This is worth engaging with rather than ignoring. Asking it to explain why usually tells you something useful, either about how you framed the request or about a genuine issue worth thinking about. You can usually get where you want to go by reframing or giving more context about what you are actually trying to do.
`},

// ─── 4 ───────────────────────────────────────────────────────────────────────
{
  slug: 'claude-for-real-work-use-cases',
  title: 'Claude for Real Work: Use Cases That Actually Deliver',
  excerpt: 'Not theoretical applications. These are the places where Claude consistently saves time and produces useful output for professionals doing real work.',
  readTime: 8,
  body: `
Claude for Real Work: Use Cases That Actually Deliver

Here are the places where Claude consistently delivers in a work context. Not theoretical. Things professionals are actually using it for today.

## Writing and editing

The obvious one, but the depth of what it can do is usually underestimated.

Claude can write first drafts of emails, reports, proposals, and presentations. More usefully, it can edit your own writing while preserving your voice. Give it something you wrote and ask it to make it clearer, shorter, or more direct. The edits are usually good enough to use with minor changes.

It also handles tone matching well. Give it an example of writing you want to sound like and ask it to apply that style to something new.

## Summarising long documents

Paste in a PDF or a long document and ask Claude to pull out the key points, the risks, or the decisions that need to be made.

Particularly useful for contracts, research reports, board packs, and anything where you need the substance without reading every word. Claude can also answer specific questions about a document. "Does this contract have any clauses about auto-renewal?" works well.

## Building things with Artifacts

This is where Claude surprises most people.

You can ask Claude to build a working tool and it opens right in the browser, no code required on your part. A project tracker, a budget calculator, a client proposal template with fillable fields, a scoring rubric.

These appear as Artifacts in the side panel. You interact with them directly in Claude. Some can be embedded elsewhere or shared.

For someone without a technical background, this is significant. Things that used to require a developer or a specific paid tool can be prototyped in a conversation.

## Research and analysis

Claude cannot browse the internet by default, but it can work well with information you give it.

Paste in website copy, customer reviews, or a market report and ask Claude to analyse it. "What objections do customers seem to have?" or "What is the core positioning here and where is it weak?" produces genuinely useful output.

A good workflow: use a tool like Perplexity to find and gather the information, then use Claude to analyse and interpret it.

## Thinking through decisions

Claude works well as a thinking partner for problems without a clear answer.

Describe a situation and ask it what you might be missing. Or ask it to argue the opposite side of something you are leaning toward. Or ask it to list risks you have not considered. It will not replace judgment, but it surfaces angles that are easy to miss when you are too close to a problem.

## HR and people tasks

Job descriptions, interview question banks, feedback frameworks, performance review templates, onboarding checklists.

These are time-consuming to write from scratch and tend to follow a pattern. Claude handles them quickly and the output usually needs only light editing.

## Preparing for difficult conversations

Describe a situation and ask Claude to help you prepare. "I need to tell a team member their performance has not been meeting expectations. What are the key points to cover and what reactions should I be ready for?"

This is not about scripting conversations. It is about walking in with your thinking done.
`},

// ─── 5 ───────────────────────────────────────────────────────────────────────
{
  slug: 'claude-code-and-api-what-they-are',
  title: 'Claude Code and the API: What They Are and Whether You Need Them',
  excerpt: 'If you have been using claude.ai and want to understand what else exists, there are two things worth knowing about: the Claude API and Claude Code. Neither requires you to be a developer to understand.',
  readTime: 7,
  body: `
Claude Code and the API: What They Are and Whether You Need Them

If you have been using claude.ai and want to go further, there are two things worth understanding: the Claude API and Claude Code.

Neither requires you to be a developer. But knowing what they are changes what you think is possible.

## What the API is

API stands for Application Programming Interface. The practical meaning: instead of using the Claude chat interface, you connect Claude directly to other software or run it from a script.

When you use the API, there is no chat window. You write instructions and send them programmatically. Claude processes them and returns a response. You can automate this to run on a schedule, trigger it when something else happens, or connect it to a database, a spreadsheet, or another tool.

The automation running on this site uses the API. Every morning, a script fetches AI headlines, sends them to Claude, gets an article back, and publishes it to the site. No human involved after the initial setup.

## What Claude Code is

Claude Code is a separate product from claude.ai. It runs in the terminal on your computer, the command-line window that most people never open.

The key difference from the chat interface: Claude Code can actually interact with your files and your computer. It does not just give you instructions to copy. It reads your files, writes changes, runs commands, and checks if they worked.

If you ask Claude in the browser to help you build something, it gives you code that you then copy and run yourself. If you ask Claude Code to build something, it builds it, runs it, fixes errors, and tells you when it is done.

The website you are reading was built this way.

## Skills in Claude Code

Skills are a feature specific to Claude Code. They are pre-written instructions that tell Claude Code how to approach a particular type of task.

Think of them as context that loads automatically. A skills file for a content team might tell Claude to always write in a certain tone, follow a specific format, and check certain things before finishing. Instead of explaining this at the start of every session, it is loaded automatically.

If you are using Claude Code for any repeated type of work, skills make the output more consistent without requiring you to repeat yourself each time.

## Do you need the API?

Probably not yet, and that is completely fine.

The API becomes relevant when you want Claude to work without you being in the loop, when you want to automate something that repeats, or when you want to connect Claude to other systems. If you are still using Claude for individual tasks, claude.ai is the right tool.

## Do you need Claude Code?

Only if you want to build or modify software directly.

If you have a website, an internal tool, or any code-based project you want to work on, Claude Code is genuinely useful even without a development background. It explains what it is doing, asks before making large changes, and works through problems step by step.

If your work does not involve code, you do not need it.

## How to get started with the API

Go to console.anthropic.com. Create an account and generate an API key. Add credit to your account. You pay per use and costs are low for personal or small-scale use.

The simplest entry point without writing code is connecting Claude to a tool like Zapier or Make, which let you use the API through a visual interface. From there, you build from what you learn.
`},

]

// ─── Publish ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nPublishing Claude module (5 articles)...\n')
  for (const [i, a] of articles.entries()) {
    const doc = {
      _type: 'article',
      _id: `article-${a.slug}`,
      title: a.title,
      slug: { _type: 'slug', current: a.slug },
      module: 'claude',
      excerpt: a.excerpt,
      readTime: a.readTime,
      publishedAt: new Date().toISOString(),
      body: toBlocks(a.body),
    }
    await client.createOrReplace(doc)
    console.log(`  ${i + 1}/5  ✅  ${a.title}`)
  }
  console.log('\nDone.\n')
}

main().catch(e => { console.error(e); process.exit(1) })

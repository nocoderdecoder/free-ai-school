import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a business ROI analyst specialising in AI adoption. You make precise, credible calculations based on industry benchmarks. You are direct and back your claims with specific numbers.

Format your response using ## for main sections and - for bullet points. Lead with the headline numbers — time saved, money saved. Be specific about which AI tools to use and how.`

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('API key not configured', { status: 503 })
  }

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { role, hoursPerWeek, teamSize, taskType, hourlyCost } = body
  if (!role || !hoursPerWeek || !teamSize || !taskType || !hourlyCost) {
    return new Response('Missing required fields', { status: 400 })
  }

  const weeklyHours = parseFloat(hoursPerWeek) || 10
  const team = parseInt(teamSize) || 1
  const hourlyRate = parseFloat(hourlyCost) || 50
  const annualCost = Math.round(weeklyHours * team * hourlyRate * 52)

  const userPrompt = `Calculate the AI ROI for this professional:

Role/Function: ${role}
Hours per week on repetitive/manual tasks: ${hoursPerWeek}
Team size: ${teamSize}
Type of tasks: ${taskType}
Average hourly cost (salary + overhead): $${hourlyCost}

Annual time cost of these tasks: $${annualCost.toLocaleString()}

Provide an AI ROI analysis with these sections:

## Your ROI Summary
Start with the headline: hours saved per week, annual time savings, and dollar value saved. Be specific.

## How AI Reduces This Work
For the task type mentioned, explain exactly which parts AI automates, speeds up, or eliminates. Give a realistic % reduction (30-70% is typical depending on task type).

## Recommended AI Tools
3-4 specific AI tools for this role and task type. For each: tool name, what it does for them specifically, approximate monthly cost, and expected time saving.

## Implementation Timeline
Week 1-2: getting started. Month 1: first wins. Month 3: full ROI realised.

## Your Payback Period
How long until the tool costs are covered by time savings, using the numbers provided.`

  const stream = anthropic.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const readable = new ReadableStream({
    async start(controller) {
      stream.on('text', (text: string) => {
        controller.enqueue(new TextEncoder().encode(text))
      })
      await stream.finalMessage()
      controller.close()
    },
    cancel() {
      stream.abort()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}

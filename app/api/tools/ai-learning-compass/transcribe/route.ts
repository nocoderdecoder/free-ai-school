import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { checkRateLimit, rateLimitResponse } from '../../../../lib/rateLimit'

export const runtime = 'nodejs'
export const maxDuration = 60

const transcriptionModel = process.env.AI_COMPASS_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe'
const maximumAudioBytes = 10 * 1024 * 1024
const supportedAudioTypes = new Set(['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'])

function openAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'The transcription service is not configured.', code: 'ASSESSMENT_NOT_CONFIGURED' }, { status: 503 })
  }

  const rate = await checkRateLimit(request, { tool: 'ai-learning-compass-transcription', limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return rateLimitResponse(rate)

  try {
    const form = await request.formData()
    const audio = form.get('audio')
    const requestedLanguage = String(form.get('language') || '').trim()
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: 'Please record an answer before transcribing.' }, { status: 400 })
    }
    if (audio.size > maximumAudioBytes) {
      return NextResponse.json({ error: 'That recording is too large. Please keep one answer under 10 MB.' }, { status: 413 })
    }
    if (audio.type && !supportedAudioTypes.has(audio.type.split(';')[0])) {
      return NextResponse.json({ error: 'That browser audio format is not supported.' }, { status: 415 })
    }

    const language = requestedLanguage === 'auto' ? undefined : requestedLanguage.split('-')[0]
    const result = await openAIClient().audio.transcriptions.create({
      file: audio,
      model: transcriptionModel,
      language,
      prompt: 'This is an AI Learning Compass answer about work, AI tools, ChatGPT, agents, automation, apps, creative writing, editing, and email drafting. Preserve the speaker’s meaning and add natural capitalization and punctuation.',
    })
    const text = result.text.trim()
    if (!text) throw new Error('Transcription returned no text')
    return NextResponse.json({ text }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('AI Learning Compass transcription error', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'I could not transcribe that recording. You can retry or use browser dictation.' }, { status: 500 })
  }
}

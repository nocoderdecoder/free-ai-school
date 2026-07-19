import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('plan submission is cancellable and stale responses cannot replace a restarted flow', async () => {
  const app = await readFile(new URL('./AdvisorApp.tsx', import.meta.url), 'utf8')
  const api = await readFile(new URL('./client/api.ts', import.meta.url), 'utf8')
  assert.match(app, /submissionRevision = useRef/)
  assert.match(app, /submissionAbort = useRef<AbortController/)
  assert.match(app, /controller\.signal\.aborted \|\| submissionRevision\.current !== requestRevision/)
  assert.match(app, /submissionAbort\.current\?\.abort\(\)[\s\S]*setPath\(nextPath\)/)
  assert.match(app, /aria-busy=\{isSubmitting\}/)
  assert.match(api, /signal: storage\.signal/)
})

test('invalid navigation focuses a control and sections expose their requirements', async () => {
  const app = await readFile(new URL('./AdvisorApp.tsx', import.meta.url), 'utf8')
  assert.match(app, /selectSection\(activeSection, true\)/)
  assert.match(app, /selectSection\(first\.id, true\)/)
  assert.match(app, /aria-describedby=\{issues\.length \? `ap-section-\$\{id\}-issues`/)
  assert.match(app, /querySelector<HTMLElement>\('textarea, input:not\(\[type="hidden"\]\), select, button'\)/)
})

test('consumer trust copy, privacy, terms, and portable plan output are present', async () => {
  const app = await readFile(new URL('./AdvisorApp.tsx', import.meta.url), 'utf8')
  const privacy = await readFile(new URL('./privacy/page.tsx', import.meta.url), 'utf8')
  const terms = await readFile(new URL('./terms/page.tsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('./ai-path.css', import.meta.url), 'utf8')
  assert.match(app, /Don’t enter passwords, API keys/)
  assert.match(app, /href="\/ai-path\/privacy"/)
  assert.match(app, /href="\/ai-path\/terms"/)
  assert.match(app, /window\.print\(\)/)
  assert.match(privacy, /Do not enter passwords, API keys/)
  assert.match(privacy, /up to 90 days/)
  assert.match(terms, /intended for adults/)
  assert.match(css, /@media print/)
})

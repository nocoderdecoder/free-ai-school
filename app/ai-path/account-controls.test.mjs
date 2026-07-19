import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('signed-in header exposes one compact account entry point', async () => {
  const source = await readFile(new URL('./AdvisorApp.tsx', import.meta.url), 'utf8')
  assert.match(source, /authenticatedExperienceEnabled[\s\S]*href="\/ai-path\/account">Account<\/a>/)
  assert.doesNotMatch(source, /className="ap-ds-signOut"/)
})

test('account controls use safe verbs and keep destructive deletion disabled', async () => {
  const source = await readFile(new URL('./account/AccountControls.tsx', import.meta.url), 'utf8')
  assert.match(source, /method="post"[\s\S]*action="\/api\/ai-path\/account\/export"/)
  assert.match(source, /method="post"[\s\S]*action="\/api\/ai-path\/auth\/sign-out"/)
  assert.match(source, /localStorage\.removeItem\(SAVED_PLAN_STORAGE_KEY\)/)
  assert.match(source, /<button type="button" disabled aria-describedby="account-delete-help">/)
  assert.match(source, /session-bound re-verification step/)
  assert.doesNotMatch(source, /action="\/api\/ai-path\/account\/delete"/)
})

test('account page honestly reflects closed export and auth gates', async () => {
  const source = await readFile(new URL('./account/page.tsx', import.meta.url), 'utf8')
  assert.match(source, /AI_PATH_ACCOUNT_EXPORT_RUNTIME_LATCH/)
  assert.match(source, /hasVerifiedConsumerSession\(\)/)
  assert.match(source, /isSignedIn \? \(/)
  assert.doesNotMatch(source, /<AccountControls[\s\S]*authConfigured=\{authConfigured\}/)
  assert.match(source, /role="status"/)
  assert.match(source, /robots: \{ index: false, follow: false \}/)
})

test('account controls have responsive, content-driven layout and visible focus', async () => {
  const css = await readFile(new URL('./account/account.css', import.meta.url), 'utf8')
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) auto/)
  assert.match(css, /overflow-wrap: anywhere/)
  assert.match(css, /:focus-visible/)
  assert.match(css, /@media \(max-width: 640px\)/)
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\);/)
  assert.doesNotMatch(css, /^\s*height:\s*\d+px/m)
})

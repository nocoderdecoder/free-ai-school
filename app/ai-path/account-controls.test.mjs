import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('signed-in shell exposes dashboard navigation and an account menu', async () => {
  const source = await readFile(new URL('./AdvisorApp.tsx', import.meta.url), 'utf8')
  assert.match(source, /<DashboardHome[\s\S]*storagePersistenceAvailable=\{storagePersistenceAvailable\}/)
  assert.match(source, /aria-current=\{scene === 'home' \? 'page' : undefined\}>Dashboard<\/button>/)
  assert.match(source, /<AccountMenu user=\{user\} \/>/)
  assert.match(source, /href="\/ai-path\/account">Account settings<\/a>/)
  assert.match(source, /action="\/api\/ai-path\/auth\/sign-out"/)
  assert.match(source, /localStorage\.removeItem\(SAVED_PLAN_STORAGE_KEY\)/)
})

test('account controls use safe verbs and keep destructive deletion disabled', async () => {
  const source = await readFile(new URL('./account/AccountControls.tsx', import.meta.url), 'utf8')
  assert.match(source, /method="post"[\s\S]*action="\/api\/ai-path\/account\/export"/)
  assert.match(source, /method="post"[\s\S]*action="\/api\/ai-path\/auth\/sign-out"/)
  assert.match(source, /localStorage\.removeItem\(SAVED_PLAN_STORAGE_KEY\)/)
  assert.match(source, /<button type="button" disabled aria-describedby="account-delete-help">/)
  assert.match(source, /Account deletion is not available yet/)
  assert.doesNotMatch(source, /action="\/api\/ai-path\/account\/delete"/)
})

test('account page honestly reflects closed export and auth gates', async () => {
  const source = await readFile(new URL('./account/page.tsx', import.meta.url), 'utf8')
  const appPage = await readFile(new URL('./page.tsx', import.meta.url), 'utf8')
  assert.match(source, /AI_PATH_ACCOUNT_EXPORT_RUNTIME_LATCH/)
  assert.match(source, /getVerifiedConsumerUser\(\)/)
  assert.match(source, /isSignedIn \? \(/)
  assert.doesNotMatch(source, /<AccountControls[\s\S]*authConfigured=\{authConfigured\}/)
  assert.match(source, /user=\{user\}/)
  assert.match(source, /role="status"/)
  assert.match(source, /robots: \{ index: false, follow: false \}/)
  assert.match(appPage, /const user = authConfigured \? await getVerifiedConsumerUser\(\) : null/)
  assert.match(appPage, /consumerUser=\{user \? \{ email: user\.email \} : null\}/)
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

test('auth page has compact SaaS copy and remember-me wiring', async () => {
  const source = await readFile(new URL('./auth/page.tsx', import.meta.url), 'utf8')
  const rememberSource = await readFile(new URL('./auth/RememberMe.tsx', import.meta.url), 'utf8')
  assert.match(source, /<h1 id="auth-title">Sign in<\/h1>/)
  assert.match(source, /Pick up where you left off\./)
  assert.doesNotMatch(source, /Sign in to save your answers/)
  assert.doesNotMatch(source, /Google and email sign-in both create/)
  assert.match(source, /id=\{googleFormId\}[\s\S]*action="\/api\/ai-path\/auth\/google"/)
  assert.match(source, /id=\{emailFormId\}[\s\S]*action="\/api\/ai-path\/auth\/sign-in"/)
  assert.match(source, /<RememberMe googleFormId=\{googleFormId\} emailFormId=\{emailFormId\} \/>/)
  assert.match(rememberSource, /useState\(true\)/)
  assert.match(rememberSource, /name="remember" value=\{value\}/)
  assert.match(rememberSource, /form=\{googleFormId\}/)
  assert.match(rememberSource, /form=\{emailFormId\}/)
})

test('dashboard home has honest empty, loading, progress, and storage-unavailable states', async () => {
  const source = await readFile(new URL('./AdvisorApp.tsx', import.meta.url), 'utf8')
  const css = await readFile(new URL('./ai-path.css', import.meta.url), 'utf8')
  assert.match(source, /function DashboardHome/)
  assert.match(source, /Loading your workspace\.\.\./)
  assert.match(source, /No saved plan yet/)
  assert.match(source, /Account plan storage is not enabled/)
  assert.match(source, /Account-level saved plan history will appear here after storage is enabled/)
  assert.match(source, /0 of 4/)
  assert.match(css, /\.ap-dashboardGrid/)
  assert.match(css, /grid-template-columns: minmax\(0, 1\.15fr\) minmax\(280px, \.85fr\)/)
  assert.match(css, /@media \(max-width: 780px\)[\s\S]*\.ap-dashboardGrid \{[\s\S]*grid-template-columns: 1fr;/)
})

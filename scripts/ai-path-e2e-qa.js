globalThis.__AI_PATH_QA_RUN__ = async (page) => {
  const baseURL = await page.title()
  const artifactDir = '.'
  if (!baseURL) throw new Error('The bootstrap page title must contain the local AI Path URL')

  const appOrigin = baseURL.split('/').slice(0, 3).join('/')
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(appOrigin)) {
    throw new Error(`QA refuses a non-local target: ${appOrigin}`)
  }

  const checkpoints = []
  const blockedRequests = []
  const paidPathRequests = []
  const consoleErrors = []
  const sessionRequests = []
  const analysisRequests = []
  const analyticsRequests = []

  const assert = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const checkpoint = (name) => checkpoints.push(name)
  const waitForHeading = async (name) => {
    await page.getByRole('heading', { name }).waitFor({ state: 'visible', timeout: 15_000 })
  }
  const isVisible = async (locator) => locator.isVisible().catch(() => false)
  const assertNoHorizontalOverflow = async (label) => {
    const metrics = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }))
    assert(
      metrics.documentWidth <= metrics.viewport + 1 && metrics.bodyWidth <= metrics.viewport + 1,
      `${label} has horizontal overflow: ${JSON.stringify(metrics)}`,
    )
  }
  const captureViewport = async (name, width, height) => {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }))
    await page.waitForTimeout(100)
    await assertNoHorizontalOverflow(`${name} ${width}x${height}`)
    await page.screenshot({ path: `${artifactDir}/${name}-${width}x${height}.png`, fullPage: true })
  }
  const captureRequiredViewports = async (name) => {
    for (const [width, height] of [[375, 812], [768, 1024], [1440, 900]]) {
      await captureViewport(name, width, height)
    }
  }
  const assertInteractiveNames = async (label) => {
    const unnamed = await page.locator('button, a[href], input, textarea, select, summary').evaluateAll((elements) => (
      elements.flatMap((element, index) => {
        const style = window.getComputedStyle(element)
        const visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
        if (!visible || element.hasAttribute('disabled')) return []
        const labels = 'labels' in element && element.labels
          ? Array.from(element.labels).map((item) => item.textContent || '').join(' ')
          : ''
        const name = (
          element.getAttribute('aria-label')
          || element.getAttribute('title')
          || labels
          || element.textContent
          || element.getAttribute('placeholder')
          || ''
        ).trim()
        return name ? [] : [`${element.tagName.toLowerCase()}[${index}]`]
      })
    ))
    assert(unnamed.length === 0, `${label} has unnamed interactive controls: ${unnamed.join(', ')}`)
  }
  const assertHeadingFocused = async (name, label = String(name)) => {
    const heading = page.getByRole('heading', { name }).first()
    await heading.waitFor({ state: 'visible', timeout: 15_000 })
    const headingHandle = await heading.elementHandle()
    assert(headingHandle, `${label} heading could not be inspected for programmatic focus`)
    await page.waitForFunction(element => document.activeElement === element, headingHandle, { timeout: 5_000 }).catch(() => {
      throw new Error(`${label} heading did not receive programmatic focus`)
    })
  }

  const qaGoal = 'Build a citation-preserving weekly market intelligence workflow that colleagues can inspect, rerun, and improve.'
  const correctedGoal = `${qaGoal} It must also explain what happens when a source disappears.`
  const privateCanary = 'QA_PRIVATE_SIMPLICITY_CANARY_DO_NOT_COPY_TO_ANALYTICS'
  const skillIds = [
    'foundations',
    'prompt-context',
    'workflow-design',
    'data-retrieval',
    'coding-apis',
    'agents-tools',
    'evaluation-reliability',
    'deployment-operations',
    'safety-governance',
  ]
  const recommendations = Array.from({ length: 4 }, (_, index) => ({
    id: `qa-resource-${index + 1}`,
    title: [
      'Build a citation-preserving research workflow',
      'Evaluate AI outputs with a lightweight rubric',
      'Design reliable prompts and context',
      'This fourth resource must be hidden by the simple path',
    ][index],
    provider: 'Deterministic QA Learning Library',
    canonicalUrl: null,
    format: index === 0 ? 'project' : 'course',
    free: true,
    costDisclosure: 'Free. No purchase, paid API, account, subscription, or trial is required.',
    estimatedHours: index + 1,
    quality: 0.95 - (index * 0.01),
    skills: [{ skillId: index === 1 ? 'evaluation-reliability' : 'workflow-design', entryLevel: 1, exitLevel: 2 }],
    prerequisites: [],
    codingRequirement: 'none',
    accountRequirement: 'none',
    paidServiceRequirement: 'none',
    deferredForGoalTypes: [],
    reason: 'This resource directly supports the learner’s reviewed goal and produces inspectable evidence within the available time.',
    rank: index + 1,
    score: 240 - index,
    matchedSkillIds: [index === 1 ? 'evaluation-reliability' : 'workflow-design'],
  }))
  const report = {
    reportVersion: '2026-07-16.v1',
    taxonomyVersion: '2026-07-16.v1',
    scoringVersion: '2026-07-16.v1',
    catalogVersion: '2026-07-17.v2',
    generatedAt: '2026-07-17T02:30:00.000Z',
    goal: correctedGoal,
    results: skillIds.map((skillId) => {
      const assessed = ['workflow-design', 'evaluation-reliability'].includes(skillId)
      return {
        skillId,
        status: assessed ? 'assessed' : 'not_assessed',
        level: assessed ? 1 : null,
        confidence: assessed ? 'medium' : 'low',
        evidenceIds: assessed ? [`evidence-${skillId}`] : [],
        contradictionIds: [],
        rationale: assessed
          ? 'Level 1 is supported by exact learner-reviewed evidence.'
          : 'No evidence was collected; this is not a zero score.',
      }
    }),
    strengths: [],
    growthAreas: ['workflow-design', 'evaluation-reliability'],
    recommendationStatus: 'available',
    recommendations,
    disclaimer: 'This learning assessment reflects reviewed evidence and is guidance, not a credential or employment decision.',
  }

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await page.route('**/*', async (route) => {
    const requestURL = route.request().url()
    if (
      requestURL === appOrigin
      || requestURL.startsWith(`${appOrigin}/`)
      || requestURL.startsWith('about:')
      || requestURL.startsWith('blob:')
      || requestURL.startsWith('data:')
    ) {
      await route.continue()
      return
    }
    blockedRequests.push(requestURL)
    await route.abort('blockedbyclient')
  })

  await page.route('**/api/ai-path/realtime/**', async (route) => {
    paidPathRequests.push(route.request().url())
    await route.abort('blockedbyclient')
  })

  await page.route('**/api/ai-path/session', async (route) => {
    const request = route.request()
    assert(request.method() === 'POST', `unexpected session method ${request.method()}`)
    const body = request.postDataJSON()
    sessionRequests.push(body)
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        session: {
          id: 'qa-session-simple-0001',
          status: 'consented',
          createdAt: '2026-07-17T02:29:00.000Z',
          mode: 'text',
          locale: 'en-US',
          goal: body.goal,
          goalType: 'workflows',
          targetRole: body.targetRole || '',
          consentVersion: '2026-07-16.v1',
          saveTranscript: false,
        },
        owned: false,
        persistence: 'none',
        productionReady: false,
      }),
    })
  })

  await page.route('**/api/ai-path/events', async (route) => {
    const request = route.request()
    assert(request.method() === 'POST', `unexpected analytics method ${request.method()}`)
    const body = request.postDataJSON()
    analyticsRequests.push(body)
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'analytics_unavailable' }),
    })
  })

  await page.route('**/api/ai-path/analysis', async (route) => {
    const request = route.request()
    assert(request.method() === 'POST', `unexpected analysis method ${request.method()}`)
    analysisRequests.push(request.postDataJSON())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ report }),
    })
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await waitForHeading('What would you like AI to help you do better?')
  await assertHeadingFocused('What would you like AI to help you do better?', 'start')

  const startInputs = page.locator('textarea:visible, input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):visible, select:visible')
  assert(await startInputs.count() === 1, `start must expose one goal field, found ${await startInputs.count()}`)
  const goalField = page.getByLabel('Your goal')
  assert(await goalField.isVisible(), 'the single start field is not labeled Your goal')
  const voiceButton = page.getByRole('button', { name: 'Voice conversation coming soon' })
  assert(await voiceButton.isVisible(), 'the honest voice status is missing')
  assert(await voiceButton.isDisabled() || await voiceButton.getAttribute('aria-disabled') === 'true', 'unavailable voice control must not start a paid or fake session')
  await assertInteractiveNames('start')
  await captureViewport('start', 1440, 900)

  let startActions = 0
  await goalField.fill(qaGoal)
  const typedStart = page.getByRole('button', { name: 'Start typed conversation' })
  await typedStart.focus()
  const focusStyle = await typedStart.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth }
  })
  assert(focusStyle.outlineStyle !== 'none' && focusStyle.outlineWidth !== '0px', `keyboard focus is not visible: ${JSON.stringify(focusStyle)}`)
  await page.keyboard.press('Enter')
  startActions += 1
  assert(startActions <= 2, `conversation required ${startActions} start actions`)
  await page.getByLabel('Your answer').waitFor({ state: 'visible', timeout: 15_000 })
  assert(sessionRequests.length === 0, 'the local typed conversation should not create a server session before path generation')
  checkpoint('one-field start reached the typed conversation in one action')

  await captureViewport('conversation', 375, 812)
  await assertInteractiveNames('conversation')
  assert(!(await page.getByText('Conversation outline', { exact: true }).isVisible().catch(() => false)), 'old conversation sidebar is still visible')
  assert(!(await page.getByText('What I am testing', { exact: true }).isVisible().catch(() => false)), 'internal assessment methodology is still visible')

  const answers = [
    'Last week I collected six public reports and produced a two-page cited market brief for a colleague.',
    'I compared claims against the original sources, retained claim-level citations, and included a source ledger.',
    'I personally chose the sources, wrote the brief, and designed the reviewer checkpoint; a colleague reviewed the final draft.',
    `${privateCanary}: the inspectable artifact is a cited brief and ledger that a colleague can rerun.`,
    'Citation links drifted, so I tested every claim, removed two unsupported claims, and documented the failure.',
    'I use public data, label uncertainty, and require human review before external sharing.',
    'I have about three hours each week and prefer a no-code or light-code workflow with explicit stopping points.',
  ]
  let adaptiveAnswerCount = 0
  while (!(await isVisible(page.getByRole('heading', { name: 'Here’s what I heard' })))) {
    const reviewButton = page.getByRole('button', { name: 'Review what I heard' })
    if (await isVisible(reviewButton)) {
      assert(adaptiveAnswerCount >= 5, `adaptive conversation ended too early after ${adaptiveAnswerCount} answers`)
      await reviewButton.click()
      break
    }
    assert(adaptiveAnswerCount < 7, 'adaptive conversation exceeded its seven-question bound')

    const answerField = page.getByLabel('Your answer')
    await answerField.waitFor({ state: 'visible', timeout: 10_000 })
    await answerField.fill(answers[adaptiveAnswerCount])
    const continueButton = page.getByRole('button', { name: 'Continue' })
    await continueButton.click()
    adaptiveAnswerCount += 1

    await page.waitForFunction(() => {
      const field = Array.from(document.querySelectorAll('textarea, input')).find((element) => (
        element.labels && Array.from(element.labels).some(label => label.textContent?.trim() === 'Your answer')
      ))
      const review = Array.from(document.querySelectorAll('button')).some(button => button.textContent?.trim() === 'Review what I heard')
      const confirmation = Array.from(document.querySelectorAll('h1, h2')).some(heading => heading.textContent?.trim() === 'Here’s what I heard')
      return review || confirmation || (field && field.value === '')
    }, null, { timeout: 10_000 })
  }
  await waitForHeading('Here’s what I heard')
  assert(adaptiveAnswerCount >= 5 && adaptiveAnswerCount <= 7, `expected 5–7 questions, completed ${adaptiveAnswerCount}`)
  checkpoint(`adaptive conversation completed in ${adaptiveAnswerCount} questions without methodology chrome`)

  const confirmationParts = page.getByTestId('confirmation-part')
  assert(await confirmationParts.count() === 3, `confirmation must contain three compact parts, found ${await confirmationParts.count()}`)
  assert(await page.getByLabel('Your goal', { exact: true }).isVisible(), 'confirmation is missing Your goal')
  for (const [id, label] of [
    ['ap-role', 'Role or area of work'],
    ['ap-weekly-hours', 'Time available each week'],
    ['ap-coding-comfort', 'Coding comfort'],
    ['ap-constraint', 'Main constraint'],
  ]) {
    assert(await page.locator(`#${id}`).isVisible(), `confirmation is missing ${label}`)
    assert(await page.locator(`label[for="${id}"]`).count() === 1, `${label} is not explicitly labeled`)
  }
  const conversationDetails = page.getByText('Review conversation details', { exact: true })
  assert(await conversationDetails.isVisible(), 'conversation evidence is not available by progressive disclosure')
  const conversationDisclosure = conversationDetails.locator('xpath=ancestor::details')
  assert(await conversationDisclosure.count() === 1, 'Review conversation details must use a native disclosure')
  assert(!(await conversationDisclosure.evaluate(element => element.open)), 'conversation details must be collapsed by default')
  await page.getByLabel('Your goal', { exact: true }).fill(correctedGoal)
  await captureViewport('confirmation', 375, 812)
  await captureViewport('confirmation', 768, 1024)
  await assertInteractiveNames('confirmation')
  await page.getByRole('button', { name: 'Build my path' }).click()

  await waitForHeading('Your AI learning path')
  await assertHeadingFocused('Your AI learning path', 'path')
  assert(sessionRequests.length === 1, `expected one text session request while building the path, saw ${sessionRequests.length}`)
  assert(analysisRequests.length === 1, `expected one analysis request, saw ${analysisRequests.length}`)
  assert(analysisRequests[0].goal === correctedGoal, 'confirmed goal did not reach analysis')
  assert(Array.isArray(analysisRequests[0].reviewedInputs), 'analysis omitted reviewed conversation inputs')
  assert(analysisRequests[0].reviewedInputs.some(input => input.value.includes(privateCanary)), 'conversation evidence was lost before analysis')
  assert(!('evidence' in analysisRequests[0]), 'browser assigned competency evidence')
  checkpoint('three-part confirmation remained editable and reached analysis')

  for (const label of ['Your next skill', 'Your 30-day project', 'Start here']) {
    assert(await page.getByText(label, { exact: true }).isVisible(), `path is missing ${label}`)
  }
  const resourceItems = page.getByTestId('learning-resource')
  const resourceCount = await resourceItems.count()
  assert(resourceCount > 0 && resourceCount <= 3, `path must show 1–3 resources, found ${resourceCount}`)
  assert(!(await page.getByText('This fourth resource must be hidden by the simple path', { exact: true }).isVisible().catch(() => false)), 'path exposed more than three resources')

  const planSummary = page.getByText('See the full four-week plan', { exact: true })
  const whySummary = page.getByText('Why this fits you', { exact: true })
  const privacySummary = page.getByText('Privacy and data', { exact: true })
  for (const [label, summary] of [['plan', planSummary], ['rationale', whySummary], ['privacy', privacySummary]]) {
    assert(await summary.isVisible(), `${label} disclosure is missing`)
    const details = summary.locator('xpath=ancestor::details')
    assert(await details.count() === 1, `${label} disclosure must use native details`)
    assert(!(await details.evaluate(element => element.open)), `${label} disclosure must be collapsed by default`)
  }
  await planSummary.click()
  assert(await planSummary.locator('xpath=ancestor::details').evaluate(element => element.open), 'four-week plan did not expand')
  await privacySummary.click()
  const privacyDetails = privacySummary.locator('xpath=ancestor::details')
  assert(await privacyDetails.evaluate(element => element.open), 'privacy disclosure did not expand')
  assert(await privacyDetails.getByText(/delete|deletion/i).isVisible(), 'privacy disclosure omits deletion')
  checkpoint('single path page shows the decision first and details progressively')

  const firstTaskButton = page.getByRole('button', { name: 'Start my first task' })
  await firstTaskButton.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Mark task complete' }).waitFor({
    state: 'visible',
    timeout: 5_000,
  })
  checkpoint('first action starts from the path page')

  await captureRequiredViewports('path')
  await assertInteractiveNames('path')
  checkpoint('path responsive and named-control audit')

  assert(sessionRequests[0].mode === 'text', 'typed fallback did not create a text session')
  assert(sessionRequests[0].saveTranscript === false, 'session unexpectedly requested transcript persistence')
  assert(paidPathRequests.length === 0, `app attempted a paid Realtime path: ${paidPathRequests.join(', ')}`)
  assert(blockedRequests.length === 0, `app attempted external requests: ${blockedRequests.join(', ')}`)

  const serializedAnalytics = JSON.stringify(analyticsRequests)
  for (const privateText of [qaGoal, correctedGoal, privateCanary, ...answers]) {
    assert(!serializedAnalytics.includes(privateText), `learner-authored text leaked into analytics: ${privateText.slice(0, 40)}`)
  }
  assert(analyticsRequests.every(event => JSON.stringify(event).length < 8 * 1024), 'analytics payload exceeded the intake body budget')
  checkpoint('zero external or paid requests and no learner-text analytics leakage')

  const expectedUnavailableResourceError = 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)'
  const actionableConsoleErrors = consoleErrors.filter((message) => (
    !message.includes('favicon') && message !== expectedUnavailableResourceError
  ))
  assert(actionableConsoleErrors.length === 0, `browser console errors: ${actionableConsoleErrors.join(' | ')}`)

  return {
    ok: true,
    checkpoints,
    journey: ['start', 'conversation', 'confirmation', 'path'],
    questionsAnswered: adaptiveAnswerCount,
    startActions,
    resourcesShown: resourceCount,
    viewports: ['375x812', '768x1024', '1440x900'],
    network: {
      externalRequestsAttempted: blockedRequests.length,
      paidRequestsAllowed: false,
      paidPathRequestsAttempted: paidPathRequests.length,
      sessionRequests: sessionRequests.length,
      analysisRequests: analysisRequests.length,
      analyticsRequests: analyticsRequests.length,
      analyticsSinkAccepted: false,
    },
    artifacts: artifactDir,
  }
}

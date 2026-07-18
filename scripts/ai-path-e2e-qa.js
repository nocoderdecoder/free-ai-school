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

  await page.addInitScript(() => {
    Object.defineProperty(window, '__AI_PATH_QA_MIC_CALLS__', { configurable: true, writable: true, value: 0 })
    Object.defineProperty(window, '__AI_PATH_QA_PEER_CALLS__', { configurable: true, writable: true, value: 0 })
    const mediaDevices = navigator.mediaDevices
    if (mediaDevices) {
      Object.defineProperty(mediaDevices, 'enumerateDevices', {
        configurable: true,
        value: async () => [{ kind: 'audioinput', deviceId: 'qa-default-mic', label: 'QA local microphone', groupId: 'qa' }],
      })
      Object.defineProperty(mediaDevices, 'getUserMedia', {
        configurable: true,
        value: async () => {
          window.__AI_PATH_QA_MIC_CALLS__ += 1
          throw new DOMException('Deterministic QA denied microphone permission.', 'NotAllowedError')
        },
      })
    }
    const GuardedPeerConnection = function GuardedPeerConnection() {
      window.__AI_PATH_QA_PEER_CALLS__ += 1
      throw new Error('Provider-unavailable QA forbids RTCPeerConnection construction.')
    }
    Object.defineProperty(window, 'RTCPeerConnection', { configurable: true, value: GuardedPeerConnection })
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  const welcomeHeading = page.locator('main h1').first()
  await welcomeHeading.waitFor({ state: 'visible', timeout: 15_000 })
  const welcomeHeadingText = (await welcomeHeading.textContent())?.trim() || ''
  assert(welcomeHeadingText.length > 0, 'welcome is missing a clear heading')
  await assertHeadingFocused(welcomeHeadingText, 'welcome')

  const welcomeInputs = page.locator('main textarea:visible, main input:not([type="hidden"]):visible, main select:visible')
  assert(await welcomeInputs.count() === 0, `welcome must begin without form work, found ${await welcomeInputs.count()} field(s)`)
  await captureRequiredViewports('welcome')
  const talkButton = page.getByRole('button', { name: 'Preview microphone setup' })
  await talkButton.waitFor({ state: 'visible' })
  await talkButton.focus()
  const focusStyle = await talkButton.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth }
  })
  assert(focusStyle.outlineStyle !== 'none' && focusStyle.outlineWidth !== '0px', `keyboard focus is not visible: ${JSON.stringify(focusStyle)}`)
  await page.keyboard.press('Enter')
  await waitForHeading('Let’s make sure I can hear you.')
  await assertHeadingFocused('Let’s make sure I can hear you.', 'sound check')
  assert(await page.getByText('Audio stays on this device during this check.', { exact: false }).isVisible(), 'sound check does not clearly state that audio remains local')
  assert(await page.getByText('Live voice is not enabled yet.', { exact: false }).isVisible(), 'provider-unavailable state is not honest')
  assert(await page.evaluate(() => window.__AI_PATH_QA_MIC_CALLS__) === 0, 'sound check requested microphone access before an explicit action')
  assert(await page.evaluate(() => window.__AI_PATH_QA_PEER_CALLS__) === 0, 'sound check constructed a provider peer connection')
  await captureRequiredViewports('sound-check')
  await assertInteractiveNames('sound check')

  await page.getByRole('button', { name: 'Turn on microphone' }).click()
  await page.getByText('Microphone access was not allowed. You can continue by typing.', { exact: true }).waitFor({ state: 'visible' })
  assert(await page.evaluate(() => window.__AI_PATH_QA_MIC_CALLS__) === 1, 'explicit microphone test did not stay on the deterministic local boundary')
  assert(await page.evaluate(() => window.__AI_PATH_QA_PEER_CALLS__) === 0, 'local microphone test constructed a provider peer connection')
  assert(paidPathRequests.length === 0, 'local microphone test attempted a Realtime request')
  await page.getByRole('button', { name: 'Continue by typing' }).click()
  await page.getByLabel('Your answer').waitFor({ state: 'visible', timeout: 15_000 })
  assert(sessionRequests.length === 0, 'the local typed conversation should not create a server session before path generation')
  checkpoint('welcome reached an honest local-only sound check with typed fallback')

  await captureRequiredViewports('conversation')
  await assertInteractiveNames('conversation')
  assert(!(await page.getByText('Conversation outline', { exact: true }).isVisible().catch(() => false)), 'old conversation sidebar is still visible')
  assert(!(await page.getByText('What I am testing', { exact: true }).isVisible().catch(() => false)), 'internal assessment methodology is still visible')

  const answers = [
    qaGoal,
    'Last week I collected six public reports and produced a two-page cited market brief for a colleague.',
    'I compared claims against the original sources, retained claim-level citations, and included a source ledger.',
    'I personally chose the sources, wrote the brief, and designed the reviewer checkpoint; a colleague reviewed the final draft.',
    `${privateCanary}: the inspectable artifact is a cited brief and ledger that a colleague can rerun.`,
    'Citation links drifted, so I tested every claim, removed two unsupported claims, and documented the failure.',
    'I have about three hours each week, use public data, require human review, and prefer a no-code or light-code workflow.',
    'A successful result is a brief another colleague can rerun, inspect, and correct without asking me for hidden context.',
  ]
  let adaptiveAnswerCount = 0
  while (!(await isVisible(page.getByRole('heading', { name: 'Did I understand you correctly?' })))) {
    const reviewButton = page.getByRole('button', { name: 'Review what I heard' })
    if (await isVisible(reviewButton)) {
      assert(adaptiveAnswerCount >= 5, `adaptive conversation ended too early after ${adaptiveAnswerCount} answers`)
      await reviewButton.click()
      break
    }
    assert(adaptiveAnswerCount < 8, 'guided conversation exceeded its eight-turn bound including goal discovery')

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
      const confirmation = Array.from(document.querySelectorAll('h1, h2')).some(heading => heading.textContent?.trim() === 'Did I understand you correctly?')
      return review || confirmation || (field && field.value === '')
    }, null, { timeout: 10_000 })
  }
  await waitForHeading('Did I understand you correctly?')
  assert(adaptiveAnswerCount >= 6 && adaptiveAnswerCount <= 8, `expected 6–8 turns including goal discovery, completed ${adaptiveAnswerCount}`)
  checkpoint(`unified conversation completed in ${adaptiveAnswerCount} questions without intake-form or methodology chrome`)

  const confirmationParts = page.getByTestId('confirmation-part')
  assert(await confirmationParts.count() === 3, `confirmation must contain three compact parts, found ${await confirmationParts.count()}`)
  await page.getByRole('button', { name: 'Edit What you want to improve' }).click()
  assert(await page.getByLabel('Your goal', { exact: true }).isVisible(), 'confirmation is missing Your goal')
  await page.getByLabel('Your goal', { exact: true }).fill(correctedGoal)
  await page.getByRole('button', { name: 'Done What you want to improve' }).click()
  await page.getByRole('button', { name: 'Edit What the plan needs to respect' }).click()
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
  await captureViewport('confirmation', 375, 812)
  await captureViewport('confirmation', 768, 1024)
  await captureViewport('confirmation', 1440, 900)
  await assertInteractiveNames('confirmation')
  await page.getByRole('button', { name: 'Create my path' }).click()

  await waitForHeading('Your 30-day build')
  await assertHeadingFocused('Your 30-day build', 'path')
  assert(sessionRequests.length === 1, `expected one text session request while building the path, saw ${sessionRequests.length}`)
  assert(analysisRequests.length === 1, `expected one analysis request, saw ${analysisRequests.length}`)
  assert(analysisRequests[0].goal === correctedGoal, 'confirmed goal did not reach analysis')
  assert(Array.isArray(analysisRequests[0].reviewedInputs), 'analysis omitted reviewed conversation inputs')
  assert(analysisRequests[0].reviewedInputs.some(input => input.value.includes(privateCanary)), 'conversation evidence was lost before analysis')
  assert(!('evidence' in analysisRequests[0]), 'browser assigned competency evidence')
  checkpoint('three-part confirmation remained editable and reached analysis')

  for (const label of ['Your next skill', 'Your 30-day project', 'Your first 30 minutes']) {
    assert(await page.getByText(label, { exact: true }).isVisible(), `path is missing ${label}`)
  }
  const projectComesFirst = await page.locator('main').evaluate((main) => {
    const elements = Array.from(main.querySelectorAll('*'))
    const project = elements.find(element => element.textContent?.trim() === 'Your 30-day project')
    const skill = elements.find(element => element.textContent?.trim() === 'Your next skill')
    return Boolean(project && skill && elements.indexOf(project) < elements.indexOf(skill))
  })
  assert(projectComesFirst, 'result must present the prescribed project before skill diagnostics')
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

  const firstTaskButton = page.getByRole('button', { name: 'Show me how to start' })
  await firstTaskButton.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Hide starting steps' }).waitFor({
    state: 'visible',
    timeout: 5_000,
  })
  checkpoint('first action starts from the path page')

  await captureRequiredViewports('path')
  await assertInteractiveNames('path')
  checkpoint('path responsive and named-control audit')

  assert(sessionRequests[0].mode === 'text', 'typed fallback did not create a text session')
  assert(sessionRequests[0].saveTranscript === false, 'session unexpectedly requested transcript persistence')
  assert(await page.evaluate(() => window.__AI_PATH_QA_PEER_CALLS__) === 0, 'provider-unavailable journey constructed a peer connection')
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
    journey: ['welcome', 'sound-check', 'conversation', 'understanding', 'project'],
    questionsAnswered: adaptiveAnswerCount,
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

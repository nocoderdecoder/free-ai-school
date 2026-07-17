globalThis.__AI_PATH_QA_RUN__ = async (page) => {
  const baseURL = await page.title()
  const artifactDir = '.'
  if (!baseURL) throw new Error('The bootstrap page title must contain the local AI Path URL')

  const appOrigin = baseURL.split('/').slice(0, 3).join('/')
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(appOrigin)) {
    throw new Error(`QA refuses a non-local target: ${appOrigin}`)
  }

  const failures = []
  const checkpoints = []
  const blockedRequests = []
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
    await page.screenshot({
      path: `${artifactDir}/${name}-${width}x${height}.png`,
      fullPage: true,
    })
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
  const assertHeadingFocused = async (name, label = name) => {
    const heading = page.getByRole('heading', { name }).first()
    await heading.waitFor({ state: 'visible', timeout: 15_000 })
    assert(await heading.evaluate(element => document.activeElement === element), `${label} heading did not receive programmatic focus`)
  }

  const reportGoal = 'Build a citation-preserving weekly market intelligence workflow that colleagues can inspect, rerun, and improve without relying on hidden context.'
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
  const report = {
    reportVersion: '2026-07-16.v1',
    taxonomyVersion: '2026-07-16.v1',
    scoringVersion: '2026-07-16.v1',
    catalogVersion: '2026-07-17.v2',
    generatedAt: '2026-07-17T02:30:00.000Z',
    goal: reportGoal,
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
          ? 'Level 1 is supported by exact learner-reviewed evidence while stronger claims remain deliberately unassessed.'
          : 'No evidence was collected; this is not a zero score.',
      }
    }),
    strengths: [],
    growthAreas: ['workflow-design', 'evaluation-reliability'],
    recommendationStatus: 'available',
    recommendations: [
      {
        id: 'qa-long-resource',
        title: 'Designing a citation-preserving research workflow with explicit review checkpoints, failure recovery, provenance, and maintainable handoff documentation',
        provider: 'Deterministic QA Learning Library',
        canonicalUrl: 'https://example.invalid/blocked-by-local-qa',
        format: 'project',
        free: true,
        costDisclosure: 'Free learning project. The intentionally long disclosure verifies resilient wrapping without requiring a purchase, account, subscription, trial, or paid API.',
        estimatedHours: 2,
        quality: 0.95,
        skills: [{ skillId: 'workflow-design', entryLevel: 1, exitLevel: 2 }],
        prerequisites: [],
        codingRequirement: 'none',
        accountRequirement: 'none',
        paidServiceRequirement: 'none',
        deferredForGoalTypes: [],
        reason: 'This long recommendation reason stress-tests card layout while explaining that the project directly addresses the learner’s reviewed workflow-design gap.',
        rank: 1,
        score: 240,
        matchedSkillIds: ['workflow-design'],
      },
    ],
    disclaimer: 'This learning assessment reflects reviewed evidence and is guidance, not a credential or employment decision.',
  }
  const emptyReport = {
    ...report,
    recommendationStatus: 'no_eligible_resources',
    recommendations: [],
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

  await page.route('**/api/ai-path/session', async (route) => {
    const request = route.request()
    assert(request.method() === 'POST', `unexpected session method ${request.method()}`)
    sessionRequests.push(request.postDataJSON())
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        session: {
          id: 'qa-session-0001',
          status: 'consented',
          createdAt: '2026-07-17T02:29:00.000Z',
          mode: 'text',
          locale: 'en-US',
          goal: reportGoal,
          goalType: 'workflows',
          targetRole: 'Product marketing and research operations lead',
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
    assert((request.headers()['content-type'] || '').startsWith('application/json'), 'analytics request omitted JSON content type')
    const rawBody = request.postData() || ''
    const utf8ByteLength = [...rawBody].reduce((total, character) => {
      const codePoint = character.codePointAt(0)
      return total + (codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4)
    }, 0)
    assert(utf8ByteLength <= 8 * 1024, 'analytics request exceeded the governed 8 KiB limit')
    analyticsRequests.push(request.postDataJSON())
    // The production sink is intentionally latched closed. A 503 must never
    // interrupt the learner flow or encourage the UI to claim external storage.
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
    if (analysisRequests.length === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'analysis_unavailable', details: ['Deterministic QA injected a temporary report failure.'] }),
      })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ report: analysisRequests.length === 2 ? emptyReport : report }),
    })
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await waitForHeading('Find your next useful AI move.')
  await assertHeadingFocused('Find your next useful AI move.', 'landing')
  await assertNoHorizontalOverflow('landing desktop')
  await page.screenshot({ path: `${artifactDir}/landing-1440x900.png`, fullPage: true })
  checkpoint('landing loaded and focused')

  const buildButton = page.getByRole('button', { name: 'Build my plan' })
  await buildButton.focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  const focusStyle = await buildButton.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth }
  })
  assert(focusStyle.outlineStyle !== 'none' && focusStyle.outlineWidth !== '0px', `keyboard focus is not visible: ${JSON.stringify(focusStyle)}`)
  await page.keyboard.press('Enter')
  await waitForHeading('Start with what should change.')
  checkpoint('keyboard entry to profile')

  const longRole = 'Product marketing, customer intelligence, research operations, competitive strategy, enablement, and cross-functional planning lead for a global B2B platform'
  const longOutcome = `${reportGoal} The workflow should retain exact citations, show uncertainty, handle missing sources, preserve a clear reviewer checkpoint, and produce a handoff that remains understandable when project names, market segments, and source titles are unusually long.`
  const longBlocker = 'The calendar is fragmented across meetings and urgent requests, so long courses lose momentum before a useful artifact appears. I need small tasks, explicit stopping points, and a visible proof of progress every week.'
  await page.getByLabel('Your role or area of work').fill(longRole)
  await page.getByLabel('Which work workflow should improve in 30 days?').fill(longOutcome)
  await page.getByLabel('Time available each week').selectOption('3')
  await page.getByLabel('Coding comfort').selectOption({ label: 'Some, but I prefer no-code first' })
  await page.getByLabel('What most often gets in the way?').fill(longBlocker)
  await page.getByLabel(/I agree to send my typed responses/).check()
  await page.getByRole('button', { name: 'Start guided questions' }).click()
  await page.getByRole('progressbar', { name: 'Adaptive interview question 1 of up to 7' }).waitFor({ state: 'visible', timeout: 5_000 })
  checkpoint('text session started')

  const promptResponses = [
    {
      pattern: /Describe one real work process/,
      answer: 'Last week I used a specific research workflow to collect six trustworthy sources and produce a cited brief for a colleague.',
    },
    {
      pattern: /Use one specific occasion/,
      answer: 'For example, the input was six public reports, I compared their claims, and the output was a two-page cited market brief.',
    },
    {
      pattern: /Which parts did you personally decide or complete/,
      answer: 'I personally gathered the sources, decided which claims to retain, mapped citations, and reviewed the handoff; a colleague only reviewed the final draft.',
    },
    {
      pattern: /What inspectable artifact exists/,
      answer: 'I created a two-page market brief with claim-level links and a source ledger; a colleague reran one section and found two unsupported claims out of ten.',
    },
    {
      pattern: /What failed, became unreliable/,
      answer: 'The workflow failed when citations drifted. I tested every claim against its source, reviewed failures, and reduced the brief from ten claims to eight verified claims.',
    },
    {
      pattern: /What data, permission, privacy/,
      answer: 'I avoid private customer data, use public-source notes, label uncertainty, and require human review before external sharing.',
    },
    {
      pattern: /Given your real calendar, tools, and access/,
      answer: 'Meetings break the week into short blocks. I have three hours weekly and need tasks with explicit stopping points and visible proof of progress.',
    },
  ]
  let adaptiveAnswerCount = 0
  while (!(await page.getByRole('heading', { name: 'Here is what I understood.' }).isVisible())) {
    assert(adaptiveAnswerCount < 7, 'adaptive interview exceeded its seven-question bound')
    const currentPrompt = (await page.locator('.ap-advisorQuestion h1').textContent())?.trim() || ''
    const response = promptResponses.find(candidate => candidate.pattern.test(currentPrompt))
    assert(response, `adaptive QA has no semantically matched answer for prompt: ${currentPrompt}`)
    await page.getByLabel('Your response').fill(response.answer)
    await page.getByRole('button', { name: 'Send typed answer' }).click()
    adaptiveAnswerCount += 1
    await page.waitForFunction((previousOrdinal) => (
      document.querySelector('h1')?.textContent?.includes('Here is what I understood.')
      || document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow') !== String(previousOrdinal)
    ), adaptiveAnswerCount, { timeout: 5_000 })
  }
  assert(adaptiveAnswerCount >= 5, `adaptive interview ended too early after ${adaptiveAnswerCount} answers`)
  await waitForHeading('Here is what I understood.')
  assert(await page.locator('.ap-evidenceCount strong').getByText(String(adaptiveAnswerCount + 2), { exact: true }).isVisible(), 'each adaptive answer plus the profile constraint was not preserved as a separate reviewed input')
  assert(await page.locator('.ap-evidenceCount').getByText('included · 0 removed', { exact: true }).isVisible(), 'review input inclusion label is missing')
  for (const [width, height] of [[375, 812], [768, 1024], [1440, 900]]) {
    await captureViewport('review', width, height)
  }
  await assertInteractiveNames('review')
  checkpoint(`adaptive interview completed in ${adaptiveAnswerCount} questions`)

  await page.getByRole('button', { name: 'Edit this' }).first().click()
  const correctedOutcome = `${longOutcome} Correction: the handoff must also explain what happens when a source disappears or a citation cannot be verified.`
  await page.getByLabel('Edit Your 30-day outcome').fill(correctedOutcome)
  await page.getByRole('button', { name: 'Save correction' }).click()
  const correctedConstraint = 'I only have access to free tools, so every exercise needs a tool-free or free-tier fallback.'
  await page.getByRole('button', { name: 'Edit this' }).last().click()
  await page.getByLabel('Edit Profile constraint the plan must respect').fill(correctedConstraint)
  await page.getByRole('button', { name: 'Save correction' }).last().click()
  const privacyCanary = 'QA_PRIVATE_REVIEW_CANARY_DO_NOT_COPY_TO_ANALYTICS'
  const nearLimitReviewedResponse = `${privacyCanary}: ${'A citation-preserving, reviewer-visible workflow step with explicit uncertainty and recovery. '.repeat(21)}`.slice(0, 1_950)
  const nearLimitCard = page.locator('.ap-understandingCard').nth(1)
  await nearLimitCard.getByRole('button', { name: 'Edit this' }).click()
  const nearLimitTextarea = nearLimitCard.locator('textarea')
  assert(await nearLimitTextarea.getAttribute('maxlength') === '2000', 'review correction did not expose the governed 2,000-character limit')
  await nearLimitTextarea.fill(nearLimitReviewedResponse)
  await nearLimitCard.getByRole('button', { name: 'Save correction' }).click()
  await assertNoHorizontalOverflow('review with near-limit response')
  checkpoint('near-limit reviewed content remained layout-safe')

  const removableCard = page.locator('.ap-understandingCard').nth(2)
  const removedReviewedResponse = (await removableCard.locator('.ap-reviewedValue').textContent())?.trim() || ''
  assert(removedReviewedResponse.length > 0, 'remove/restore QA did not capture a reviewed response')
  await removableCard.getByRole('button', { name: 'Remove from report' }).click()
  assert(await removableCard.getByText('Rejected interpretation · excluded from the report', { exact: true }).isVisible(), 'removed interpretation was not visibly excluded')
  assert(await page.locator('.ap-evidenceCount').getByText('included · 1 removed', { exact: true }).isVisible(), 'removed interpretation did not update the included count')
  checkpoint('reviewed interpretation removed before analysis')

  await page.getByRole('button', { name: 'Use this to build my report' }).click()
  const analysisAlert = page.getByRole('alert').filter({ hasText: 'We could not build the report.' })
  await analysisAlert.waitFor({ state: 'visible', timeout: 5_000 })
  assert(await analysisAlert.getByText('Deterministic QA injected a temporary report failure.', { exact: true }).isVisible(), 'temporary report failure was not explained')
  assert(await page.getByText(privacyCanary, { exact: false }).isVisible(), 'reviewed responses were not retained after report failure')
  assert(!analysisRequests[0].reviewedInputs.some(input => input.value === removedReviewedResponse), 'removed interpretation reached the analysis request')
  await removableCard.getByRole('button', { name: 'Restore interpretation' }).click()
  assert(await removableCard.getByRole('button', { name: 'Remove from report' }).isVisible(), 'restored interpretation did not return to the included state')
  await analysisAlert.getByRole('button', { name: 'Try again' }).click()
  await waitForHeading(/Working direction:/)
  await assertHeadingFocused(/Working direction:/, 'empty report')
  assert(await page.getByRole('status').filter({ hasText: 'No governed resource fits this report yet.' }).isVisible(), 'empty recommendation state was not rendered')
  assert(await page.getByText('The current evidence, prerequisites, format, and time filters produced no eligible match.', { exact: false }).isVisible(), 'empty recommendation state omitted recovery context')
  await page.getByRole('button', { name: 'Edit what we understood' }).click()
  await assertHeadingFocused('Here is what I understood.', 'return to reviewed understanding')
  await page.getByRole('button', { name: 'Use this to build my report' }).click()
  await waitForHeading(/Working direction:/)
  await assertHeadingFocused(/Working direction:/, 'populated report')
  assert(await page.getByText('2 skills assessed', { exact: false }).isVisible(), 'report did not display assessed skill count')
  assert(await page.getByText('No evidence was collected; this is not a zero score.').first().isVisible(), 'unassessed skills were not explicit')
  assert(await page.getByText('Designing a citation-preserving research workflow', { exact: false }).isVisible(), 'long recommendation was not rendered')
  checkpoint('report failure recovery, empty state, and populated report rendered')

  assert(sessionRequests.length === 1, `expected one session request, saw ${sessionRequests.length}`)
  assert(sessionRequests[0].mode === 'text', 'session did not use text mode')
  assert(sessionRequests[0].saveTranscript === false, 'session unexpectedly requested transcript persistence')
  assert(analysisRequests.length === 3, `expected three analysis attempts, saw ${analysisRequests.length}`)
  assert(!('evidence' in analysisRequests[0]), 'browser assigned competency evidence')
  assert(Array.isArray(analysisRequests[0].reviewedInputs), 'analysis omitted reviewed inputs')
  assert(analysisRequests[0].reviewedInputs[0].value === correctedOutcome, 'review correction did not reach analysis request')
  assert(analysisRequests[0].goal === correctedOutcome, 'reviewed goal did not become the analysis goal')
  assert(analysisRequests[0].reviewedInputs.at(-1).value === correctedConstraint, 'reviewed constraint did not reach analysis')
  assert(analysisRequests.every(request => request.reviewedInputs.some(input => input.value === nearLimitReviewedResponse)), 'near-limit reviewed response was not retained across report retries')
  assert(analysisRequests.slice(1).every(request => request.reviewedInputs.some(input => input.value === removedReviewedResponse)), 'restored interpretation did not reach later report attempts')
  assert(analysisRequests.every(request => request.codingPreference === 'no-code'), 'coding comfort was not carried into governed recommendation selection')
  checkpoint('request trust boundary validated')

  for (const [width, height] of [[375, 812], [768, 1024], [1440, 900]]) {
    await captureViewport('results', width, height)
  }
  await assertInteractiveNames('results')
  checkpoint('results responsive and named-control audit')

  const planFitFieldset = page.locator('fieldset').filter({ hasText: 'How well does the plan fit your goal and constraints?' })
  const reportUsefulnessFieldset = page.locator('fieldset').filter({ hasText: 'How useful is the report for deciding what to do next?' })
  const planFitFive = planFitFieldset.getByRole('radio', { name: '5', exact: true })
  await planFitFive.focus()
  assert(await planFitFive.evaluate(element => document.activeElement === element), 'plan-fit rating was not keyboard focusable')
  await page.keyboard.press('Space')
  assert(await planFitFive.isChecked(), 'Space did not select the plan-fit rating')
  const reportUsefulFour = reportUsefulnessFieldset.getByRole('radio', { name: '4', exact: true })
  await reportUsefulFour.focus()
  await page.keyboard.press('Space')
  assert(await reportUsefulFour.isChecked(), 'Space did not select the report-usefulness rating')
  await page.getByLabel(/How many of the .* skill findings are materially wrong/).selectOption('1')
  const feedbackButton = page.getByRole('button', { name: 'Submit numeric feedback' })
  assert(await feedbackButton.isEnabled(), 'numeric feedback submission did not enable after both ratings')
  await feedbackButton.focus()
  await page.keyboard.press('Enter')
  const feedbackStatus = page.getByRole('status').filter({ hasText: 'production analytics sink is still disabled' })
  await feedbackStatus.waitFor({ state: 'visible', timeout: 5_000 })
  assert(await feedbackStatus.getAttribute('aria-live') === 'polite', 'feedback status was not announced politely')
  checkpoint('keyboard numeric feedback and closed-sink recovery')

  await page.getByRole('button', { name: 'Open my 30-day plan' }).first().click()
  await page.locator('.ap-planTitle h1').waitFor({ state: 'visible', timeout: 15_000 })
  assert(await page.locator('.ap-planTitle h1').evaluate(element => document.activeElement === element), 'plan heading did not receive programmatic focus')
  assert(await page.getByText('The first week includes the application-owned access recovery pattern.', { exact: true }).isVisible(), 'reviewed constraint did not causally change the personalized plan')
  await page.setViewportSize({ width: 1440, height: 900 })
  const firstTask = page.locator('.ap-weekList article').first().locator('li strong').first()
  let originalFirstTask = (await firstTask.textContent()).trim()

  const pinButton = page.getByRole('button', { name: 'Pin in this browser tab' })
  await pinButton.focus()
  await page.keyboard.press('Enter')
  assert(await page.getByRole('button', { name: 'Pinned in this browser tab' }).isVisible(), 'keyboard activation did not pin the plan')
  await page.locator('.ap-weekList input[type="checkbox"]').first().check()
  assert(await page.getByText('8%', { exact: true }).isVisible(), 'task completion did not update progress to 8%')
  await page.getByLabel('Weekly time budget').selectOption('1')
  await page.getByRole('button', { name: 'Confirm schedule change' }).click()
  assert(await page.getByText('0%', { exact: true }).isVisible(), 'schedule change did not reset preview progress')
  assert(await page.getByText('Time budget changed to 1 hour per week.', { exact: false }).isVisible(), 'time-budget status was not announced')
  originalFirstTask = (await firstTask.textContent()).trim()
  checkpoint('task completion and time-budget recalculation')

  await page.getByRole('button', { name: 'Use smaller alternatives this week' }).first().click()
  const smallerFirstTask = (await firstTask.textContent()).trim()
  assert(smallerFirstTask !== originalFirstTask && smallerFirstTask.includes('Create a one-page example'), 'smaller alternative did not replace week tasks')
  await page.getByRole('button', { name: 'Restore original tasks' }).first().click()
  assert((await firstTask.textContent()).trim() === originalFirstTask, 'original week tasks were not restored')
  checkpoint('smaller alternatives and restore')

  const checkIn = page.getByLabel('What worked, and what got in the way?')
  await checkIn.fill('I was busy, missed the second task, and need a smaller plan next week.')
  await page.getByRole('button', { name: 'Propose an adaptation' }).click()
  await page.getByText('Protect one essential task next week').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Keep current plan' }).click()
  assert(await page.getByText('Proposal rejected. The current plan remains unchanged.').isVisible(), 'rejection was not announced')
  assert((await firstTask.textContent()).trim() === originalFirstTask, 'rejected proposal changed the task')

  await checkIn.fill('I am stuck and blocked by a citation error that I cannot reproduce reliably.')
  await page.getByRole('button', { name: 'Propose an adaptation' }).click()
  await page.getByText('Replace the next task with a smaller diagnostic').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Accept proposal' }).click()
  assert(await page.getByText('Accepted: Replace the next task with a smaller diagnostic.', { exact: false }).isVisible(), 'acceptance was not announced')
  assert((await firstTask.textContent()).includes('Run a 30-minute diagnostic'), 'accepted proposal did not change the next incomplete task')
  checkpoint('check-in rejection and acceptance')

  for (const [width, height] of [[375, 812], [768, 1024], [1440, 900]]) {
    await captureViewport('plan', width, height)
  }
  await assertInteractiveNames('plan')
  checkpoint('plan responsive and named-control audit')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export report & plan' }).click()
  const download = await downloadPromise
  assert(download.suggestedFilename() === 'ai-path-plan.json', `unexpected export filename ${download.suggestedFilename()}`)
  await download.saveAs(`${artifactDir}/ai-path-plan.json`)
  const exportStream = await download.createReadStream()
  let exportText = ''
  for await (const chunk of exportStream) exportText += chunk.toString('utf8')
  const exported = JSON.parse(exportText)
  assert(exported.report.reportVersion === '2026-07-16.v1', 'export omitted the report version')
  assert(exported.report.catalogVersion === '2026-07-17.v2', 'export omitted the catalog version')
  assert(exported.plan.weeklyHours === 1, 'export omitted the changed time budget')
  assert(exported.plan.adaptationStatus.includes('Accepted:'), 'export omitted the accepted adaptation status')
  await page.getByText('Export prepared.', { exact: false }).waitFor({ state: 'visible' })
  checkpoint('download export validated')

  await page.getByRole('button', { name: 'View preview history' }).click()
  await waitForHeading('Plans are snapshots, not permanent labels.')
  assert(await page.locator('.ap-historyList article.is-current dt').getByText('Time budget', { exact: true }).isVisible(), 'history omitted time budget')
  await page.getByRole('button', { name: 'Start a short reassessment' }).click()
  await waitForHeading('Start with what should change.')
  checkpoint('history and reassessment reset')

  await page.getByRole('button', { name: 'Delete browser preview' }).click()
  await waitForHeading('Find your next useful AI move.')
  await assertHeadingFocused('Find your next useful AI move.', 'post-deletion landing')
  assert(await page.getByRole('button', { name: 'Build my plan' }).isVisible(), 'deletion did not return to an empty landing state')
  checkpoint('browser-preview deletion')

  const analyticsPropertyKeys = {
    landing_viewed: ['audience', 'source'],
    profile_completed: ['audience', 'pathIntent', 'weeklyHoursBand'],
    assessment_started: ['audience', 'mode'],
    assessment_completed: ['audience', 'durationSeconds', 'mode'],
    understanding_reviewed: ['audience', 'correctionCount', 'removedObservationCount'],
    report_viewed: ['audience', 'resultStatus'],
    plan_saved: ['audience', 'planVersion'],
    first_task_started: ['audience', 'taskKind'],
    first_task_completed: ['audience', 'elapsedMinutes', 'taskKind'],
    feedback_submitted: ['audience', 'planFitRating', 'reportUsefulnessRating'],
    finding_feedback_submitted: ['audience', 'materiallyWrongFindings', 'totalFindings'],
    data_deleted: ['audience', 'scope'],
  }
  const expectedEventCounts = {
    landing_viewed: 1,
    profile_completed: 1,
    assessment_started: 1,
    assessment_completed: 1,
    understanding_reviewed: 3,
    report_viewed: 2,
    plan_saved: 1,
    first_task_started: 1,
    first_task_completed: 1,
    feedback_submitted: 1,
    finding_feedback_submitted: 1,
    data_deleted: 1,
  }
  const eventCounts = analyticsRequests.reduce((counts, event) => ({
    ...counts,
    [event.eventName]: (counts[event.eventName] || 0) + 1,
  }), {})
  assert(Object.keys(eventCounts).length === Object.keys(expectedEventCounts).length, `unexpected governed analytics events: ${JSON.stringify(eventCounts)}`)
  for (const [eventName, expectedCount] of Object.entries(expectedEventCounts)) {
    assert(eventCounts[eventName] === expectedCount, `expected ${expectedCount} ${eventName} event(s), saw ${eventCounts[eventName] || 0}`)
  }
  const anonymousIds = new Set(analyticsRequests.map(event => event.anonymousId))
  assert(anonymousIds.size === 1, 'analytics rotated or correlated more than one anonymous browser identifier')
  const [anonymousId] = anonymousIds
  assert(/^anon_[a-f0-9]{32}$/.test(anonymousId), `anonymous analytics id was not opaque: ${anonymousId}`)
  const sessionEvents = new Set([
    'assessment_started',
    'assessment_completed',
    'understanding_reviewed',
    'report_viewed',
    'plan_saved',
    'first_task_started',
    'first_task_completed',
    'feedback_submitted',
    'finding_feedback_submitted',
  ])
  const assessmentIds = new Set(analyticsRequests.filter(event => sessionEvents.has(event.eventName)).map(event => event.assessmentSessionId))
  assert(assessmentIds.size === 1, 'session-scoped analytics did not use one opaque assessment identifier')
  const [assessmentId] = assessmentIds
  assert(/^assessment_[a-f0-9]{32}$/.test(assessmentId), `assessment analytics id was not opaque: ${assessmentId}`)
  for (const event of analyticsRequests) {
    assert(event.measurementVersion === '2026-07-16.v1', `${event.eventName} used an unexpected measurement version`)
    assert(Number.isFinite(Date.parse(event.occurredAt)), `${event.eventName} omitted a valid occurrence time`)
    assert(JSON.stringify(Object.keys(event).sort()) === JSON.stringify(['anonymousId', 'assessmentSessionId', 'eventName', 'measurementVersion', 'occurredAt', 'properties']), `${event.eventName} emitted unexpected envelope fields`)
    assert(Object.prototype.hasOwnProperty.call(analyticsPropertyKeys, event.eventName), `ungoverned analytics event emitted: ${event.eventName}`)
    assert(JSON.stringify(Object.keys(event.properties).sort()) === JSON.stringify(analyticsPropertyKeys[event.eventName]), `${event.eventName} emitted unexpected property fields: ${JSON.stringify(event.properties)}`)
    assert(event.properties.audience === 'workflow-builder-alpha', `${event.eventName} used an unexpected audience`)
    assert(sessionEvents.has(event.eventName) ? event.assessmentSessionId === assessmentId : event.assessmentSessionId === null, `${event.eventName} used an invalid assessment identifier scope`)
  }
  const serializedAnalytics = JSON.stringify(analyticsRequests)
  for (const privateText of [privacyCanary, longRole, longOutcome, longBlocker, correctedOutcome, correctedConstraint]) {
    assert(!serializedAnalytics.includes(privateText), `learner-authored text leaked into analytics: ${privateText.slice(0, 40)}`)
  }
  const feedbackEvent = analyticsRequests.find(event => event.eventName === 'feedback_submitted')
  assert(feedbackEvent.properties.planFitRating === 5 && feedbackEvent.properties.reportUsefulnessRating === 4, 'numeric feedback payload did not match keyboard selections')
  const findingFeedbackEvent = analyticsRequests.find(event => event.eventName === 'finding_feedback_submitted')
  assert(findingFeedbackEvent.properties.totalFindings === skillIds.length && findingFeedbackEvent.properties.materiallyWrongFindings === 1, 'numeric finding feedback payload was incorrect')
  assert(analyticsRequests.every(event => JSON.stringify(event).length < 8 * 1024), 'analytics payload exceeded the intake body budget')
  checkpoint('analytics envelope, governance, opaque identity, and no-free-text invariants')

  assert(blockedRequests.length === 0, `the app attempted external requests: ${blockedRequests.join(', ')}`)
  const expectedUnavailableResourceError = 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)'
  const expectedUnavailableConsoleErrors = consoleErrors.filter(message => message === expectedUnavailableResourceError)
  assert(expectedUnavailableConsoleErrors.length <= analyticsRequests.length + 1, 'more 503 console messages appeared than the intercepted analytics and injected report failures can explain')
  const actionableConsoleErrors = consoleErrors.filter((message) => (
    !message.includes('favicon') && message !== expectedUnavailableResourceError
  ))
  assert(actionableConsoleErrors.length === 0, `browser console errors: ${actionableConsoleErrors.join(' | ')}`)

  return {
    ok: failures.length === 0,
    checkpoints,
    viewports: ['375x812', '768x1024', '1440x900'],
    network: {
      externalRequestsAttempted: blockedRequests.length,
      paidRequestsAllowed: false,
      sessionRequests: sessionRequests.length,
      analysisRequests: analysisRequests.length,
      analyticsRequests: analyticsRequests.length,
      analyticsSinkAccepted: false,
      expectedUnavailableConsoleErrors: expectedUnavailableConsoleErrors.length,
    },
    artifacts: artifactDir,
  }
}

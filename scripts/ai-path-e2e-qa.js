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
    catalogVersion: '2026-07-16.v1',
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
        reason: 'This long recommendation reason stress-tests card layout while explaining that the project directly addresses the learner’s reviewed workflow-design gap.',
        rank: 1,
        score: 240,
        matchedSkillIds: ['workflow-design'],
      },
    ],
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
  await waitForHeading('Find your next useful AI move.')
  assert((await page.locator('h1').first().evaluate((element) => document.activeElement === element)), 'landing heading did not receive programmatic focus')
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
  await page.getByLabel('What would you like to be able to do?').fill(longOutcome)
  await page.getByLabel('Time available each week').selectOption('3')
  await page.getByLabel('Coding comfort').selectOption({ label: 'Some, but I prefer no-code first' })
  await page.getByLabel('What most often gets in the way?').fill(longBlocker)
  await page.getByLabel(/I agree to send my typed responses/).check()
  await page.getByRole('button', { name: 'Start guided questions' }).click()
  await waitForHeading(/Imagine this goes well/)
  checkpoint('text session started')

  const answers = [
    'In 30 days I can collect six trustworthy sources, extract claims with exact citations, compare disagreements, and publish a weekly brief that a colleague can rerun without asking me for hidden context.',
    'Last week I gathered sources manually, pasted notes into a chat tool, and reorganized the output myself. It broke when citations drifted from claims, duplicate facts looked independent, and I had no repeatable quality check before sharing.',
    'Meetings break the week into short blocks. I abandon plans when a task needs an uninterrupted evening or when the learning material delays the first useful artifact for too long.',
  ]
  for (let index = 0; index < answers.length; index += 1) {
    await page.getByLabel('Your response').fill(answers[index])
    await page.getByRole('button', { name: 'Send typed answer' }).click()
    if (index < answers.length - 1) {
      await page.getByText(`Phase ${index + 2} of 3`).waitFor({ state: 'visible', timeout: 5_000 })
    }
  }
  await waitForHeading('Here is what I understood.')
  assert(await page.locator('.ap-evidenceCount strong').getByText('3', { exact: true }).isVisible(), 'three interview answers were not captured')
  assert(await page.locator('.ap-evidenceCount').getByText('reviewable inputs', { exact: true }).isVisible(), 'review input count label is missing')
  checkpoint('three-question interview completed')

  await page.getByRole('button', { name: 'Edit this' }).first().click()
  const correctedOutcome = `${answers[0]} Correction: the handoff must also explain what happens when a source disappears or a citation cannot be verified.`
  await page.getByLabel('Edit Your 30-day outcome').fill(correctedOutcome)
  await page.getByRole('button', { name: 'Save correction' }).click()
  await page.getByRole('button', { name: 'Use this to build my report' }).click()
  await waitForHeading(/Working direction:/)
  assert(await page.getByText('2 skills assessed', { exact: false }).isVisible(), 'report did not display assessed skill count')
  assert(await page.getByText('No evidence was collected; this is not a zero score.').first().isVisible(), 'unassessed skills were not explicit')
  assert(await page.getByText('Designing a citation-preserving research workflow', { exact: false }).isVisible(), 'long recommendation was not rendered')
  checkpoint('review correction and deterministic report rendered')

  assert(sessionRequests.length === 1, `expected one session request, saw ${sessionRequests.length}`)
  assert(sessionRequests[0].mode === 'text', 'session did not use text mode')
  assert(sessionRequests[0].saveTranscript === false, 'session unexpectedly requested transcript persistence')
  assert(analysisRequests.length === 1, `expected one analysis request, saw ${analysisRequests.length}`)
  assert(!('evidence' in analysisRequests[0]), 'browser assigned competency evidence')
  assert(Array.isArray(analysisRequests[0].reviewedInputs), 'analysis omitted reviewed inputs')
  assert(analysisRequests[0].reviewedInputs[0].value === correctedOutcome, 'review correction did not reach analysis request')
  checkpoint('request trust boundary validated')

  for (const [width, height] of [[375, 812], [768, 1024], [1440, 900]]) {
    await captureViewport('results', width, height)
  }
  await assertInteractiveNames('results')
  checkpoint('results responsive and named-control audit')

  await page.getByRole('button', { name: 'Open my 30-day plan' }).first().click()
  await page.locator('.ap-planTitle h1').waitFor({ state: 'visible', timeout: 15_000 })
  await page.setViewportSize({ width: 1440, height: 900 })
  const firstTask = page.locator('.ap-weekList article').first().locator('li strong').first()
  const originalFirstTask = (await firstTask.textContent()).trim()

  await page.locator('.ap-weekList input[type="checkbox"]').first().check()
  assert(await page.getByText('8%', { exact: true }).isVisible(), 'task completion did not update progress to 8%')
  await page.getByLabel('Weekly time budget').selectOption('1')
  await page.getByRole('button', { name: 'Confirm schedule change' }).click()
  assert(await page.getByText('0%', { exact: true }).isVisible(), 'schedule change did not reset preview progress')
  assert(await page.getByText('Time budget changed to 1 hour per week.', { exact: false }).isVisible(), 'time-budget status was not announced')
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
  assert(await page.getByRole('button', { name: 'Build my plan' }).isVisible(), 'deletion did not return to an empty landing state')
  checkpoint('browser-preview deletion')

  assert(blockedRequests.length === 0, `the app attempted external requests: ${blockedRequests.join(', ')}`)
  const actionableConsoleErrors = consoleErrors.filter((message) => !message.includes('favicon'))
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
    },
    artifacts: artifactDir,
  }
}

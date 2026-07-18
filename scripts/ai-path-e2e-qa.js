globalThis.__AI_PATH_QA_RUN__ = async (page) => {
  const baseURL = await page.title()
  const artifactDir = '../ai-path'
  if (!baseURL) throw new Error('The bootstrap page title must contain the local AI Path URL')

  const appOrigin = baseURL.split('/').slice(0, 3).join('/')
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(appOrigin)) {
    throw new Error(`QA refuses a non-local target: ${appOrigin}`)
  }

  const checkpoints = []
  const externalRequests = []
  const apiRequests = []
  const consoleErrors = []

  const assert = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const checkpoint = (name) => checkpoints.push(name)
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
          ? Array.from(element.labels).map(item => item.textContent || '').join(' ')
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
  const assertSixSections = async (pathName) => {
    const formSections = page.locator('.ap-ds-sections .ap-ds-section')
    assert(await formSections.count() === 6, `${pathName} must expose exactly six diagnostic sections`)
    const indexItems = page.getByRole('complementary', { name: 'Diagnostic sections' }).locator('ol > li')
    assert(await indexItems.count() === 6, `${pathName} index must expose exactly six sections`)
  }
  const choose = async (groupName, optionName) => {
    const group = page.getByRole('group', { name: groupName })
    const optionPattern = new RegExp(String(optionName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const radio = group.getByRole('radio', { name: optionPattern })
    if (await radio.count()) {
      await radio.first().check()
      return
    }
    const checkbox = group.getByRole('checkbox', { name: optionPattern })
    assert(await checkbox.count() > 0, `could not find ${optionName} in ${groupName}`)
    await checkbox.first().check()
  }

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => consoleErrors.push(error.message))

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
    externalRequests.push(requestURL)
    await route.abort('blockedbyclient')
  })

  await page.route('**/api/**', async route => {
    apiRequests.push(`${route.request().method()} ${route.request().url()}`)
    await route.abort('blockedbyclient')
  })

  await page.addInitScript(() => {
    Object.defineProperty(window, '__AI_PATH_QA_MIC_CALLS__', { configurable: true, writable: true, value: 0 })
    Object.defineProperty(window, '__AI_PATH_QA_PEER_CALLS__', { configurable: true, writable: true, value: 0 })
    const mediaDevices = navigator.mediaDevices
    if (mediaDevices) {
      Object.defineProperty(mediaDevices, 'enumerateDevices', {
        configurable: true,
        value: async () => [{ kind: 'audioinput', deviceId: 'qa-local-mic', label: 'QA local microphone', groupId: 'qa' }],
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
      throw new Error('Diagnostic Studio QA forbids peer connection construction.')
    }
    Object.defineProperty(window, 'RTCPeerConnection', { configurable: true, value: GuardedPeerConnection })
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'Bring a use case—or discover your next capability.' }).waitFor({ state: 'visible', timeout: 15_000 })

  const pathSelector = page.locator('.ap-ds-pathSelector')
  const pathButtons = pathSelector.getByRole('button')
  assert(await pathButtons.count() === 2, `expected exactly two diagnostic choices, found ${await pathButtons.count()}`)
  const useCaseChoice = page.getByRole('button', { name: /I have an AI use case/ })
  const capabilityChoice = page.getByRole('button', { name: /I want to grow my AI skills/ })
  assert(await useCaseChoice.isVisible() && await capabilityChoice.isVisible(), 'the two exact diagnostic paths are not visible')
  assert(await useCaseChoice.getAttribute('aria-pressed') === 'false', 'use-case path should not be preselected')
  assert(await capabilityChoice.getAttribute('aria-pressed') === 'false', 'capability path should not be preselected')
  assert(await page.evaluate(() => window.__AI_PATH_QA_MIC_CALLS__) === 0, 'initial render requested microphone access')
  assert(await page.evaluate(() => window.__AI_PATH_QA_PEER_CALLS__) === 0, 'initial render constructed a peer connection')
  await assertInteractiveNames('diagnostic chooser')
  await captureRequiredViewports('diagnostic-chooser')
  checkpoint('two exact diagnostic paths render without automatic microphone or network activity')

  await page.setViewportSize({ width: 1440, height: 900 })
  await useCaseChoice.focus()
  const focusStyle = await useCaseChoice.evaluate(element => {
    const style = window.getComputedStyle(element)
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth }
  })
  assert(focusStyle.outlineStyle !== 'none' && focusStyle.outlineWidth !== '0px', `path choice lacks visible keyboard focus: ${JSON.stringify(focusStyle)}`)
  await page.keyboard.press('Enter')
  assert(await useCaseChoice.getAttribute('aria-pressed') === 'true', 'keyboard activation did not select the use-case path')
  await assertSixSections('use-case')

  const outcomeLabel = 'What do you want AI to help someone accomplish?'
  const outcomeField = page.getByLabel(outcomeLabel, { exact: true })
  assert(await outcomeField.count() === 1, 'voice and typing must share one use-case outcome field')
  assert(await page.evaluate(() => window.__AI_PATH_QA_MIC_CALLS__) === 0, 'choosing a path automatically requested microphone access')
  await page.getByRole('button', { name: `Answer ${outcomeLabel} by voice` }).click()
  await page.getByText('Microphone access was not allowed. You can continue by typing.', { exact: true }).waitFor({ state: 'visible' })
  assert(await page.evaluate(() => window.__AI_PATH_QA_MIC_CALLS__) === 1, 'explicit Voice action did not reach the deterministic microphone boundary once')
  assert(await page.evaluate(() => window.__AI_PATH_QA_PEER_CALLS__) === 0, 'Voice action constructed a peer connection')
  assert(await outcomeField.isVisible(), 'typing disappeared after voice permission denial')

  await outcomeField.fill('Help salespeople answer RFP questions from approved company documents with citations and human review.')
  await page.getByLabel('How is this handled today, and where does it become unreliable?', { exact: true }).fill('Salespeople search old proposals, copy prior answers, and ask legal and product teams to verify every claim; outdated language is the main failure point.')
  await page.getByLabel('What information goes in?', { exact: true }).fill('Approved product documents, security policies, legal language, and historical proposals')
  await page.getByLabel('What should come out?', { exact: true }).fill('A draft RFP response with a source citation and confidence indicator')
  await page.getByLabel('How will you know it works?', { exact: true }).fill('Reduce first-draft time by 50 percent and require every answer to cite approved material.')

  assert(!(await page.getByLabel('What did you personally make or test, and what happened?', { exact: true }).isVisible().catch(() => false)), 'experience evidence appeared before a supported conditional choice')
  await choose('How far have you taken this idea?', 'Modified for my problem')
  const useCaseEvidence = page.getByLabel('What did you personally make or test, and what happened?', { exact: true })
  await useCaseEvidence.waitFor({ state: 'visible' })
  await useCaseEvidence.fill('I tested prompt variations on ten historical RFP questions, recorded unsupported statements, and retained the strongest cited version for review.')
  checkpoint('use-case conditional evidence appears only after an evidence-bearing experience claim')

  await choose('Data sensitivity', 'Confidential')
  await choose('If the result is wrong', 'Serious')
  await choose('Human approval before action', 'Required')
  await page.getByLabel('Systems or data sources Optional').fill('Approved company Drive and CRM')
  await page.getByText('Guardrail required.', { exact: false }).waitFor({ state: 'visible' })
  await page.getByLabel('Your role in this work', { exact: true }).fill('Sales operations manager')
  await page.getByLabel('Hours available each week', { exact: true }).fill('5')
  await choose('Coding comfort', 'Modify examples')
  await choose('Preferred approach', 'Open to either')
  await choose('Working mode', 'With a team')
  await choose('Tool budget', 'Organisation decides')
  await page.getByText('All six signals captured', { exact: true }).waitFor({ state: 'visible' })
  await assertInteractiveNames('completed use-case diagnostic')
  await captureRequiredViewports('use-case-diagnostic')

  await page.getByRole('button', { name: 'Create my recommendation' }).click()
  const useCaseResult = page.locator('main[data-result-kind="use-case-blueprint"]')
  await useCaseResult.waitFor({ state: 'visible', timeout: 15_000 })
  assert(await useCaseResult.getByText('Use-case blueprint', { exact: true }).isVisible(), 'use-case path omitted its result kind')
  for (const label of ['Smallest useful prototype', 'Recommended system', 'Definition of done', 'Risk level', 'What to learn for this build']) {
    assert(await useCaseResult.getByText(label, { exact: true }).isVisible(), `use-case blueprint is missing ${label}`)
  }
  const useCaseTitle = (await useCaseResult.getByRole('heading', { level: 1 }).textContent())?.trim() || ''
  assert(useCaseTitle.startsWith('Build a reviewable'), `unexpected use-case blueprint title: ${useCaseTitle}`)
  await captureRequiredViewports('use-case-blueprint')
  await assertInteractiveNames('use-case blueprint')
  checkpoint('use-case path produces a distinct local blueprint with prototype, architecture, evaluation, and risk')

  await useCaseResult.getByRole('button', { name: 'Mark as my next action' }).click()
  assert(await useCaseResult.getByRole('button', { name: 'Next action saved' }).isVisible(), 'next-action toggle did not preserve its state')
  await useCaseResult.getByRole('button', { name: 'Edit diagnostic' }).click()
  await outcomeField.waitFor({ state: 'visible' })
  assert(await outcomeField.inputValue() === 'Help salespeople answer RFP questions from approved company documents with citations and human review.', 'Edit diagnostic discarded use-case answers')
  assert(await useCaseEvidence.isVisible(), 'Edit diagnostic discarded the conditional evidence section')
  await outcomeField.fill('Help salespeople answer security questionnaires from approved documents with citations and human review.')
  await page.getByRole('button', { name: 'Create my recommendation' }).click()
  await useCaseResult.waitFor({ state: 'visible' })
  assert((await useCaseResult.getByRole('heading', { level: 1 }).textContent())?.includes('draft RFP response'), 'edited inputs did not regenerate the local blueprint')
  await useCaseResult.getByRole('button', { name: 'Start a new diagnostic' }).click()
  await page.getByRole('heading', { name: 'Bring a use case—or discover your next capability.' }).waitFor({ state: 'visible' })
  assert(await page.locator('.ap-ds-workbench').count() === 0, 'restart did not clear the selected diagnostic')
  assert(await useCaseChoice.getAttribute('aria-pressed') === 'false' && await capabilityChoice.getAttribute('aria-pressed') === 'false', 'restart did not reset both path choices')
  checkpoint('use-case result supports edit, local regeneration, and full restart')

  await capabilityChoice.click()
  await assertSixSections('capability-growth')
  await page.getByLabel('Your role or working context', { exact: true }).fill('Operations analyst responsible for support quality and routing')
  await choose(/Where would you most like AI to expand what you can do?/, 'Automate workflows')
  await choose(/Where would you most like AI to expand what you can do?/, 'Work with data and knowledge')

  await page.locator('#ap-level-ai-assisted-work').selectOption('adapted')
  await page.locator('#ap-level-automation').selectOption('guided')
  await page.locator('#ap-level-applications').selectOption('guided')
  await page.locator('#ap-level-data-retrieval').selectOption('exposure')
  await page.locator('#ap-level-evaluation-safety').selectOption('none')
  const evidenceField = page.getByLabel('Tell us about the strongest one or two things you have actually done with AI.', { exact: true })
  await evidenceField.fill('I made and revised a support-ticket summarization prompt for my own process, compared results manually, and documented recurring failures.')
  const supportedEvidence = page.getByRole('group', { name: 'Which claims does this evidence support?' })
  await supportedEvidence.getByLabel('ai-assisted-work', { exact: true }).check()
  assert(await supportedEvidence.isVisible(), 'capability evidence linkage did not appear for an adapted claim')
  checkpoint('capability path requires explicit evidence linkage for higher experience claims')

  await page.getByLabel('What would you do, and why?', { exact: true }).fill('I would create expected examples, measure incorrect outputs, require a person to review uncertain cases, and test failure behavior before sending anything automatically.')
  await choose('Coding', 'Modify examples')
  await choose('Data', 'Spreadsheets')
  await page.getByRole('group', { name: /AI tools used/ }).getByLabel('ChatGPT', { exact: true }).check()
  await page.getByLabel('Hours available each week', { exact: true }).fill('4')
  await choose('Learning preference', 'Balanced')
  await choose('Desired pace', '30-day sprint')
  await choose('Resources', 'Free only')
  await choose('Public project allowed', 'Yes')
  await page.getByText('All six signals captured', { exact: true }).waitFor({ state: 'visible' })
  await assertInteractiveNames('completed capability diagnostic')
  await captureRequiredViewports('capability-diagnostic')

  await page.getByRole('button', { name: 'Create my recommendation' }).click()
  const capabilityResult = page.locator('main[data-result-kind="capability-prescription"]')
  await capabilityResult.waitFor({ state: 'visible', timeout: 15_000 })
  assert(await capabilityResult.getByText('Capability prescription', { exact: true }).isVisible(), 'capability path omitted its result kind')
  for (const label of ['Recommended project', 'Recommended next capability', 'Evidence-based profile', 'Untested, not “beginner”']) {
    assert(await capabilityResult.getByText(label, { exact: true }).isVisible(), `capability prescription is missing ${label}`)
  }
  const capabilityTitle = (await capabilityResult.getByRole('heading', { level: 1 }).textContent())?.trim() || ''
  assert(capabilityTitle.startsWith('Your next capability:'), `unexpected capability prescription title: ${capabilityTitle}`)
  assert(capabilityTitle !== useCaseTitle, 'the two diagnostic paths collapsed into the same result title')
  assert(!(await capabilityResult.getByText('Recommended system', { exact: true }).isVisible().catch(() => false)), 'capability prescription leaked use-case architecture')
  await captureRequiredViewports('capability-prescription')
  await assertInteractiveNames('capability prescription')
  checkpoint('capability path produces a distinct evidence-calibrated prescription')

  await capabilityResult.getByRole('button', { name: 'Edit diagnostic' }).click()
  assert(await page.getByLabel('Your role or working context', { exact: true }).inputValue() === 'Operations analyst responsible for support quality and routing', 'Edit diagnostic discarded capability answers')
  await page.getByRole('button', { name: 'Create my recommendation' }).click()
  await capabilityResult.waitFor({ state: 'visible' })
  await capabilityResult.getByRole('button', { name: 'Start a new diagnostic' }).click()
  assert(await page.locator('.ap-ds-workbench').count() === 0, 'capability restart did not clear the diagnostic')
  checkpoint('capability result supports edit and restart')

  assert(await page.evaluate(() => window.__AI_PATH_QA_MIC_CALLS__) === 1, 'the full run made an unexpected microphone request')
  assert(await page.evaluate(() => window.__AI_PATH_QA_PEER_CALLS__) === 0, 'the full run constructed a peer connection')
  assert(apiRequests.length === 0, `the local diagnostic made API requests: ${apiRequests.join(', ')}`)
  assert(externalRequests.length === 0, `the local diagnostic made external requests: ${externalRequests.join(', ')}`)
  const actionableConsoleErrors = consoleErrors.filter(message => !message.includes('favicon'))
  assert(actionableConsoleErrors.length === 0, `browser console errors: ${actionableConsoleErrors.join(' | ')}`)
  checkpoint('both paths remain local-only with zero external, paid, session, or analysis calls')

  return {
    ok: true,
    checkpoints,
    paths: ['use-case', 'capability-growth'],
    resultKinds: ['use-case-blueprint', 'capability-prescription'],
    sectionsPerPath: 6,
    viewports: ['375x812', '768x1024', '1440x900'],
    network: {
      externalRequestsAttempted: externalRequests.length,
      apiRequestsAttempted: apiRequests.length,
      paidRequestsAllowed: false,
      microphoneRequests: await page.evaluate(() => window.__AI_PATH_QA_MIC_CALLS__),
      peerConnections: await page.evaluate(() => window.__AI_PATH_QA_PEER_CALLS__),
    },
    artifacts: 'output/playwright/ai-path',
  }
}

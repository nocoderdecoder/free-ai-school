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
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const checkpoint = name => checkpoints.push(name)

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

  const captureRequiredViewports = async name => {
    for (const [width, height] of [[375, 812], [768, 1024], [1440, 900]]) {
      await captureViewport(name, width, height)
    }
  }

  const assertInteractiveNames = async (label) => {
    const unnamed = await page.locator('button, a[href], input, textarea, select, summary').evaluateAll(elements => (
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

  const pathRoot = pathName => page.locator(`[data-path="${pathName}"]`)
  const progressButtons = () => page.locator('.ap-ds-progress').getByRole('button')

  const assertProgressiveForm = async (pathName, expectedSection) => {
    const root = pathRoot(pathName)
    const sections = root.locator('[data-section-id]')
    assert(await sections.count() === 6, `${pathName} must retain exactly six fieldsets in the DOM`)
    const visibleSections = root.locator('[data-section-id]:visible')
    assert(await visibleSections.count() === 1, `${pathName} must show exactly one active question`)
    assert(await visibleSections.first().getAttribute('data-section-id') === expectedSection, `${pathName} expected active section ${expectedSection}`)
    assert(await page.locator('.ap-ds-progress').count() === 1, `${pathName} must show one question progress navigator`)
    assert(await progressButtons().count() === 6, `${pathName} progress must expose six question buttons`)
  }

  const continueTo = async (pathName, sectionId) => {
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await pathRoot(pathName).locator(`[data-section-id="${sectionId}"]`).waitFor({ state: 'visible' })
    await assertProgressiveForm(pathName, sectionId)
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

  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()) })
  page.on('pageerror', error => consoleErrors.push(error.message))

  await page.route('**/*', async route => {
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
      throw new Error('AI Path QA forbids peer connection construction.')
    }
    Object.defineProperty(window, 'RTCPeerConnection', { configurable: true, value: GuardedPeerConnection })
  })

  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible', timeout: 15_000 })

  const pathChoices = page.locator('button[aria-pressed]')
  assert(await pathChoices.count() === 2, `expected exactly two diagnostic paths, found ${await pathChoices.count()}`)
  const useCaseChoice = pathChoices.nth(0)
  const capabilityChoice = pathChoices.nth(1)
  assert(await useCaseChoice.getAttribute('aria-pressed') === 'false', 'use-case path should not be preselected')
  assert(await capabilityChoice.getAttribute('aria-pressed') === 'false', 'capability path should not be preselected')
  assert(await page.evaluate(() => window.__AI_PATH_QA_MIC_CALLS__) === 0, 'initial render requested microphone access')
  assert(await page.evaluate(() => window.__AI_PATH_QA_PEER_CALLS__) === 0, 'initial render constructed a peer connection')
  await assertInteractiveNames('path chooser')
  await captureRequiredViewports('path-chooser')
  checkpoint('opening scene exposes exactly two keyboard-accessible paths without microphone or network activity')

  await page.setViewportSize({ width: 1440, height: 900 })
  await useCaseChoice.focus()
  const focusStyle = await useCaseChoice.evaluate(element => {
    const style = window.getComputedStyle(element)
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth }
  })
  assert(focusStyle.outlineStyle !== 'none' && focusStyle.outlineWidth !== '0px', `path choice lacks visible keyboard focus: ${JSON.stringify(focusStyle)}`)
  await page.keyboard.press('Enter')
  await assertProgressiveForm('use-case', 'outcome')

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await page.locator('.ap-ds-errorSummary[role="alert"]').waitFor({ state: 'visible' })
  await assertProgressiveForm('use-case', 'outcome')
  const outcomeField = page.getByLabel('What do you want AI to help someone accomplish?', { exact: true })
  await outcomeField.fill('Help salespeople answer RFP questions from approved company documents with citations and human review.')

  await capabilityChoice.click()
  await assertProgressiveForm('capability-growth', 'direction')
  await page.getByLabel('Your role or working context', { exact: true }).fill('Temporary capability draft')
  await useCaseChoice.click()
  await assertProgressiveForm('use-case', 'outcome')
  assert(await outcomeField.inputValue() === 'Help salespeople answer RFP questions from approved company documents with citations and human review.', 'switching paths discarded the use-case draft')
  checkpoint('path switching preserves independent drafts while keeping one active question')

  assert(await page.evaluate(() => window.__AI_PATH_QA_MIC_CALLS__) === 0, 'path selection automatically requested microphone access')
  await page.getByRole('button', { name: 'Test microphone', exact: true }).click()
  await page.getByText('Microphone access was not allowed. You can continue by typing.', { exact: true }).waitFor({ state: 'visible' })
  assert(await page.evaluate(() => window.__AI_PATH_QA_MIC_CALLS__) === 1, 'explicit microphone test did not reach the local permission boundary exactly once')
  assert(await page.evaluate(() => window.__AI_PATH_QA_PEER_CALLS__) === 0, 'microphone test constructed a peer connection')
  assert(await outcomeField.isVisible(), 'typed answer disappeared after microphone denial')

  await continueTo('use-case', 'workflow')
  await page.getByLabel('What happens today, and where does it become unreliable?', { exact: true }).fill('Salespeople search old proposals, copy prior answers, and ask legal and product teams to verify every claim; outdated language is the main failure point.')
  await continueTo('use-case', 'specification')
  await page.getByLabel('What will it receive?', { exact: true }).fill('Approved product documents, security policies, legal language, and historical proposals')
  await page.getByLabel('What should it produce?', { exact: true }).fill('A draft RFP response with a source citation and confidence indicator')
  await page.getByLabel('How will you know it works?', { exact: true }).fill('Reduce first-draft time by 50 percent and require every answer to cite approved material.')
  await continueTo('use-case', 'experience')

  const useCaseEvidence = page.getByLabel('What did you make or test?', { exact: true })
  assert(!(await useCaseEvidence.isVisible().catch(() => false)), 'experience evidence appeared before an evidence-bearing selection')
  await choose(/How far have you taken this idea?/, 'Changed an example for my task')
  await useCaseEvidence.waitFor({ state: 'visible' })
  await useCaseEvidence.fill('I tested prompt variations on ten historical RFP questions, recorded unsupported statements, and retained the strongest cited version for review.')
  await continueTo('use-case', 'risk')
  checkpoint('use-case conditional evidence appears only after an evidence-bearing claim')

  await choose('How sensitive is the information?', 'Confidential')
  await choose('What happens if the answer is wrong?', 'Serious')
  await choose('Should a person approve it before use?', 'Yes')
  await page.getByLabel(/Systems or data sources/).fill('Approved company Drive and CRM')
  await continueTo('use-case', 'constraints')
  await page.getByLabel('Your role in this work', { exact: true }).fill('Sales operations manager')
  await page.getByLabel('Hours available each week', { exact: true }).fill('5')
  await choose('Coding comfort', 'Modify examples')
  await choose('Preferred approach', 'Open to either')
  await choose('Working mode', 'With a team')
  await choose('Tool budget', 'Organisation decides')
  await assertInteractiveNames('completed use-case diagnostic')
  await captureRequiredViewports('use-case-question-six')

  await page.getByRole('button', { name: 'Create my project plan', exact: true }).click()
  const useCaseResult = page.locator('main[data-result-kind="use-case-blueprint"]')
  await useCaseResult.waitFor({ state: 'visible', timeout: 15_000 })
  assert(await useCaseResult.getByRole('heading', { level: 1 }).count() === 1, 'use-case blueprint needs one result title')
  assert(await useCaseResult.getByText('Retrieval-assisted copilot with human approval', { exact: true }).isVisible(), 'use-case result omitted its recommended architecture')
  assert(await useCaseResult.getByText(/Reduce first-draft time by 50 percent/).isVisible(), 'use-case result omitted its evaluation target')
  assert(!(await useCaseResult.getByText('Your starting point', { exact: true }).isVisible().catch(() => false)), 'use-case blueprint leaked capability-profile content')
  await assertInteractiveNames('use-case result')
  await captureRequiredViewports('use-case-result')
  checkpoint('use-case path produces a distinct local blueprint with architecture, prototype, evaluation, and risk')

  await useCaseResult.getByRole('button', { name: /Save this as my next step/ }).click()
  assert(await useCaseResult.getByRole('button', { name: /Next step saved/ }).isVisible(), 'next-step control did not preserve its state')
  const originalUseCaseTitle = (await useCaseResult.getByRole('heading', { level: 1 }).textContent())?.trim() || ''
  await useCaseResult.getByRole('button', { name: /Edit my answers/ }).click()
  await progressButtons().nth(2).click()
  const outputField = page.getByLabel('What should it produce?', { exact: true })
  assert(await outputField.inputValue() === 'A draft RFP response with a source citation and confidence indicator', 'Edit discarded use-case answers')
  await outputField.fill('A reviewable security questionnaire draft with citations')
  await progressButtons().nth(5).click()
  await page.getByRole('button', { name: 'Create my project plan', exact: true }).click()
  await useCaseResult.waitFor({ state: 'visible' })
  const editedUseCaseTitle = (await useCaseResult.getByRole('heading', { level: 1 }).textContent())?.trim() || ''
  assert(editedUseCaseTitle !== originalUseCaseTitle, 'edited inputs did not regenerate the use-case result')
  await useCaseResult.getByRole('button', { name: 'Start over', exact: true }).click()
  await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' })
  assert(await page.locator('[data-path]').count() === 0, 'restart did not clear the selected diagnostic')
  assert(await pathChoices.nth(0).getAttribute('aria-pressed') === 'false' && await pathChoices.nth(1).getAttribute('aria-pressed') === 'false', 'restart did not reset both path choices')
  checkpoint('use-case result supports editing, deterministic regeneration, and restart')

  await capabilityChoice.click()
  await assertProgressiveForm('capability-growth', 'direction')
  const capabilityRole = page.getByLabel('Your role or working context', { exact: true })
  await capabilityRole.fill('Operations analyst responsible for support quality and routing')
  await choose(/Where would you most like AI to expand/, 'Automate workflows')
  await choose(/Where would you most like AI to expand/, 'Work with data and knowledge')
  await continueTo('capability-growth', 'experience')

  await page.locator('#ap-level-ai-assisted-work').selectOption('adapted')
  await page.locator('#ap-level-automation').selectOption('guided')
  await page.locator('#ap-level-applications').selectOption('guided')
  await page.locator('#ap-level-data-retrieval').selectOption('exposure')
  await page.locator('#ap-level-evaluation-safety').selectOption('none')
  await continueTo('capability-growth', 'evidence')

  const evidenceField = page.getByLabel('What is the strongest thing you have made or improved with AI?', { exact: true })
  await evidenceField.fill('I made and revised a support-ticket summarization prompt for my own process, compared results manually, and documented recurring failures.')
  const supportedEvidence = page.getByRole('group', { name: 'Which claims does this evidence support?' })
  assert(await supportedEvidence.isVisible(), 'capability evidence linkage did not appear for an adapted claim')
  await supportedEvidence.getByLabel('ai-assisted-work', { exact: true }).check()
  await continueTo('capability-growth', 'reasoning')
  checkpoint('capability path requires explicit evidence linkage for higher experience claims')

  await page.getByLabel('What would you do, and why?', { exact: true }).fill('I would create expected examples, measure incorrect outputs, require a person to review uncertain cases, and test failure behavior before sending anything automatically.')
  await continueTo('capability-growth', 'foundations')
  await choose('Coding', 'Modify examples')
  await choose('Data', 'Spreadsheets')
  await page.getByRole('group', { name: /AI tools you’ve used/ }).getByLabel('ChatGPT', { exact: true }).check()
  await continueTo('capability-growth', 'constraints')
  await page.getByLabel('Hours available each week', { exact: true }).fill('4')
  await choose('Learning preference', 'Balanced')
  await choose('Desired pace', '30-day sprint')
  await choose('Resources', 'Free only')
  await choose('Public project allowed', 'Yes')
  await assertInteractiveNames('completed capability diagnostic')
  await captureRequiredViewports('capability-question-six')

  await page.getByRole('button', { name: 'Create my learning plan', exact: true }).click()
  const capabilityResult = page.locator('main[data-result-kind="capability-prescription"]')
  await capabilityResult.waitFor({ state: 'visible', timeout: 15_000 })
  assert(await capabilityResult.getByRole('heading', { level: 1 }).count() === 1, 'capability prescription needs one result title')
  assert(await capabilityResult.getByText(/Reliable AI workflow automation/).first().isVisible(), 'capability result omitted the next capability')
  assert(await capabilityResult.getByText('Adapted practice', { exact: true }).isVisible(), 'capability result omitted calibrated evidence')
  assert(!(await capabilityResult.getByText('Retrieval-assisted copilot with human approval', { exact: true }).isVisible().catch(() => false)), 'capability result leaked use-case architecture')
  await assertInteractiveNames('capability result')
  await captureRequiredViewports('capability-result')
  checkpoint('capability path produces a distinct evidence-calibrated learning plan')

  await capabilityResult.getByRole('button', { name: /Edit my answers/ }).click()
  await progressButtons().first().click()
  assert(await capabilityRole.inputValue() === 'Operations analyst responsible for support quality and routing', 'Edit discarded capability answers')
  await progressButtons().nth(5).click()
  await page.getByRole('button', { name: 'Create my learning plan', exact: true }).click()
  await capabilityResult.waitFor({ state: 'visible' })
  await capabilityResult.getByRole('button', { name: 'Start over', exact: true }).click()
  assert(await page.locator('[data-path]').count() === 0, 'capability restart did not clear the diagnostic')
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
    activeSectionsAtOnce: 1,
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

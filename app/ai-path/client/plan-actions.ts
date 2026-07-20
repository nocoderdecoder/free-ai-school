export type CheckInProposal = {
  id: string
  title: string
  explanation: string
  action: 'reduce-scope' | 'add-stretch' | 'unblock' | 'protect-pace'
}

export function proposeCheckInAdaptation(checkIn: string): CheckInProposal {
  const text = checkIn.trim().toLowerCase()
  if (/\b(busy|no time|missed|overwhelmed|calendar|behind)\b/.test(text)) {
    return { id: 'reduce-scope', title: 'Protect one essential task next week', explanation: 'Keep the proof outcome, but reduce next week to one 30–45 minute essential task and defer the rest.', action: 'reduce-scope' }
  }
  if (/\b(easy|ahead|finished early|more time|too basic)\b/.test(text)) {
    return { id: 'add-stretch', title: 'Add one bounded stretch test', explanation: 'Keep the current plan and add one harder example that tests the same skill without introducing a new tool stack.', action: 'add-stretch' }
  }
  if (/\b(stuck|hard|confus|blocked|error|failed|cannot|can't)\b/.test(text)) {
    return { id: 'unblock', title: 'Replace the next task with a smaller diagnostic', explanation: 'Pause new material. Reproduce one failure, write what you expected, and change one variable at a time.', action: 'unblock' }
  }
  return { id: 'protect-pace', title: 'Keep the plan unchanged', explanation: 'No strong adaptation signal was found. Preserve the current scope and check again after the next concrete task.', action: 'protect-pace' }
}

export function taskSwapAlternative(goalType: string, weekIndex: number, task: string): string {
  const prefix: Record<string, string> = {
    workflows: 'Create a one-page example for',
    builder: 'Build a 30-minute proof of',
    career: 'Turn into portfolio evidence:',
    leader: 'Write a decision brief for',
    foundations: 'Explain in plain language:',
    unsure: 'Run a 30-minute experiment on',
  }
  return `${prefix[goalType] ?? prefix.unsure} ${task.replace(/^./, character => character.toLowerCase())} (week ${weekIndex + 1})`
}

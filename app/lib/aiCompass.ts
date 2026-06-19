export type TrackId =
  | 'productivity'
  | 'content'
  | 'automation'
  | 'product'
  | 'no-code'
  | 'builder'
  | 'data'
  | 'ml'
  | 'leadership';

export type Answer = { questionId: string; text: string };

export interface Question {
  id: string;
  eyebrow: string;
  prompt: string;
  helper: string;
  placeholder: string;
}

export interface CompassProfile {
  track: TrackId;
  trackName: string;
  stage: string;
  stageNumber: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  priorities: Array<{ title: string; why: string; action: string }>;
  notYet: string[];
  weeks: Array<{ week: string; focus: string; outcome: string }>;
  project: { title: string; brief: string; proof: string };
  weeklyHours: string;
  learningStyle: string;
  confidence: 'High' | 'Medium';
}

const TRACKS: Record<TrackId, { name: string; keywords: string[] }> = {
  productivity: {
    name: 'AI-enabled knowledge work',
    keywords: ['productivity', 'research', 'writing', 'email', 'presentations', 'daily work', 'work faster', 'knowledge work']
  },
  content: {
    name: 'Content and marketing',
    keywords: ['marketing', 'content', 'social media', 'linkedin', 'campaign', 'copywriting', 'brand', 'seo', 'creator']
  },
  automation: {
    name: 'Workflow automation',
    keywords: ['automate', 'automation', 'workflow', 'zapier', 'make.com', 'n8n', 'operations', 'save time', 'repetitive']
  },
  product: {
    name: 'AI product management',
    keywords: ['product manager', 'product management', 'roadmap', 'customer', 'feature', 'product strategy', 'pm ', 'user research']
  },
  'no-code': {
    name: 'No-code AI building',
    keywords: ['no-code', 'nocode', 'bubble', 'lovable', 'replit', 'prototype', 'without coding', 'vibe coding']
  },
  builder: {
    name: 'AI application building',
    keywords: ['developer', 'software', 'code', 'coding', 'api', 'python', 'javascript', 'typescript', 'app', 'agent', 'rag']
  },
  data: {
    name: 'Data and analytics',
    keywords: ['data analyst', 'analytics', 'sql', 'dashboard', 'spreadsheet', 'excel', 'business intelligence', 'data analysis']
  },
  ml: {
    name: 'Machine learning engineering',
    keywords: ['machine learning', 'ml engineer', 'pytorch', 'tensorflow', 'model training', 'fine-tuning', 'neural network', 'statistics']
  },
  leadership: {
    name: 'AI leadership and strategy',
    keywords: ['leadership', 'executive', 'strategy', 'organization', 'team adoption', 'governance', 'roi', 'transformation']
  }
};

const BASE_QUESTIONS: Question[] = [
  {
    id: 'destination',
    eyebrow: 'Your destination',
    prompt: 'What would you like AI to help you accomplish in the next 6–12 months?',
    helper: 'Talk about a role, outcome, problem, or change you want—not the tools you think you should learn.',
    placeholder: 'I want to use AI to…'
  },
  {
    id: 'experience',
    eyebrow: 'What you have tried',
    prompt: 'What have you already done with AI?',
    helper: 'Tools, courses, experiments, workflows and unfinished projects all count. Specific examples help.',
    placeholder: 'So far, I have…'
  },
  {
    id: 'technical',
    eyebrow: 'How you build',
    prompt: 'How comfortable are you with spreadsheets, automation, coding, APIs, or data?',
    helper: 'There is no ideal answer. Describe what you can do without step-by-step help.',
    placeholder: 'I am comfortable with…'
  },
  {
    id: 'constraints',
    eyebrow: 'Your real life',
    prompt: 'How much time can you realistically spend each week, and how do you learn best?',
    helper: 'For example: two hours, mostly by building; or five hours through structured lessons and practice.',
    placeholder: 'Each week I can spend…'
  },
  {
    id: 'project',
    eyebrow: 'Make it tangible',
    prompt: 'What is one useful AI project you would be excited to finish in the next month?',
    helper: 'It can be for your work, career, community, or curiosity. Small and real beats impressive and vague.',
    placeholder: 'I would love to build…'
  }
];

const TRACK_CONTENT: Record<TrackId, {
  strengths: string[];
  gaps: string[];
  priorities: Array<{ title: string; why: string; action: string }>;
  notYet: string[];
  project: { title: string; brief: string; proof: string };
}> = {
  productivity: {
    strengths: ['You are starting from real work, not AI for its own sake', 'Your domain knowledge can become useful context for AI'],
    gaps: ['A repeatable prompting and verification method', 'Knowing when AI is—and is not—the right tool'],
    priorities: [
      { title: 'Context design', why: 'Good output begins with clear context, examples and constraints.', action: 'Turn one recurring task into a reusable brief with examples and a quality checklist.' },
      { title: 'Verification habits', why: 'Fluent output can still be wrong.', action: 'Build a three-step check: sources, assumptions and final human judgment.' },
      { title: 'Personal workflow library', why: 'Reusable systems compound; isolated prompts do not.', action: 'Document five workflows with an input, prompt, review step and finished output.' }
    ],
    notYet: ['Training your own model', 'Complex agent frameworks', 'Deep machine-learning mathematics'],
    project: { title: 'Your AI workbench', brief: 'Build a small library of five tested workflows for work you already do.', proof: 'Before/after examples, time saved and a checklist another person can follow.' }
  },
  content: {
    strengths: ['You understand audience, message and taste—things models cannot choose for you', 'Content gives you fast feedback loops'],
    gaps: ['A clear human editorial standard', 'A system that moves from evidence to differentiated content'],
    priorities: [
      { title: 'Voice and evidence', why: 'Generic inputs create generic content.', action: 'Create a source pack with customer language, examples, beliefs and banned clichés.' },
      { title: 'Content systems', why: 'AI is most useful across a workflow, not only at the drafting step.', action: 'Map research → angle → draft → edit → distribution → learning.' },
      { title: 'Evaluation', why: 'Speed without a quality bar produces more average work.', action: 'Score every draft for specificity, evidence, usefulness and voice.' }
    ],
    notYet: ['Model fine-tuning', 'Autonomous posting agents', 'Generating at maximum volume'],
    project: { title: 'Evidence-to-content engine', brief: 'Turn one interview, memo or customer conversation into a strong multi-format content package.', proof: 'Source notes, angle decisions, edited output and engagement or qualitative feedback.' }
  },
  automation: {
    strengths: ['You are looking for leverage in repeatable work', 'Workflow thinking transfers across every automation tool'],
    gaps: ['Breaking work into reliable steps', 'Handling exceptions, permissions and failure states'],
    priorities: [
      { title: 'Workflow mapping', why: 'A bad process becomes a faster bad process when automated.', action: 'Map trigger, inputs, decisions, outputs, owner and failure path before choosing tools.' },
      { title: 'Structured data', why: 'Automations need predictable fields, not ambiguous prose.', action: 'Practice turning messy text into a small validated JSON schema.' },
      { title: 'Human checkpoints', why: 'The riskiest step should remain reviewable.', action: 'Add approval, logs and a safe fallback to one automated workflow.' }
    ],
    notYet: ['Multi-agent orchestration', 'Removing every human review', 'Automating a process you have not observed'],
    project: { title: 'One boring workflow, beautifully automated', brief: 'Automate a repetitive process with a trigger, structured AI step, approval and log.', proof: 'A working demo plus documented time saved and failure handling.' }
  },
  product: {
    strengths: ['You can connect model capability to an actual user problem', 'Product judgment matters more than knowing every model'],
    gaps: ['AI-specific discovery and failure-mode thinking', 'Evaluation beyond a polished demo'],
    priorities: [
      { title: 'Capability-shaped discovery', why: 'AI changes what is possible, but not what is valuable.', action: 'Interview users about judgment-heavy work, uncertainty and acceptable errors.' },
      { title: 'Evaluation design', why: 'AI features are probabilistic and need a quality distribution, not one happy path.', action: 'Create 20 representative cases with pass, fail and edge-case criteria.' },
      { title: 'Trustworthy UX', why: 'Users need control when the system is uncertain.', action: 'Prototype confirmation, correction, citation and recovery states.' }
    ],
    notYet: ['Training foundation models', 'A feature roadmap made only from model capabilities', 'Agents without clear ownership boundaries'],
    project: { title: 'AI feature decision brief', brief: 'Design one AI feature from user problem through prototype, evaluation set and rollout guardrails.', proof: 'Problem evidence, interaction prototype, test cases and a clear ship/no-ship threshold.' }
  },
  'no-code': {
    strengths: ['You value rapid feedback over technical ceremony', 'Modern tools let you test a real product before mastering a full stack'],
    gaps: ['Understanding the data and logic underneath the interface', 'Testing edge cases instead of only the demo path'],
    priorities: [
      { title: 'Product decomposition', why: 'Clear components make AI-assisted building dramatically easier.', action: 'Write pages, states, data objects and user actions before prompting a builder.' },
      { title: 'Data and API basics', why: 'You need a mental model of what the tool is doing for you.', action: 'Learn requests, responses, JSON, authentication and database rows through one project.' },
      { title: 'Debugging with evidence', why: 'Random prompting is slow when something breaks.', action: 'Practice reproducing a bug, reading the error and changing one thing at a time.' }
    ],
    notYet: ['A complete computer-science curriculum', 'Scaling before ten people use the product', 'Five overlapping builder tools'],
    project: { title: 'A tiny useful app', brief: 'Ship a one-problem app with a real input, useful transformation and saved or exportable result.', proof: 'A public link, five user sessions and a short list of what failed.' }
  },
  builder: {
    strengths: ['You can turn AI capability into software people can use', 'Your engineering habits can make probabilistic systems observable'],
    gaps: ['Evaluation-driven development', 'Designing context, tools and boundaries as a system'],
    priorities: [
      { title: 'Structured model interfaces', why: 'Schemas make model behavior testable and composable.', action: 'Build one typed call with structured output, validation, retry and a safe fallback.' },
      { title: 'Evaluation sets', why: 'Anecdotal prompting hides regressions.', action: 'Create a small golden dataset and run it whenever prompts or models change.' },
      { title: 'Retrieval and tool use', why: 'Useful apps need current context and controlled actions.', action: 'Build one grounded workflow and measure retrieval quality separately from generation.' }
    ],
    notYet: ['A complex agent framework before one tool call works', 'Fine-tuning before prompt and retrieval baselines', 'Optimizing token cost before measuring usefulness'],
    project: { title: 'A tested AI copilot', brief: 'Build a narrow assistant with structured output, one trusted data source and an evaluation suite.', proof: 'Working app, 25 test cases, failure analysis and cost/latency notes.' }
  },
  data: {
    strengths: ['You already think in evidence, structure and measurement', 'Data work offers clear ways to compare AI output with ground truth'],
    gaps: ['Reliable natural-language-to-analysis workflows', 'Guardrails against plausible but incorrect conclusions'],
    priorities: [
      { title: 'AI-assisted analysis', why: 'AI can accelerate exploration while your analytical judgment stays in charge.', action: 'Use AI to draft queries and explanations, then verify every number against source data.' },
      { title: 'Semantic clarity', why: 'Ambiguous metric definitions create confident mistakes.', action: 'Build a small metric dictionary with definitions, owners and known caveats.' },
      { title: 'Evaluation and provenance', why: 'Every conclusion should be traceable.', action: 'Require generated analysis to show query, source, assumptions and confidence.' }
    ],
    notYet: ['Replacing governed metrics with chatbot answers', 'Advanced model training', 'Autonomous decisions from unverified analysis'],
    project: { title: 'Explainable analysis assistant', brief: 'Create a workflow that answers a narrow business question and exposes its query, assumptions and sources.', proof: 'Ten verified questions, error categories and stakeholder feedback.' }
  },
  ml: {
    strengths: ['You are prepared to examine model behavior below the interface', 'Your technical foundation supports rigorous evaluation'],
    gaps: ['Connecting model metrics to user outcomes', 'Production reliability and observability'],
    priorities: [
      { title: 'Evaluation architecture', why: 'Offline metrics matter only when tied to real failure costs.', action: 'Define task, slices, baseline, thresholds and human review for one model behavior.' },
      { title: 'LLM systems engineering', why: 'Retrieval, context, tools and latency often matter more than model novelty.', action: 'Profile an end-to-end system and attribute failures to the correct component.' },
      { title: 'Production feedback loops', why: 'Real distributions drift beyond a benchmark.', action: 'Design logging, sampling, review and regression detection without storing unnecessary data.' }
    ],
    notYet: ['Training a large model from scratch', 'Chasing benchmarks unrelated to users', 'Adding agents to a system with weak observability'],
    project: { title: 'Evaluation-first LLM system', brief: 'Build or improve one LLM workflow around a versioned dataset and explicit quality thresholds.', proof: 'Baseline, experiment report, slice analysis and production monitoring plan.' }
  },
  leadership: {
    strengths: ['You can align incentives, risk and adoption across a system', 'Your decisions can turn scattered experiments into organizational learning'],
    gaps: ['A portfolio view of AI opportunities', 'Governance that enables responsible speed'],
    priorities: [
      { title: 'Opportunity portfolio', why: 'Not every task deserves AI and not every win has equal value.', action: 'Rank opportunities by value, feasibility, error tolerance and adoption friction.' },
      { title: 'Operating guardrails', why: 'Teams need usable boundaries, not a policy PDF nobody remembers.', action: 'Define approved data, review levels, owners and escalation paths for three risk tiers.' },
      { title: 'Adoption measurement', why: 'Tool access is not behavior change.', action: 'Measure repeated use, time-to-value, quality and abandoned workflows.' }
    ],
    notYet: ['Buying a platform before mapping work', 'Mandating usage as an adoption strategy', 'Treating model choice as the whole AI strategy'],
    project: { title: 'AI opportunity and guardrail map', brief: 'Create a prioritized portfolio of five use cases with owners, risks, metrics and 30-day tests.', proof: 'A leadership-ready decision document and one completed pilot review.' }
  }
};

function normalize(answers: Answer[]) {
  return answers.map((answer) => answer.text.toLowerCase()).join(' ');
}

function countMatches(text: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? (keyword.includes(' ') ? 3 : 1) : 0), 0);
}

export function inferTrack(answers: Answer[]): TrackId {
  const text = normalize(answers);
  const scores = Object.entries(TRACKS).map(([id, track]) => [id as TrackId, countMatches(text, track.keywords)] as const);
  scores.sort((a, b) => b[1] - a[1]);
  return scores[0][1] === 0 ? 'productivity' : scores[0][0];
}

function inferStage(answers: Answer[]) {
  const text = normalize(answers);
  let points = 0;
  if (/chatgpt|claude|gemini|copilot|perplexity/.test(text)) points += 1;
  if (/use (it|ai) (daily|weekly)|regularly|prompt library|custom gpt/.test(text)) points += 1;
  if (/zapier|make\.com|n8n|workflow|automation/.test(text)) points += 1;
  if (/built|shipped|deployed|production|api|python|javascript|typescript|sql/.test(text)) points += 2;
  if (/evaluation|evals|rag|retrieval|fine.?tun|pytorch|tensorflow|monitoring/.test(text)) points += 2;
  if (/never used|complete beginner|just starting|not used/.test(text)) points = 0;
  if (points <= 1) return { number: 1, name: 'Explorer' };
  if (points <= 3) return { number: 2, name: 'Practitioner' };
  if (points <= 5) return { number: 3, name: 'Workflow builder' };
  if (points <= 7) return { number: 4, name: 'Application builder' };
  return { number: 5, name: 'Advanced specialist' };
}

function inferHours(text: string) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:-|to)?\s*(\d+(?:\.\d+)?)?\s*hours?/i);
  if (match) return match[2] ? `${match[1]}–${match[2]} hours/week` : `${match[1]} hours/week`;
  if (/weekend/i.test(text)) return 'A focused weekend block';
  if (/daily|every day/i.test(text)) return 'Short daily sessions';
  return '2–4 hours/week';
}

function inferStyle(text: string) {
  if (/build|project|hands.?on|doing|practice/i.test(text)) return 'Project-led, with short explanations as needed';
  if (/course|structured|curriculum|lesson/i.test(text)) return 'Structured lessons followed by practice';
  if (/video|watch/i.test(text)) return 'Short demonstrations followed by practice';
  if (/read|book|article/i.test(text)) return 'Reading, notes and applied exercises';
  return 'Short concepts followed immediately by hands-on practice';
}

export function getQuestion(index: number, answers: Answer[]): Question {
  const question = { ...BASE_QUESTIONS[index] };
  if (question.id === 'technical') {
    const track = inferTrack(answers);
    const adaptations: Partial<Record<TrackId, string>> = {
      content: 'When you make content today, which parts involve research, data, automation or technical tools?',
      product: 'How comfortable are you working with prototypes, data, technical teams, APIs or AI evaluations?',
      leadership: 'How close are you to the technical work—evaluating tools, reading data, building workflows or leading implementation?',
      data: 'What can you currently do with spreadsheets, SQL, Python, dashboards or statistical analysis?',
      builder: 'What have you built with code, APIs, databases, deployment tools or AI models?',
      ml: 'What is your current depth in Python, statistics, ML frameworks, evaluation and production systems?'
    };
    question.prompt = adaptations[track] ?? question.prompt;
  }
  return question;
}

export function makeAcknowledgement(answer: Answer, allAnswers: Answer[]) {
  const clean = answer.text.trim().replace(/\s+/g, ' ');
  const track = TRACKS[inferTrack(allAnswers)].name.toLowerCase();
  const snippets: Record<string, string> = {
    destination: `I’m hearing a practical destination: ${shorten(clean, 150)} I’ll orient the roadmap toward ${track}, not a generic AI syllabus.`,
    experience: `Got it. You have given me evidence to work with—not just a self-rating. I’ll build from what you have actually tried and avoid making you repeat familiar ground.`,
    technical: `That helps me set the right technical depth. The roadmap should stretch you one layer beyond your current comfort, without sending you down an unnecessary engineering rabbit hole.`,
    constraints: `Useful constraint. I’ll design for ${inferHours(clean).toLowerCase()} and a ${inferStyle(clean).toLowerCase()} rhythm, so the plan can survive a real week.`,
    project: `That is concrete enough to learn through. I’ll use your project as the spine of the plan, so each topic earns its place by helping you ship something real.`
  };
  return snippets[answer.questionId] ?? 'Got it. I’ll carry that forward into your roadmap.';
}

function shorten(value: string, max: number) {
  if (value.length <= max) return value;
  const sliced = value.slice(0, max);
  return `${sliced.slice(0, sliced.lastIndexOf(' '))}…`;
}

function answerFor(id: string, answers: Answer[]) {
  return answers.find((answer) => answer.questionId === id)?.text ?? '';
}

export function buildProfile(answers: Answer[]): CompassProfile {
  const track = inferTrack(answers);
  const trackData = TRACKS[track];
  const content = TRACK_CONTENT[track];
  const stage = inferStage(answers);
  const destination = answerFor('destination', answers);
  const experience = answerFor('experience', answers);
  const constraints = answerFor('constraints', answers);
  const projectAnswer = answerFor('project', answers);
  const totalWords = normalize(answers).split(/\s+/).filter(Boolean).length;
  const summary = `You are a Stage ${stage.number} ${stage.name} on a ${trackData.name.toLowerCase()} path. ${destination ? `Your direction is clear: ${shorten(destination, 190)}` : 'Your next step is to turn general AI interest into one useful, repeatable practice.'} ${experience ? 'You already have enough experience to learn through evidence and projects rather than passive tool tours.' : ''}`;
  const project = projectAnswer.length > 24
    ? { ...content.project, brief: `Use this ambition as the brief: “${shorten(projectAnswer, 180)}” Keep the first version narrow enough to finish in four weeks.` }
    : content.project;

  return {
    track,
    trackName: trackData.name,
    stage: stage.name,
    stageNumber: stage.number,
    summary,
    strengths: content.strengths,
    gaps: content.gaps,
    priorities: content.priorities,
    notYet: content.notYet,
    project,
    weeklyHours: inferHours(constraints),
    learningStyle: inferStyle(constraints),
    confidence: totalWords >= 90 ? 'High' : 'Medium',
    weeks: [
      { week: 'Week 1', focus: content.priorities[0].title, outcome: content.priorities[0].action },
      { week: 'Week 2', focus: content.priorities[1].title, outcome: content.priorities[1].action },
      { week: 'Week 3', focus: content.priorities[2].title, outcome: content.priorities[2].action },
      { week: 'Week 4', focus: 'Ship, observe, improve', outcome: `Finish “${project.title}”, put it in front of at least three people, and document what worked, failed and changed.` }
    ]
  };
}

export function serializeProfile(profile: CompassProfile) {
  return [
    `MY AI LEARNING COMPASS`,
    `Stage ${profile.stageNumber}: ${profile.stage} · ${profile.trackName}`,
    '',
    profile.summary,
    '',
    'MY NEXT THREE PRIORITIES',
    ...profile.priorities.map((priority, index) => `${index + 1}. ${priority.title} — ${priority.action}`),
    '',
    'MY 30-DAY PROJECT',
    `${profile.project.title}: ${profile.project.brief}`,
    '',
    'Generated with AI Learning Compass — a private, browser-based assessment.'
  ].join('\n');
}

export const questionCount = BASE_QUESTIONS.length;

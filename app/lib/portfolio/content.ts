export const profile = {
  name: "Anshul Gupta",
  focus: "Applied AI & GTM strategy",
  email: "anshulgupta1512@gmail.com",
  linkedin: "https://www.linkedin.com/in/anshul-gupta1/",
  github: "https://github.com/nocoderdecoder",
  summary:
    "I work across commercial strategy, product definition, and adoption. My background spans strategy and operations at Google, commercial roles at Unilever and GSK, and an MBA from Kellogg.",
};

export const career = [
  {
    org: "Google",
    dates: "September 2024 to present",
    roles: [
      {
        title: "Senior Associate, Global Strategy and Operations",
        dates: "April 2026 to present",
      },
      {
        title: "Channel Sales & Activations Manager, Devices and Services",
        dates: "September 2024 to April 2026",
      },
    ],
    description:
      "Strategy and operations focused on commercial decisions, cross-functional execution, and adoption. Employer projects and internal materials are not published on this site.",
  },
  {
    org: "Hindustan Unilever / GSK Consumer Healthcare",
    dates: "June 2017 to June 2023",
    roles: [
      { title: "Channel Strategy Manager", dates: "January 2022 to June 2023" },
      {
        title: "Business Transformation Manager, National Centre of Excellence",
        dates: "March 2020 to December 2021",
      },
      {
        title: "Regional Channel Sales Manager",
        dates: "May 2018 to February 2020",
      },
      { title: "Management Trainee", dates: "June 2017 to April 2018" },
    ],
    description:
      "Commercial planning, channel development, distribution, and business transformation across regional and national roles.",
  },
];
export const education = [
  {
    school: "Kellogg School of Management, Northwestern University",
    degree: "MBA",
    year: "2024",
  },
  {
    school: "Management Development Institute, Gurgaon",
    degree: "PGDM, Marketing and Finance",
    year: "2017",
  },
  {
    school: "University of Delhi",
    degree: "BA (Hons), Journalism",
    year: "2014",
  },
];

export type Guide = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  minutes: number;
  sections: { title: string; paragraphs: string[]; checklist?: string[] }[];
  sources?: { label: string; url: string }[];
};
export const guides: Guide[] = [
  {
    slug: "evaluating-a-commercial-ai-analyst",
    title: "Correct numbers can still produce a wrong answer.",
    summary:
      "A practical way to evaluate an AI analyst: check the calculation, the meaning, and the decision it supports.",
    category: "AI evaluation",
    minutes: 6,
    sections: [
      {
        title: "Start with the decision",
        paragraphs: [
          "Suppose a fictional retailer asks why its northern region missed its October sales target. An assistant calculates the gap correctly, then attributes it to poor store execution. The calculation is right. The explanation is unsupported: the dataset contains no evidence about store execution.",
          "That distinction matters because an answer can lead to action. A regional manager could start retraining stores when the actual issue requires a different investigation. An evaluation should therefore specify both what the system must establish and what it must leave unresolved.",
          "Write down the user, the decision, and the consequence of a wrong answer before choosing an accuracy target. A weekly exploratory analysis and an automated payment approval should not inherit the same acceptance criteria.",
        ],
      },
      {
        title: "Separate four checks",
        paragraphs: [
          "First, verify the calculation. Specify the metric, time window, filters, denominator, units, and acceptable rounding. Keep the reference answer reproducible from the source records.",
          "Second, verify interpretation. Revenue, units, margin, and target attainment answer different questions. If the user asks which region performed best without naming a measure, clarification may be the correct behavior.",
          "Third, inspect the evidence. Each factual statement should trace to a record or an explicit calculation. A decomposition of a sales change is not proof of its cause.",
          "Finally, check the next step. The system should distinguish an observation, a hypothesis, and a recommendation. If it proposes an investigation, it should say which missing evidence would help resolve it.",
        ],
      },
      {
        title: "Build a small reference set with useful coverage",
        paragraphs: [
          "Begin with a few dozen realistic questions and write expected behavior before running the system. Include straightforward calculations, comparisons, ambiguous language, missing periods, empty results, and requests the tool should decline.",
          "Keep development examples separate from a holdout set. Otherwise, improvements may simply reflect repeated tuning to familiar wording. For model-based routing, repeat trials because the same input can produce different decisions.",
          "Record failures by category. A wrong denominator, a missing filter, and an unsupported explanation need different fixes. An overall pass rate can hide a serious failure in a small but consequential category.",
        ],
        checklist: [
          "Record the source rows and expected calculation.",
          "Define when to clarify or abstain.",
          "Label error severity, not only pass or fail.",
          "Keep a holdout set separate from development examples.",
          "Re-run the full suite after a change.",
          "Record model, configuration, date, cost, and response time.",
        ],
      },
      {
        title: "Make the boundary visible",
        paragraphs: [
          "The commercial analyst on this site is a deliberately narrow example. Its guided mode runs fixed calculations over invented data. It demonstrates calculation checks, evidence display, and abstention behavior. Its regression results do not establish the quality of an unrestricted AI analyst.",
          "A production system would also need access controls, representative user testing, monitoring, incident handling, and evaluation against the actual deployment context. A demonstration is a useful place to make those limits explicit.",
        ],
      },
    ],
    sources: [
      {
        label: "Further reading: Anthropic, Demystifying evals for AI agents",
        url: "https://www.anthropic.com/research/demystifying-evals-for-ai-agents",
      },
    ],
  },
  {
    slug: "from-ai-time-saved-to-business-value",
    title: "What happens after the time is saved?",
    summary:
      "A worksheet for connecting an AI workflow to adoption, review effort, and an observable business outcome.",
    category: "AI adoption",
    minutes: 5,
    sections: [
      {
        title: "Follow the work through to its outcome",
        paragraphs: [
          "Imagine a fictional sales team that spends 30 minutes preparing each account brief. A new assistant creates a draft in three minutes. It is tempting to report a 90 percent productivity improvement immediately.",
          "The relevant workflow also includes reviewing the brief, correcting mistakes, and incorporating it into a customer conversation. If review takes 15 minutes and the brief is rarely used, the drafting improvement tells only part of the story.",
          "Define the unit of work before measuring. In this example, it is an account brief that a seller can use, with an agreed quality threshold. Compare the same task and quality standard before and after introducing the tool.",
        ],
      },
      {
        title: "Use a transparent value model",
        paragraphs: [
          "A starting estimate is: eligible tasks multiplied by adoption, multiplied by net minutes saved per task, divided by 60. Net minutes saved must include review, corrections, and any additional coordination.",
          "For illustration, 200 monthly briefs, 50 percent adoption, and 12 net minutes saved produce 20 hours of recovered capacity. That is a planning estimate, not cash savings. It becomes a financial benefit only when the organization can explain how the capacity is used or which spending changes.",
          "Keep recurring tool costs, implementation effort, and support costs visible. Show a low-adoption scenario. An attractive result that depends on nearly everyone changing their behavior deserves further investigation.",
        ],
      },
      {
        title: "Measure adoption where the work happens",
        paragraphs: [
          "Count eligible users and eligible tasks separately from signups. A user who opens a tool once is different from a user who relies on it in a recurring workflow.",
          "Choose one downstream measure that matches the intervention. Examples include time to an approved decision, time to a first useful customer outcome, or rework per completed task. Explain other factors that could affect the measure.",
          "Use a comparison group or phased rollout where practical. Without a credible comparison, describe changes as observed associations and avoid claiming the AI caused them.",
        ],
        checklist: [
          "Define an eligible task and its quality threshold.",
          "Measure the full workflow before introducing AI.",
          "Include review and correction time.",
          "Track recurring use with an explicit denominator.",
          "Separate recovered capacity from realized savings.",
          "Assign an owner to one downstream outcome.",
          "Record competing explanations and unintended effects.",
        ],
      },
      {
        title: "Decide in advance what would change the plan",
        paragraphs: [
          "A rollout plan should include conditions for expanding, revising, and pausing the tool. For example, a serious factual error could trigger human review for every output; low repeat use could trigger workflow research before more features are added.",
          "Treat these thresholds as decisions made for the specific context. There is no universal adoption percentage or accuracy score that makes every AI product ready to scale.",
        ],
      },
    ],
  },
  {
    slug: "turning-a-gtm-problem-into-a-program",
    title: "Turn a vague GTM problem into a program people can run.",
    summary:
      "A practical brief for moving from a signal in the data to a decision, an owner, and a measurable rollout.",
    category: "GTM execution",
    minutes: 5,
    sections: [
      {
        title: "Make the problem falsifiable",
        paragraphs: [
          "“We need better activation” is a starting point. A useful problem statement identifies the customer group, the event that counts as activation, the time allowed to reach it, and the baseline.",
          "In the fictional scenario used in the GTM activation demo, activation means completing a first successful workflow within 14 days of signup. Every account in the baseline cohort has had the full 14 days to qualify. This avoids penalizing recent signups simply because they have not had enough time.",
          "State what the data cannot tell you. A drop between connection and first use suggests where to investigate. It does not establish whether documentation, reliability, incentives, or customer fit is responsible.",
        ],
      },
      {
        title: "Compare interventions on the same basis",
        paragraphs: [
          "For each option, identify the eligible population, the expected percentage-point lift, the cost, and the delivery dependency. Keep predicted lift visibly separate from measured results.",
          "Multiplying eligible accounts by a possible lift gives a scenario for incremental activations. It is not incremental revenue. Revenue requires additional assumptions about conversion, retention, pricing, and the causal effect of the intervention.",
          "Prioritization should consider reversibility and time to learn as well as possible upside. A small assisted-onboarding pilot may resolve an uncertainty that blocks a larger product investment.",
        ],
      },
      {
        title: "Give the program an operating structure",
        paragraphs: [
          "Name one accountable owner, the contributors, the decision maker, and the dependencies. A list of departments is not an ownership model.",
          "Use milestones that describe evidence: a validated baseline, a tested intervention, an observed outcome. Include the point at which the team will decide whether to continue.",
          "In an executive update, lead with the decision required, what changed, the evidence, and the next action. Track unresolved risks with an owner and a date rather than carrying them indefinitely as background context.",
        ],
        checklist: [
          "Define the customer segment, event, and observation window.",
          "Check data coverage and cohort maturity.",
          "Name the hypothesis and what would disprove it.",
          "Compare options using the same denominator.",
          "Assign an accountable owner and dependencies.",
          "Define a primary outcome and a quality guardrail.",
          "Set a review date and expansion or stop criteria.",
        ],
      },
      {
        title: "Close the loop",
        paragraphs: [
          "Before expanding, check whether the intended customers used the intervention and whether the outcome changed. Investigate support burden, reliability, and customer feedback alongside the headline metric.",
          "Document the assumptions that were wrong and the operating steps worth reusing. The next program should benefit from what the team learned without inheriting its conclusions automatically.",
        ],
      },
    ],
  },
];

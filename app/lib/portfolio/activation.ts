export const cohorts = [
  {
    id: "small",
    label: "Small business",
    signedUp: 240,
    connected: 180,
    activated: 72,
  },
  {
    id: "mid",
    label: "Mid-market",
    signedUp: 120,
    connected: 90,
    activated: 54,
  },
  {
    id: "enterprise",
    label: "Enterprise",
    signedUp: 40,
    connected: 24,
    activated: 12,
  },
] as const;
export const interventions = [
  {
    id: "setup",
    name: "Guided setup",
    hypothesis:
      "A clearer setup path may help customers complete their first workflow.",
    owner: "Product + customer success",
    fixed: 2000,
    perAccount: 8,
    liftMultiplier: 1,
    dependency: "Instrument setup events and identify where attempts fail.",
  },
  {
    id: "workshop",
    name: "Workflow workshop",
    hypothesis:
      "A worked example may help customers connect the product to a useful task.",
    owner: "Customer success + enablement",
    fixed: 3500,
    perAccount: 30,
    liftMultiplier: 1.5,
    dependency: "Recruit a pilot cohort and prepare a repeatable workshop.",
  },
  {
    id: "concierge",
    name: "Assisted onboarding",
    hypothesis:
      "Direct help may resolve obstacles that a self-serve flow cannot.",
    owner: "Customer success + solutions",
    fixed: 4500,
    perAccount: 80,
    liftMultiplier: 2,
    dependency: "Confirm support capacity and document handoff boundaries.",
  },
] as const;
export function modelActivation(
  cohortId: string,
  lift: number,
  budget: number,
) {
  const c = cohorts.find((c) => c.id === cohortId);
  if (
    !c ||
    !Number.isFinite(lift) ||
    lift < 0 ||
    lift > 25 ||
    !Number.isFinite(budget) ||
    budget < 0
  )
    throw new Error("Invalid planning inputs");
  const baseline = (c.activated / c.signedUp) * 100;
  const options = interventions.map((i) => {
    const appliedLift = Math.min(lift * i.liftMultiplier, 100 - baseline);
    const additional = (c.signedUp * appliedLift) / 100;
    const cost = i.fixed + i.perAccount * c.signedUp;
    return {
      ...i,
      appliedLift,
      additional,
      cost,
      costPerActivation: additional > 0 ? cost / additional : null,
      withinBudget: cost <= budget,
      projectedRate: baseline + appliedLift,
    };
  });
  const recommendation =
    options
      .filter((o) => o.withinBudget && o.additional > 0)
      .sort(
        (a, b) =>
          (a.costPerActivation ?? Infinity) - (b.costPerActivation ?? Infinity),
      )[0] || null;
  return { cohort: c, baseline, options, recommendation };
}

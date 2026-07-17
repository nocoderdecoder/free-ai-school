# Research-session readiness contract

Status: deterministic pre-session check for the five-person `workflow-builder-alpha` study. It records preparation assertions, never participant names, contact details, work content, transcripts, or consent responses.

The validator does not recruit people, approve privacy policy, confirm that a file exists, or prove that a human completed calibration. It fails closed unless the operator supplies the exact approved assertions and restricted-storage locators.

## Required manifest

The JSON object accepts exact keys only:

- schema version `2026-07-17.v1`, the full release commit SHA, and study ID `workflow-builder-alpha`;
- consent version `2026-07-17.v1`, the canonical repository script path, and a recorded study-owner approval assertion;
- two distinct opaque reviewer codes, blind review through saved agreement, and a passed synthetic-only calibration packet;
- exactly `participant-01` through `participant-05`, each marked `eligible_scheduled`, assigned the current consent version, with recording off;
- one restricted session-packet locator and two restricted reviewer-packet locators for every recruiting code;
- both calibrated reviewers paired once per session.

Restricted locators use the canonical paths shown below, derived only from the fixed participant and reviewer codes. They are content-free references to an approved research store. Repository paths, absolute paths, web URLs, traversal segments, names, emails, notes, and other extra fields fail validation.

Example shape:

```json
{
  "schemaVersion": "2026-07-17.v1",
  "commitSha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "studyId": "workflow-builder-alpha",
  "consent": {
    "version": "2026-07-17.v1",
    "scriptPath": "docs/ai-path/research/CONSENT_AND_PRIVACY.md",
    "approvalRecorded": true
  },
  "review": {
    "reviewerIds": ["reviewer-a", "reviewer-b"],
    "blindUntilAgreementSaved": true,
    "calibration": {
      "syntheticOnly": true,
      "status": "passed",
      "packetPath": "restricted://ai-path-research/calibration/synthetic-packet.json",
      "agreementPath": "restricted://ai-path-research/calibration/agreement.json",
      "reviewerIds": ["reviewer-a", "reviewer-b"]
    }
  },
  "sessions": [
    {
      "participantId": "participant-01",
      "recruitmentStatus": "eligible_scheduled",
      "consentVersion": "2026-07-17.v1",
      "recording": "off",
      "packetPath": "restricted://ai-path-research/sessions/participant-01.json",
      "reviewerAssignments": [
        {
          "reviewerId": "reviewer-a",
          "packetPath": "restricted://ai-path-research/reviews/participant-01/reviewer-a.json"
        },
        {
          "reviewerId": "reviewer-b",
          "packetPath": "restricted://ai-path-research/reviews/participant-01/reviewer-b.json"
        }
      ]
    }
  ]
}
```

The example is abbreviated; validation requires all five canonical participant-code entries.

## Run

```bash
node scripts/ai-path-research-readiness.mjs path/to/readiness-manifest.json
npm run test:ai-path-research-ops
```

A valid output has `ready: true`, the bound commit, counts of five participants
and two reviewers, `recording: "off"`, and
`storage: "restricted_non_repository"`. This is pre-session readiness, not
completed-study evidence; the restricted locators are not read by the validator.
Keep the manifest itself free of participant data. Consent outcomes and
de-identified session evidence belong only in the approved restricted research
store.

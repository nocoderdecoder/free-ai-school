# Sample Output

Example result from `list_lab_projects`:

```json
{
  "count": 6,
  "projects": [
    {
      "name": "PromptGrade",
      "tagline": "AI prompt scoring and rewriting",
      "image": "/projects/promptgrade.png",
      "url": "https://ratemyprompt.pro",
      "status": "Live"
    }
  ]
}
```

Example result from `publish_readiness_check`:

```json
{
  "checked": 6,
  "ready": 0,
  "checks": [
    {
      "project": "Speaking Speed Tester",
      "ready": false,
      "blockers": [
        "Missing screenshot image path."
      ],
      "url": "/tools/speaking-speed",
      "image": ""
    }
  ]
}
```

Example result from `list_screenshot_queue`:

```json
{
  "queued": 6,
  "captureReady": 2,
  "blocked": 4,
  "queue": [
    {
      "project": "Speaking Speed Tester",
      "reason": "Project has no screenshot image path.",
      "currentImage": null,
      "suggestedImage": "/projects/speaking-speed-tester.png",
      "captureTarget": "/tools/speaking-speed",
      "captureType": "local-route",
      "captureReady": true,
      "blocker": null
    }
  ]
}
```

Example result from `validate_lab_routes`:

```json
{
  "checked": 6,
  "local": 1,
  "external": 1,
  "missing": 4,
  "routes": [
    {
      "project": "PromptGrade",
      "url": "https://ratemyprompt.pro",
      "type": "external-url",
      "status": "external-url-not-checked",
      "exists": null,
      "file": null
    },
    {
      "project": "Speaking Speed Tester",
      "url": "/tools/speaking-speed",
      "type": "local-route",
      "status": "ok",
      "exists": true,
      "file": "app/tools/speaking-speed/page.tsx"
    }
  ]
}
```

Example result from `draft_lab_project_card`:

```json
{
  "slug": "website-change-monitor",
  "suggestedScreenshot": "/projects/website-change-monitor.png",
  "suggestedRoute": "app/tools/website-change-monitor/page.tsx",
  "project": {
    "name": "Website Change Monitor",
    "tagline": "Weekly website screenshot diff report",
    "image": "/projects/website-change-monitor.png",
    "url": "/tools/website-change-monitor",
    "status": "Built"
  },
  "labCardSnippet": "  {\\n    name: \"Website Change Monitor\",\\n    tagline: \"Weekly website screenshot diff report\",\\n    image: \"/projects/website-change-monitor.png\",\\n    url: \"/tools/website-change-monitor\",\\n    status: \"Built\",\\n  },",
  "warnings": [
    "Create the local route before publishing: app/tools/website-change-monitor/page.tsx"
  ]
}
```

Example result from `create_publish_handoff`:

```markdown
# Portfolio Lab publish handoff

Generated: 2026-06-22T00:00:00.000Z
Project: speaking-speed-tester

## Status

- Ready projects: 0/1
- Projects needing work: 1

## Owner checklist

- [ ] Confirm every listed project should appear on the Lab page.
- [ ] Capture or replace each missing screenshot under `public/projects/`.
- [ ] Open every project URL or route and confirm it loads cleanly.
- [ ] Re-run `npm run smoke` from `portfolio-publisher-mcp` before publishing.
```

Example result from `prioritize_publish_tasks`:

```json
{
  "checked": 6,
  "ready": 0,
  "needsWork": 6,
  "topPriority": "Speaking Speed Tester",
  "tasks": [
    {
      "rank": 1,
      "project": "Speaking Speed Tester",
      "ready": false,
      "focus": "Add screenshot path and capture image",
      "blockers": [
        "Missing screenshot image path."
      ],
      "captureTarget": "/tools/speaking-speed",
      "captureType": "local-route",
      "suggestedScreenshot": "/projects/speaking-speed-tester.png",
      "nextActions": [
        "Set image to /projects/speaking-speed-tester.png."
      ]
    }
  ]
}
```

Example result from `create_project_publish_brief`:

```markdown
# Project publish brief: Speaking Speed Tester

Generated: 2026-06-25T00:00:00.000Z
Requested project: current top priority

## Status

- Publish status: Needs work
- Current focus: Add screenshot path and capture image
- Lab badge: Live
- Screenshot target: /tools/speaking-speed

## Lab card copy

- Name: Speaking Speed Tester
- Tagline: Real-time words-per-minute measurement
- URL: /tools/speaking-speed
- Image: Missing

## Files to check

- Route: app/tools/speaking-speed/page.tsx
- Suggested image file: public/projects/speaking-speed-tester.png

## Blockers

- Missing screenshot image path.

## Next actions

- [ ] Set image to /projects/speaking-speed-tester.png.
- [ ] Re-run `npm run smoke` from `portfolio-publisher-mcp` after changes.
```

Example result from `create_lab_publish_digest`:

```markdown
# Portfolio Lab publish digest

Generated: 2026-06-27T00:00:00.000Z

## Inventory

- Projects listed: 6
- Status mix: Built: 1, Demo: 1, Internal: 1, Live: 2, Running: 1
- Ready for owner review: 0/6

## Coverage

- Local routes: 1
- External URLs: 1
- Missing URLs or route files: 4
- Missing screenshots: 6

## Current priority

- Project: Speaking Speed Tester
- Focus: Add screenshot path and capture image
- Screenshot target: /tools/speaking-speed
- [ ] Set image to /projects/speaking-speed-tester.png.

## Owner next step

- Capture the highest-priority missing screenshot, then re-run `npm run smoke`.
```

Example result from `audit_lab_card_copy`:

```json
{
  "checked": 6,
  "cardsWithIssues": 0,
  "cardsWithWarnings": 1,
  "duplicateSlugs": [],
  "statusesSeen": [
    "Built",
    "Demo",
    "Internal",
    "Live",
    "Running"
  ],
  "cards": [
    {
      "project": "Speaking Speed Tester",
      "slug": "speaking-speed-tester",
      "status": "Live",
      "issueCount": 0,
      "warningCount": 1,
      "issues": [],
      "warnings": [
        "Local route slug differs from project slug: speaking-speed"
      ]
    }
  ]
}
```

Example result from `create_lab_copy_audit_report`:

```markdown
# Lab card copy audit report

Generated: 2026-06-30T00:00:00.000Z

## Summary

- Cards checked: 6
- Cards with issues: 0
- Cards with warnings: 1
- Statuses seen: Built, Demo, Internal, Live, Running
- Duplicate slugs: None

## Issues

- No blocking copy issues found.

## Warnings

### Speaking Speed Tester

- Slug: speaking-speed-tester
- Status: Live
- Local route slug differs from project slug: speaking-speed

## Owner next step

- Review the warnings and decide whether the Lab card conventions should be updated.
```

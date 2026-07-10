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

Example result from `create_screenshot_capture_plan`:

~~~markdown
# Lab screenshot capture plan

Generated: 2026-07-01T00:00:00.000Z

## Summary

- Missing screenshots: 6
- Ready to capture: 2
- Blocked: 4

## Ready to capture

### Speaking Speed Tester

- Target: /tools/speaking-speed
- Target type: local-route
- Save as: public/projects/speaking-speed-tester.png
- Reason: Project has no screenshot image path.

## Blocked captures

### CSV Cleaner

- Save as: public/projects/csv-cleaner.png
- Blocker: Add a project URL or local route before capturing a screenshot.
- Reason: Project has no screenshot image path.

## Verification

```bash
cd portfolio-publisher-mcp
npm run smoke
```
~~~

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
  "suggestedIcon": "WebsiteChangeMonitorIcon",
  "project": {
    "name": "Website Change Monitor",
    "tagline": "Weekly website screenshot diff report",
    "image": "/projects/website-change-monitor.png",
    "url": "/tools/website-change-monitor",
    "status": "Built",
    "icon": "WebsiteChangeMonitorIcon"
  },
  "labCardSnippet": "  {\\n    name: \"Website Change Monitor\",\\n    tagline: \"Weekly website screenshot diff report\",\\n    image: \"/projects/website-change-monitor.png\",\\n    url: \"/tools/website-change-monitor\",\\n    status: \"Built\",\\n    Icon: WebsiteChangeMonitorIcon,\\n  },",
  "warnings": [
    "Add and import the Lab thumbnail icon before publishing: WebsiteChangeMonitorIcon",
    "Create the local route before publishing: app/tools/website-change-monitor/page.tsx"
  ]
}
```

Example result from `create_lab_card_patch_preview`:

~~~markdown
# Lab card patch preview: Website Change Monitor

Generated: 2026-07-02T00:00:00.000Z

## Status

- Preview only: no files were changed.
- Target file: app/lab/page.tsx
- Insert location: add this object inside the `projects` array.

## Lab card object

```ts
  {
    name: "Website Change Monitor",
    tagline: "Weekly website screenshot diff report",
    image: "/projects/website-change-monitor.png",
    url: "/tools/website-change-monitor",
    status: "Built",
    Icon: WebsiteChangeMonitorIcon,
  },
```

## Files to prepare

- Route: app/tools/website-change-monitor/page.tsx
- Screenshot: public/projects/website-change-monitor.png
- Icon component: app/components/LabThumbnails.tsx export WebsiteChangeMonitorIcon

## Warnings

- Add and import the Lab thumbnail icon before publishing: WebsiteChangeMonitorIcon
- Create the local route before publishing: app/tools/website-change-monitor/page.tsx

## Verification

```bash
cd portfolio-publisher-mcp
npm run smoke
```
~~~

Example result from `create_lab_card_patch_artifact`:

```json
{
  "previewOnly": true,
  "targetFile": "app/lab/page.tsx",
  "insertionHint": "Insert this object as a new item inside the `projects` array.",
  "labCard": {
    "name": "Website Change Monitor",
    "tagline": "Weekly website screenshot diff report",
    "image": "/projects/website-change-monitor.png",
    "url": "/tools/website-change-monitor",
    "status": "Built",
    "icon": "WebsiteChangeMonitorIcon"
  },
  "unifiedDiff": "--- a/app/lab/page.tsx\n+++ b/app/lab/page.tsx\n@@ -12,1 +12,9 @@\n const projects = [\n+  {\n+    name: \"Website Change Monitor\",\n+    tagline: \"Weekly website screenshot diff report\",\n+    image: \"/projects/website-change-monitor.png\",\n+    url: \"/tools/website-change-monitor\",\n+    status: \"Built\",\n+    Icon: WebsiteChangeMonitorIcon,\n+  },",
  "filesToPrepare": [
    {
      "type": "route",
      "file": "app/tools/website-change-monitor/page.tsx"
    },
    {
      "type": "screenshot",
      "file": "public/projects/website-change-monitor.png"
    },
    {
      "type": "icon",
      "file": "app/components/LabThumbnails.tsx",
      "symbol": "WebsiteChangeMonitorIcon"
    }
  ],
  "warnings": [
    "Add and import the Lab thumbnail icon before publishing: WebsiteChangeMonitorIcon",
    "Create the local route before publishing: app/tools/website-change-monitor/page.tsx"
  ],
  "ownerNextStep": "Review the generated diff, create any listed route/screenshot files, then apply the Lab card change.",
  "verificationCommand": "cd portfolio-publisher-mcp && npm run smoke"
}
```

Example result from `validate_lab_card_patch_artifact`:

```json
{
  "previewOnly": true,
  "applyStatus": "needs-prep",
  "readyToApply": true,
  "publishReadyAfterApply": false,
  "targetFile": "app/lab/page.tsx",
  "insertionLine": 18,
  "labCard": {
    "name": "Website Change Monitor",
    "tagline": "Weekly website screenshot diff report",
    "image": "/projects/website-change-monitor.png",
    "url": "/tools/website-change-monitor",
    "status": "Built",
    "icon": "WebsiteChangeMonitorIcon"
  },
  "slug": "website-change-monitor",
  "blockingIssues": [],
  "readinessBlockers": [
    "Local route file not found: app/tools/website-change-monitor/page.tsx",
    "Screenshot file not found: public/projects/website-change-monitor.png",
    "Lab thumbnail icon is not currently imported on the Lab page: WebsiteChangeMonitorIcon"
  ],
  "warnings": [
    "Create the local route before publishing: app/tools/website-change-monitor/page.tsx"
  ],
  "filesToPrepare": [
    {
      "type": "route",
      "file": "app/tools/website-change-monitor/page.tsx"
    },
    {
      "type": "screenshot",
      "file": "public/projects/website-change-monitor.png"
    },
    {
      "type": "icon",
      "file": "app/components/LabThumbnails.tsx",
      "symbol": "WebsiteChangeMonitorIcon"
    }
  ],
  "icon": {
    "name": "WebsiteChangeMonitorIcon",
    "required": true,
    "validIdentifier": true,
    "availableOnLabPage": false,
    "sourceFile": "app/components/LabThumbnails.tsx"
  },
  "ownerNextStep": "Create the listed route/screenshot/icon files, then apply the generated Lab card patch.",
  "verificationCommand": "cd portfolio-publisher-mcp && npm run smoke"
}
```

Example result from `stage_lab_card_patch_artifact` without `allowNeedsPrep`:

```json
{
  "staged": false,
  "applyStatus": "needs-prep",
  "readyToApply": true,
  "publishReadyAfterApply": false,
  "blockingIssues": [],
  "readinessBlockers": [
    "Local route file not found: app/tools/website-change-monitor/page.tsx",
    "Screenshot file not found: public/projects/website-change-monitor.png",
    "Lab thumbnail icon is not currently imported on the Lab page: WebsiteChangeMonitorIcon"
  ],
  "requiredOptIn": "Set allowNeedsPrep to true to stage a safe apply patch before route/screenshot/icon prep is complete.",
  "ownerNextStep": "Create the listed route/screenshot/icon files, or opt in to stage a review artifact before prep is complete."
}
```

Example result from `stage_lab_card_patch_artifact` with `allowNeedsPrep: true`:

```json
{
  "staged": true,
  "applyStatus": "needs-prep",
  "readyToApply": true,
  "publishReadyAfterApply": false,
  "targetFile": "app/lab/page.tsx",
  "patchFile": "portfolio-publisher-mcp/generated/website-change-monitor-lab-card.patch",
  "handoffFile": "portfolio-publisher-mcp/generated/website-change-monitor-lab-card.md",
  "filesWritten": [
    "portfolio-publisher-mcp/generated/website-change-monitor-lab-card.patch",
    "portfolio-publisher-mcp/generated/website-change-monitor-lab-card.md"
  ],
  "readinessBlockers": [
    "Local route file not found: app/tools/website-change-monitor/page.tsx",
    "Screenshot file not found: public/projects/website-change-monitor.png",
    "Lab thumbnail icon is not currently imported on the Lab page: WebsiteChangeMonitorIcon"
  ],
  "ownerNextStep": "Complete the listed prep items, then review the staged handoff and patch file before applying.",
  "verificationCommand": "cd portfolio-publisher-mcp && npm run smoke"
}
```

Example result from `inspect_lab_thumbnail_icons`:

```json
{
  "checkedProjects": 6,
  "sourceFiles": {
    "labPage": "app/lab/page.tsx",
    "thumbnails": "app/components/LabThumbnails.tsx"
  },
  "ready": true,
  "counts": {
    "used": 6,
    "imported": 6,
    "exported": 6,
    "missingImports": 0,
    "missingExports": 0,
    "unusedImports": 0,
    "unusedExports": 0
  },
  "missingImports": [],
  "missingExports": [],
  "unusedImports": [],
  "unusedExports": []
}
```

Example result from `create_lab_thumbnail_icon_report`:

~~~markdown
# Lab thumbnail icon report

Generated: 2026-07-08T00:00:00.000Z

## Summary

- Projects checked: 6
- Icons used by cards: 6
- Icons imported on Lab page: 6
- Icons exported by thumbnails file: 6
- Missing imports: 0
- Missing exports: 0

## Card coverage

- PromptGrade: PromptGradeIcon (ok)
- Speaking Speed Tester: SpeakingSpeedIcon (ok)

## Missing prep

- Current Lab card icons are imported and exported.

## Cleanup candidates

- No unused Lab thumbnail imports or exports found.

## Verification

```bash
cd portfolio-publisher-mcp
npm run smoke
```
~~~

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

Example result from `validate_staged_lab_card_patch`:

```json
{
  "status": "ready",
  "reviewReady": true,
  "projectName": "Website Change Monitor",
  "slug": "website-change-monitor",
  "targetFile": "app/lab/page.tsx",
  "patchFile": "portfolio-publisher-mcp/generated/website-change-monitor-lab-card.patch",
  "handoffFile": "portfolio-publisher-mcp/generated/website-change-monitor-lab-card.md",
  "insertionLine": 22,
  "issues": [],
  "warnings": [],
  "checksums": {
    "patchSha256": "<sha256>",
    "handoffSha256": "<sha256>"
  },
  "ownerNextStep": "Review the staged handoff and patch contents before applying the patch manually."
}
```

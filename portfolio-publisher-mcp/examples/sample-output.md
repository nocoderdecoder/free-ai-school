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

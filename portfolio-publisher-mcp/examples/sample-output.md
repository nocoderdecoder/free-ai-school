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
  "queued": 5,
  "captureReady": 1,
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

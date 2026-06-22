/**
 * notify-failure.mjs
 *
 * Shared failure notifier for the daily content-generation GitHub Actions
 * workflows (daily-trending.yml, daily-deals-events.yml).
 *
 * Sends an email via Resend to the site owner when a pipeline fails, with a
 * direct link to the failed GitHub Actions run.
 *
 * Run by the workflow itself with `if: failure()`, e.g.:
 *
 *   node scripts/notify-failure.mjs "Daily Trending Article"
 *
 * Required env vars (set by GitHub Actions automatically, except RESEND_API_KEY):
 *   RESEND_API_KEY     - GitHub secret, required to actually send the email
 *   RESEND_FROM_EMAIL   - optional, falls back to Resend sandbox sender
 *   CONTACT_EMAIL_TO    - optional, falls back to anshulgupta1512@gmail.com
 *   GITHUB_SERVER_URL   - provided by GitHub Actions
 *   GITHUB_REPOSITORY   - provided by GitHub Actions
 *   GITHUB_RUN_ID        - provided by GitHub Actions
 *
 * This script never throws on missing config — a failed notification
 * shouldn't itself fail the workflow further or hide the original error.
 */

import { Resend } from 'resend'

const pipelineName = process.argv[2] || 'Unknown pipeline'

const {
  RESEND_API_KEY,
  RESEND_FROM_EMAIL,
  CONTACT_EMAIL_TO,
  GITHUB_SERVER_URL,
  GITHUB_REPOSITORY,
  GITHUB_RUN_ID,
} = process.env

const runUrl =
  GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
    ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
    : null

async function main() {
  if (!RESEND_API_KEY) {
    console.error(
      '⚠️   Cannot send failure email: RESEND_API_KEY is not set. ' +
      'Add it as a GitHub Actions secret to enable failure notifications.'
    )
    return
  }

  const resend = new Resend(RESEND_API_KEY)
  const to = CONTACT_EMAIL_TO || 'anshulgupta1512@gmail.com'
  const from = RESEND_FROM_EMAIL || 'Pipeline Alerts <onboarding@resend.dev>'

  try {
    await resend.emails.send({
      from,
      to,
      subject: `[anshul.ai] Pipeline failed: ${pipelineName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">A daily content pipeline failed</h2>
          <p><strong>Pipeline:</strong> ${pipelineName}</p>
          <p><strong>Time (UTC):</strong> ${new Date().toISOString()}</p>
          ${
            runUrl
              ? `<p><a href="${runUrl}">View the failed run on GitHub Actions →</a></p>`
              : `<p style="color: #999;">(No run URL available — GITHUB_SERVER_URL/GITHUB_REPOSITORY/GITHUB_RUN_ID not set.)</p>`
          }
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">
            This is an automated alert from the anshul.ai content pipelines.
            Check the run logs for the underlying error (RSS fetch timeout, Claude API error, or Sanity publish error).
          </p>
        </div>
      `,
    })
    console.log(`📧  Failure notification sent to ${to}`)
  } catch (error) {
    console.error('⚠️   Failed to send failure notification email:', error)
  }
}

main()

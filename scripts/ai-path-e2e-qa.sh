#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "${script_dir}/.." && pwd)"
qa_base_url="${AI_PATH_QA_BASE_URL:-}"

if [[ -z "${qa_base_url}" ]]; then
  echo "AI_PATH_QA_BASE_URL is required (for example, http://127.0.0.1:3022/ai-path)." >&2
  echo "The harness never starts, stops, or rebuilds the application server." >&2
  exit 2
fi

case "${qa_base_url}" in
  http://127.0.0.1:*|http://localhost:*|https://127.0.0.1:*|https://localhost:*) ;;
  *)
    echo "Refusing non-local QA target: ${qa_base_url}" >&2
    exit 2
    ;;
esac

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required by the bundled Playwright CLI wrapper." >&2
  exit 2
fi

if ! curl --fail --silent --show-error "${qa_base_url}" >/dev/null; then
  echo "The local AI Path server is not reachable at ${qa_base_url}." >&2
  exit 2
fi

if [[ -n "${AI_PATH_PLAYWRIGHT_CLI:-}" ]]; then
  if [[ ! -x "${AI_PATH_PLAYWRIGHT_CLI}" ]]; then
    echo "AI_PATH_PLAYWRIGHT_CLI is not executable: ${AI_PATH_PLAYWRIGHT_CLI}" >&2
    exit 2
  fi
  cli=("${AI_PATH_PLAYWRIGHT_CLI}")
elif command -v playwright-cli >/dev/null 2>&1; then
  cli=("$(command -v playwright-cli)")
else
  wrapper="${AI_PATH_PLAYWRIGHT_WRAPPER:-${HOME}/.codex/skills/playwright/scripts/playwright_cli.sh}"
  if [[ ! -f "${wrapper}" ]]; then
    echo "Playwright CLI not found. Set AI_PATH_PLAYWRIGHT_CLI or AI_PATH_PLAYWRIGHT_WRAPPER." >&2
    exit 2
  fi
  cli=(bash "${wrapper}")
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
artifact_dir="${repo_root}/output/playwright/ai-path-e2e-${timestamp}"
mkdir -p "${artifact_dir}"
session_name="ai-path-e2e-$$"
session_open=false

close_session() {
  if [[ "${session_open}" == true ]]; then
    (cd "${artifact_dir}" && "${cli[@]}" --session "${session_name}" close) >/dev/null 2>&1 || true
  fi
}
trap close_session EXIT

cd "${artifact_dir}"
"${cli[@]}" --session "${session_name}" open "data:text/html,<title>${qa_base_url}</title>"
session_open=true
"${cli[@]}" --session "${session_name}" snapshot

set +e
"${cli[@]}" --session "${session_name}" run-code \
  --filename "${repo_root}/scripts/ai-path-e2e-qa.js" \
  2>&1 | tee "${artifact_dir}/results.txt"
qa_status=${PIPESTATUS[0]}
set -e

if grep --quiet '^### Error' "${artifact_dir}/results.txt"; then
  qa_status=1
fi
if ! grep --quiet '"ok":true' "${artifact_dir}/results.txt"; then
  qa_status=1
fi

"${cli[@]}" --session "${session_name}" console error >"${artifact_dir}/console-errors.txt" 2>&1 || true
"${cli[@]}" --session "${session_name}" requests >"${artifact_dir}/network.txt" 2>&1 || true

if [[ ${qa_status} -ne 0 ]]; then
  echo "AI Path end-to-end QA failed. Artifacts: ${artifact_dir}" >&2
  exit "${qa_status}"
fi

echo "AI Path end-to-end QA passed. Artifacts: ${artifact_dir}"

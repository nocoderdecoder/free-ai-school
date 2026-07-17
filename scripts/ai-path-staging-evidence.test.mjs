import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { finalizeStagingEvidence, STAGING_EVIDENCE_SPECS } from './ai-path-staging-evidence.mjs'

const releaseCommit = '0123456789abcdef0123456789abcdef01234567'

function fixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ai-path-staging-evidence-'))
  mkdirSync(join(root, 'docs', 'ai-path'), { recursive: true })
  writeFileSync(join(root, 'docs', 'ai-path', 'RETENTION_OPERATIONS.md'), 'reviewed retention runbook\n')
  const paths = {}
  for (const spec of STAGING_EVIDENCE_SPECS) {
    const path = join(root, `${spec.id}.log`)
    writeFileSync(path, `${spec.checks.map((check) => `PASS: ${check}`).join('\n')}\n${spec.marker}\n`)
    paths[spec.option] = path
  }
  return {
    root,
    releaseCommit,
    outputDirectory: join(root, 'finalized'),
    ...paths,
    ...overrides,
  }
}

test('finalizes content-free staging logs into commit-bound gate documents', () => {
  const options = fixture()
  const report = finalizeStagingEvidence(options)
  assert.equal(report.state, 'EVIDENCE_FINALIZED_NOT_APPROVED')
  assert.equal(report.opensLatches, false)
  assert.equal(report.createsApprovalIndex, false)
  for (const spec of STAGING_EVIDENCE_SPECS) {
    const document = JSON.parse(readFileSync(join(options.outputDirectory, spec.document), 'utf8'))
    assert.equal(document.releaseCommit, releaseCommit)
    assert.equal(document.artifact.path, spec.log)
    assert.match(document.artifact.sha256, /^[0-9a-f]{64}$/)
    assert.deepEqual(document.checks, spec.checks)
  }
})

test('fails closed for incomplete, secret-bearing, symlinked, and overwrite inputs', () => {
  const incomplete = fixture()
  writeFileSync(incomplete.authLog, 'PASS: owner-a-access\n')
  assert.throws(() => finalizeStagingEvidence(incomplete), /success marker is absent/)

  const secret = fixture()
  writeFileSync(secret.retentionLog, `${readFileSync(secret.retentionLog, 'utf8')}Authorization: Bearer private-token\n`)
  assert.throws(() => finalizeStagingEvidence(secret), /prohibited secret material/)

  const linked = fixture()
  const real = linked.exportDeleteLog
  linked.exportDeleteLog = join(linked.root, 'linked.log')
  symlinkSync(real, linked.exportDeleteLog)
  assert.throws(() => finalizeStagingEvidence(linked), /non-symlink/)

  const overwrite = fixture()
  mkdirSync(overwrite.outputDirectory)
  assert.throws(() => finalizeStagingEvidence(overwrite), /refusing to overwrite/)
})

test('rejects a release identity that cannot bind all three proofs', () => {
  assert.throws(() => finalizeStagingEvidence(fixture({ releaseCommit: 'main' })), /40-character Git SHA/)
})

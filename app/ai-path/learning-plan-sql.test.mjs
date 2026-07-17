import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const planMigrationUrl = new URL('../../supabase/migrations/20260717010000_ai_path_learning_plans.sql', import.meta.url)
const sessionMigrationUrl = new URL('../../supabase/migrations/20260717000000_ai_path_assessment_sessions.sql', import.meta.url)
const [sql, sessionSql] = await Promise.all([
  readFile(planMigrationUrl, 'utf8'),
  readFile(sessionMigrationUrl, 'utf8'),
])

test('every plan-loop table enables RLS and authenticated users receive read-only table grants', () => {
  const planTables = [
    'ai_path_learning_plans',
    'ai_path_learning_plan_snapshots',
    'ai_path_learning_plan_task_progress',
    'ai_path_learning_plan_check_ins',
    'ai_path_learning_plan_time_budget_changes',
    'ai_path_learning_plan_adaptations',
  ]
  for (const table of planTables) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`))
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated;`))
    assert.match(sql, new RegExp(`grant select on public\\.${table} to authenticated;`))
    assert.doesNotMatch(sql, new RegExp(`grant (?:insert|update|delete|all)[^;]*${table}[^;]*authenticated`, 'i'))
  }
})

test('forgery-sensitive generation RPCs are service-only while owner decisions are bounded RPCs', () => {
  for (const signature of [
    'create_ai_path_learning_plan\\(uuid, uuid, integer, text, text, text, text, jsonb\\)',
    'propose_ai_path_plan_adaptation\\(uuid, uuid, text, jsonb, integer\\)',
    'add_ai_path_plan_reassessment_snapshot\\(uuid, uuid, uuid, text, text, text, text, jsonb, integer\\)',
  ]) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${signature}[\\s\\S]*?from public, anon, authenticated;`))
    assert.match(sql, new RegExp(`grant execute on function public\\.${signature}[\\s\\S]*?to service_role;`))
  }
  for (const rpc of [
    'set_owned_ai_path_plan_task_progress',
    'adjust_owned_ai_path_plan_time_budget',
    'add_owned_ai_path_plan_check_in',
    'respond_to_owned_ai_path_plan_adaptation',
  ]) {
    assert.match(sql, new RegExp(`grant execute on function public\\.${rpc}\\([^;]+\\)\\s+to authenticated;`))
  }
  assert.match(sql, /swap_count > 3 or budget_count > 1/)
  assert.match(sql, /p_decision not in \('approve', 'reject'\)/)
})

test('task, revision, and terminal-state invariants are enforced inside mutation RPCs', () => {
  assert.match(sql, /jsonb_array_length\(p_tasks\) = 12/)
  assert.match(sql, /current_status = 'pending' and p_next_status in \('in_progress', 'completed', 'skipped'\)/)
  assert.match(sql, /current_status = 'skipped' and p_next_status = 'pending'/)
  assert.equal(sql.match(/Plan revision conflict\./g)?.length, 6)
  assert.equal(sql.match(/Plan is immutable after completion or archival\./g)?.length, 6)
  assert.match(sql, /status = 'proposed'/)
  assert.match(sql, /status = 'approved', decided_at = now\(\)/)
})

test('account or assessment hard-delete removes derived plans and cascades through plan children', () => {
  assert.match(sql, /owner_id uuid not null references auth\.users\(id\) on delete cascade/)
  assert.match(sql, /source_assessment_session_id uuid not null references public\.ai_path_assessment_sessions\(id\) on delete cascade/)
  assert.match(sql, /create trigger ai_path_assessment_session_delete_derived_plans/)
  assert.match(sql, /delete from public\.ai_path_learning_plans as plan[\s\S]*snapshot\.source_assessment_session_id = old\.id/)
  for (const childTable of [
    'ai_path_learning_plan_snapshots',
    'ai_path_learning_plan_task_progress',
    'ai_path_learning_plan_check_ins',
    'ai_path_learning_plan_time_budget_changes',
    'ai_path_learning_plan_adaptations',
  ]) {
    const tableBlock = sql.slice(sql.indexOf(`create table public.${childTable}`))
    assert.match(tableBlock.slice(0, tableBlock.indexOf('\n);') + 3), /references public\.ai_path_learning_plans\(id\) on delete cascade/)
  }
})

test('plan retention is deliberately longer than session retention and private check-in text is not emitted to analytics', () => {
  assert.match(sql, /retention_expires_at timestamptz not null default \(now\(\) \+ interval '180 days'\)/)
  assert.match(sessionSql, /retention_expires_at timestamptz not null default \(now\(\) \+ interval '90 days'\)/)
  assert.match(sql, /Never copy check_in_text into analytics or operational telemetry/)
  assert.doesNotMatch(sql, /insert into public\.[A-Za-z0-9_]*analytics[\s\S]*check_in_text/i)
  assert.doesNotMatch(sql, /insert into public\.[A-Za-z0-9_]*events[\s\S]*check_in_text/i)
})

test('owner export, delete, and service-only retention purge are explicit', () => {
  assert.match(sql, /where plan\.id = p_plan_id and plan\.owner_id = auth\.uid\(\)/)
  assert.match(sql, /delete from public\.ai_path_learning_plans where id = p_plan_id and owner_id = auth\.uid\(\)/)
  assert.match(sql, /grant execute on function public\.export_owned_ai_path_learning_plan\(uuid\) to authenticated/)
  assert.match(sql, /grant execute on function public\.delete_owned_ai_path_learning_plan\(uuid\) to authenticated/)
  assert.match(sql, /revoke all on function public\.purge_expired_ai_path_learning_plans\(\) from public, anon, authenticated/)
  assert.match(sql, /grant execute on function public\.purge_expired_ai_path_learning_plans\(\) to service_role/)
})

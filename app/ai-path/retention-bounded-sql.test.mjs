import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sql = await readFile(new URL(
  '../../supabase/migrations/20260717060000_ai_path_bounded_retention.sql',
  import.meta.url,
), 'utf8')

test('bounded retention replaces both zero-argument purge functions', () => {
  assert.match(sql, /drop function public\.purge_expired_ai_path_sessions\(\)/i)
  assert.match(sql, /drop function public\.purge_expired_ai_path_learning_plans\(\)/i)
  assert.match(sql, /function public\.purge_expired_ai_path_sessions\(p_limit integer\)/i)
  assert.match(sql, /function public\.purge_expired_ai_path_learning_plans\(p_limit integer\)/i)
  assert.equal((sql.match(/p_limit not between 1 and 100000/gi) ?? []).length, 2)
})

test('each purge selects a locked ordered batch before deleting', () => {
  assert.equal((sql.match(/order by retention_expires_at, id/gi) ?? []).length, 2)
  assert.equal((sql.match(/limit p_limit/gi) ?? []).length, 2)
  assert.equal((sql.match(/for update skip locked/gi) ?? []).length, 2)
  assert.equal((sql.match(/using expired_batch/gi) ?? []).length, 2)
})

test('bounded purge RPCs are fixed-path and service-role-only', () => {
  assert.equal((sql.match(/security definer/gi) ?? []).length, 2)
  assert.equal((sql.match(/set search_path = ''/gi) ?? []).length, 2)
  assert.equal((sql.match(/caller_role <> 'service_role'/gi) ?? []).length, 2)
  assert.match(sql, /revoke all on function public\.purge_expired_ai_path_sessions\(integer\)[\s\S]*from public, anon, authenticated/i)
  assert.match(sql, /revoke all on function public\.purge_expired_ai_path_learning_plans\(integer\)[\s\S]*from public, anon, authenticated/i)
  assert.match(sql, /grant execute on function public\.purge_expired_ai_path_sessions\(integer\)[\s\S]*to service_role/i)
  assert.match(sql, /grant execute on function public\.purge_expired_ai_path_learning_plans\(integer\)[\s\S]*to service_role/i)
})

test('bounded retention SQL contains no content or paid-provider surface', () => {
  assert.doesNotMatch(sql, /transcript|check_in_text|report\s*=|openai|fetch\s*\(/i)
})

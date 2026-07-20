import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sql = await readFile(new URL(
  '../../supabase/migrations/20260717050000_ai_path_goal_type_binding.sql',
  import.meta.url,
), 'utf8')
const source = sql.replace(/--.*$/gm, '')

test('goal binding backfills completed sessions without firing update guards', () => {
  assert.match(source, /add column goal_type text not null default 'unsure'/i)
  assert.match(source, /alter column goal_type drop default/i)
  assert.doesNotMatch(source, /update public\.ai_path_assessment_sessions/i)
  assert.match(source, /ai_path_assessment_goal_type_valid check/i)
  assert.match(source, /ai_path_learning_plan_goal_type_valid check/i)
})

test('session and plan goal bindings become immutable after creation', () => {
  assert.match(source, /new\.goal_type is distinct from old\.goal_type/i)
  assert.match(source, /before update on public\.ai_path_assessment_sessions[\s\S]*protect_ai_path_goal_type_binding/i)
  assert.match(source, /before update on public\.ai_path_learning_plans[\s\S]*protect_ai_path_goal_type_binding/i)
})

test('session creation derives owner and validates the bounded goal preference', () => {
  assert.match(source, /current_owner uuid := auth\.uid\(\)/i)
  assert.match(source, /if current_owner is null[\s\S]*errcode = '42501'/i)
  assert.match(source, /if p_goal_type not in \('workflows', 'builder', 'career', 'leader', 'foundations', 'unsure'\)/i)
  assert.match(source, /insert into public\.ai_path_assessment_sessions[\s\S]*owner_id[\s\S]*goal_type[\s\S]*current_owner[\s\S]*p_goal_type/i)
  assert.match(source, /grant execute on function public\.create_owned_ai_path_session\(text, text, text, text, text, text, boolean\)[\s\S]*to authenticated/i)
})

test('plan creation is service-only and rechecks owner, report, completion, and goal binding', () => {
  assert.match(source, /caller_role <> 'service_role'/i)
  assert.match(source, /owner_id = p_owner_id/i)
  assert.match(source, /goal_type = p_goal_type/i)
  assert.match(source, /status = 'complete'/i)
  assert.match(source, /report is not null/i)
  assert.match(source, /revoke all on function public\.create_ai_path_learning_plan\([\s\S]*from public, anon, authenticated/i)
  assert.match(source, /grant execute on function public\.create_ai_path_learning_plan\([\s\S]*to service_role/i)
})

test('goal binding migration has no external or paid-provider surface', () => {
  assert.doesNotMatch(source, /openai|api key|fetch\s*\(|http:\/\/|https:\/\//i)
})

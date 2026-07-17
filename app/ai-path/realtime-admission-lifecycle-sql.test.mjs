import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sql = await readFile(new URL(
  '../../supabase/migrations/20260717070000_ai_path_realtime_admission_lifecycle.sql',
  import.meta.url,
), 'utf8')

const reserveFunction = sql.slice(
  sql.indexOf('create or replace function public.reserve_ai_path_realtime_admission'),
  sql.indexOf('revoke all on function public.reserve_ai_path_realtime_admission'),
)
const finalizeFunction = sql.slice(
  sql.indexOf('create or replace function public.finalize_ai_path_realtime_admission'),
  sql.indexOf('revoke all on function public.finalize_ai_path_realtime_admission'),
)
const cancelFunction = sql.slice(
  sql.indexOf('create or replace function public.cancel_ai_path_realtime_admission'),
  sql.indexOf('revoke all on function public.cancel_ai_path_realtime_admission'),
)

test('late finalization has a fixed database-time reconciliation window', () => {
  assert.match(sql, /database_now := clock_timestamp\(\)/)
  assert.match(sql, /target_reservation\.status = 'expired'[\s\S]*database_now <= target_reservation\.expires_at \+ interval '7 days'/)
  assert.match(sql, /else\s+return jsonb_build_object\('kind', 'state_conflict'\)/)
  assert.match(sql, /abs\(extract\(epoch from \(database_now - p_now\)\)\) > 30/)
  assert.doesNotMatch(sql, /p_reconciliation_window|p_late_finalize|p_retention/)
})

test('user lifecycle RPCs never perform an unbounded global expiry sweep', () => {
  assert.match(reserveFunction, /where status = 'reserved' and expires_at <= database_now\s+\) then\s+raise exception 'Realtime admission maintenance is required\.'/)
  assert.doesNotMatch(reserveFunction, /update public\.ai_path_realtime_admission_reservations[\s\S]*set status = 'expired'/)

  assert.match(finalizeFunction, /where id = p_reservation_id\s+for update/)
  assert.match(finalizeFunction, /target_reservation\.status = 'reserved' and target_reservation\.expires_at <= database_now[\s\S]*set status = 'expired'\s+where id = p_reservation_id\s+returning \* into target_reservation/)
  assert.doesNotMatch(finalizeFunction, /where status = 'reserved' and expires_at <= database_now/)

  assert.match(cancelFunction, /where id = p_reservation_id\s+for update/)
  assert.match(cancelFunction, /target_reservation\.status = 'reserved' and target_reservation\.expires_at <= database_now[\s\S]*set status = 'expired'\s+where id = p_reservation_id;\s+return jsonb_build_object\('kind', 'state_conflict'\)/)
  assert.doesNotMatch(cancelFunction, /where status = 'reserved' and expires_at <= database_now/)
})

test('replacement lifecycle signatures and service-role grants remain exact', () => {
  assert.match(sql, /revoke all on function public\.reserve_ai_path_realtime_admission\(\s*text, text, text, date, timestamptz, timestamptz, integer, integer, integer, integer, integer, integer, integer\s*\) from public, anon, authenticated;/)
  assert.match(sql, /grant execute on function public\.reserve_ai_path_realtime_admission\(\s*text, text, text, date, timestamptz, timestamptz, integer, integer, integer, integer, integer, integer, integer\s*\) to service_role;/)
  assert.match(sql, /revoke all on function public\.finalize_ai_path_realtime_admission\(\s*uuid, text, text, integer, timestamptz, integer, integer\s*\) from public, anon, authenticated;/)
  assert.match(sql, /grant execute on function public\.finalize_ai_path_realtime_admission\(\s*uuid, text, text, integer, timestamptz, integer, integer\s*\) to service_role;/)
  assert.match(sql, /revoke all on function public\.cancel_ai_path_realtime_admission\(\s*uuid, text, text, timestamptz\s*\) from public, anon, authenticated;/)
  assert.match(sql, /grant execute on function public\.cancel_ai_path_realtime_admission\(\s*uuid, text, text, timestamptz\s*\) to service_role;/)
})

test('admission maintenance is bounded, ordered, and serialized with lifecycle RPCs', () => {
  assert.match(sql, /function public\.maintain_ai_path_realtime_admission\(\s*p_expire_limit integer,\s*p_purge_limit integer\s*\)/)
  assert.match(sql, /p_expire_limit is null or p_expire_limit not between 1 and 1000/)
  assert.match(sql, /p_purge_limit is null or p_purge_limit not between 1 and 1000/)
  assert.equal((sql.match(/pg_advisory_xact_lock\(17291, 20260717\)/g) ?? []).length, 4)
  assert.match(sql, /order by expires_at, id\s+for update skip locked\s+limit p_expire_limit/)
  assert.match(sql, /order by terminal_at, id\s+for update skip locked\s+limit p_purge_limit/)
  assert.match(sql, /status = 'reserved' and expires_at <= database_now\s+\) into more_to_expire/)
  assert.match(sql, /into more_to_purge/)
  assert.match(sql, /set_config\('lock_timeout', '5s', true\)/)
  assert.match(sql, /set_config\('statement_timeout', '15s', true\)/)
})

test('purge uses a fixed 90-day cutoff and cannot delete active or current-day rows', () => {
  assert.match(sql, /retention_cutoff := database_now - interval '90 days'/)
  assert.match(sql, /utc_day < \(database_now at time zone 'UTC'\)::date/)
  const purgeBatch = sql.slice(sql.indexOf('with purge_batch'), sql.indexOf('), deleted as'))
  assert.doesNotMatch(purgeBatch, /status = 'reserved'/)
  assert.match(purgeBatch, /status = 'expired' and expires_at <= retention_cutoff/)
  assert.match(purgeBatch, /status = 'finalized' and finalized_at <= retention_cutoff/)
  assert.match(purgeBatch, /status = 'cancelled' and cancelled_at <= retention_cutoff/)
  assert.doesNotMatch(sql, /p_cutoff|p_retention_days/)
})

test('detail deletion atomically archives content-free accounting totals', () => {
  assert.match(sql, /create table public\.ai_path_realtime_admission_daily_archive/)
  assert.match(sql, /check \(reservation_status <> 'reserved'\)/)
  assert.match(sql, /delete from public\.ai_path_realtime_admission_reservations[\s\S]*returning reservation\.utc_day, reservation\.status,[\s\S]*reservation\.estimated_cents, reservation\.actual_cents/)
  assert.match(sql, /insert into public\.ai_path_realtime_admission_daily_archive[\s\S]*on conflict \(utc_day, reservation_status\) do update/)
  const archiveTable = sql.slice(
    sql.indexOf('create table public.ai_path_realtime_admission_daily_archive'),
    sql.indexOf('comment on table public.ai_path_realtime_admission_daily_archive'),
  )
  assert.doesNotMatch(archiveTable, /user_key|session_key|idempotency|reservation_id|prompt|transcript|provider/i)
})

test('maintenance surfaces are service-only and return content-free counts', () => {
  assert.equal((sql.match(/security definer/g) ?? []).length, 4)
  assert.equal((sql.match(/set search_path = ''/g) ?? []).length, 4)
  assert.equal((sql.match(/caller_role <> 'service_role'/g) ?? []).length, 4)
  assert.match(sql, /revoke all on public\.ai_path_realtime_admission_daily_archive\s+from public, anon, authenticated, service_role/)
  assert.match(sql, /revoke all on function public\.maintain_ai_path_realtime_admission\(integer, integer\)\s+from public, anon, authenticated/)
  assert.match(sql, /grant execute on function public\.maintain_ai_path_realtime_admission\(integer, integer\)\s+to service_role/)
  const response = sql.slice(sql.lastIndexOf("return jsonb_build_object("))
  assert.match(response, /'policyVersion'/)
  assert.match(response, /'retentionCutoff'/)
  assert.match(response, /'transitionedExpiredCount'/)
  assert.match(response, /'purgedTotal'/)
  assert.match(response, /'purgedByStatus'/)
  assert.match(response, /'hasMoreToExpire', more_to_expire/)
  assert.match(response, /'hasMoreToPurge', more_to_purge/)
  assert.match(response, /'hasMore', more_to_expire or more_to_purge/)
  assert.doesNotMatch(response, /userKey|sessionKey|idempotencyKey|reservationId|prompt|transcript/)
})

test('lifecycle migration cannot invoke or activate a paid surface', () => {
  assert.doesNotMatch(sql, /api\.openai\.com|OPENAI_API_KEY|http_post|net\.http|pg_net/i)
  assert.doesNotMatch(sql, /AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH\s*=\s*true/)
})

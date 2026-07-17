import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL(
  '../../supabase/migrations/20260717040000_ai_path_realtime_admission.sql',
  import.meta.url,
)
const sql = await readFile(migrationUrl, 'utf8')

test('Realtime admission storage contains only bounded opaque identifiers and integer accounting', () => {
  assert.match(sql, /user_key text not null check \(user_key ~ '\^\[0-9a-f\]\{64\}\$'\)/)
  assert.match(sql, /session_key text not null check \(session_key ~ '\^\[0-9a-f\]\{64\}\$'\)/)
  assert.match(sql, /idempotency_key_hash text not null check \(idempotency_key_hash ~ '\^\[0-9a-f\]\{64\}\$'\)/)
  assert.match(sql, /estimated_cents integer not null check \(estimated_cents between 1 and 100000000\)/)
  assert.match(sql, /actual_cents integer check \(actual_cents between 0 and 100000000\)/)
  const table = sql.slice(
    sql.indexOf('create table public.ai_path_realtime_admission_reservations'),
    sql.indexOf("comment on table public.ai_path_realtime_admission_reservations"),
  )
  assert.doesNotMatch(table, /owner_id|user_id|assessment_session_id|email|ip_address|sdp|audio|transcript|prompt/i)
})

test('the ledger has no client table surface and RPC execution is service-only', () => {
  assert.match(sql, /alter table public\.ai_path_realtime_admission_reservations enable row level security;/)
  assert.match(sql, /alter table public\.ai_path_realtime_admission_reservations force row level security;/)
  assert.match(sql, /revoke all on public\.ai_path_realtime_admission_reservations\s+from public, anon, authenticated, service_role;/)
  assert.doesNotMatch(sql, /create policy[\s\S]*ai_path_realtime_admission_reservations/i)
  assert.doesNotMatch(sql, /grant (?:select|insert|update|delete|all)[^;]*ai_path_realtime_admission_reservations/i)

  for (const rpc of [
    'reserve_ai_path_realtime_admission',
    'finalize_ai_path_realtime_admission',
    'cancel_ai_path_realtime_admission',
  ]) {
    const start = sql.indexOf(`create or replace function public.${rpc}`)
    assert.notEqual(start, -1)
    const body = sql.slice(start, sql.indexOf('\n$$;', start) + 4)
    assert.match(body, /security definer/)
    assert.match(body, /set search_path = ''/)
    assert.match(body, /caller_role <> 'service_role'/)
    assert.match(sql, new RegExp(`grant execute on function public\\.${rpc}\\([\\s\\S]*?\\) to service_role;`))
    assert.doesNotMatch(sql, new RegExp(`grant execute on function public\\.${rpc}\\([\\s\\S]*?\\) to (?:anon|authenticated);`))
  }
})

test('reserve serializes the empty-row case before concurrency and UTC budget decisions', () => {
  assert.equal(sql.match(/pg_catalog\.pg_advisory_xact_lock\(17291, 20260717\)/g)?.length, 3)
  assert.equal(sql.match(/where status = 'reserved' and expires_at <= database_now/g)?.length, 3)
  assert.equal(sql.match(/abs\(extract\(epoch from \(database_now - p_now\)\)\) > 30/g)?.length, 3)
  assert.match(sql, /p_utc_day <> \(p_now at time zone 'UTC'\)::date/)
  assert.match(sql, /p_utc_day <> \(database_now at time zone 'UTC'\)::date/)
  assert.match(sql, /p_expires_at <> p_now \+ \(p_reservation_ttl_ms \* interval '1 millisecond'\)/)
  assert.match(sql, /p_utc_day,[\s\S]*p_estimated_cents,[\s\S]*p_now,[\s\S]*p_expires_at/)
  assert.match(sql, /status = 'finalized', actual_cents = p_actual_cents, finalized_at = p_now/)
  assert.match(sql, /status = 'cancelled', cancelled_at = p_now/)
  assert.match(sql, /select count\(\*\) into active_global[\s\S]*where status = 'reserved'/)
  assert.match(sql, /select count\(\*\) into active_user[\s\S]*status = 'reserved' and user_key = p_user_key/)
  assert.match(sql, /when status = 'reserved' then estimated_cents[\s\S]*when status = 'finalized' then actual_cents/)
  assert.match(sql, /spent_user \+ p_estimated_cents > p_max_user_daily_cents/)
  assert.match(sql, /spent_global \+ p_estimated_cents > p_max_global_daily_cents/)
})

test('idempotency, one-session leases, and terminal transitions are database constrained', () => {
  assert.match(sql, /unique \(user_key, idempotency_key_hash\)/)
  assert.match(sql, /idempotency_hash := encode\([\s\S]*extensions\.digest\([\s\S]*'sha256'\)/)
  assert.match(sql, /existing_reservation, p_idempotency_key/)
  assert.equal(sql.match(/target_reservation\.idempotency_key_hash/g)?.length, 2)
  assert.doesNotMatch(sql, /ai_path_realtime_reservation_json\([^)]*,\s*''\s*\)/)
  assert.match(sql, /create unique index ai_path_realtime_one_reserved_session_idx[\s\S]*where status = 'reserved'/)
  assert.match(sql, /'reason', 'idempotency_conflict'/)
  assert.match(sql, /'reason', 'idempotency_terminal'/)
  assert.match(sql, /'reason', 'session_already_reserved'/)
  assert.match(sql, /target_reservation\.status in \('reserved', 'expired'\)/)
  assert.match(sql, /target_reservation\.status = 'cancelled'[\s\S]*replayed := true/)
  assert.match(sql, /target_reservation\.status = 'reserved'[\s\S]*status = 'cancelled'/)
  assert.match(sql, /target_reservation\.actual_cents <> p_actual_cents[\s\S]*'kind', 'state_conflict'/)
})

test('SQL foundation does not activate or invoke any paid provider surface', () => {
  assert.doesNotMatch(sql, /api\.openai\.com|OPENAI_API_KEY|createLiveRealtimeCall|http_post|net\.http|pg_net/i)
  assert.doesNotMatch(sql, /AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH\s*=\s*true/)
})

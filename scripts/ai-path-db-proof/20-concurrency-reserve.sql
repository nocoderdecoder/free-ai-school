\set ON_ERROR_STOP on
set role service_role;
set request.jwt.claim.role = 'service_role';

with proof_clock as (
  select clock_timestamp() as proof_now
), admission as (
  select public.reserve_ai_path_realtime_admission(
    :'user_key',
    :'session_key',
    :'idempotency_key',
    (proof_now at time zone 'UTC')::date,
    proof_now,
    proof_now + interval '5 minutes',
    5,
    1,
    1,
    100,
    1000,
    20,
    300000
  ) as result
  from proof_clock
)
select concat(result ->> 'kind', '|', coalesce(result ->> 'reason', ''))
from admission;

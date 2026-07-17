\set ON_ERROR_STOP on
set role service_role;
set request.jwt.claim.role = 'service_role';

with proof_clock as (
  select clock_timestamp() as proof_now
), admission as (
  select public.reserve_ai_path_realtime_admission(
    :'policy_id',
    :'intent_id'::uuid,
    :'idempotency_key',
    5
  ) as result
  from proof_clock
)
select concat(result ->> 'kind', '|', coalesce(result ->> 'reason', ''))
from admission;

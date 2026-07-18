begin;

set local role service_role;

do $$
declare
  first_result jsonb;
  second_result jsonb;
  denied_result jsonb;
  reset_result jsonb;
  first_time timestamptz := '2026-07-18 12:00:00+00';
begin
  first_result := public.consume_ai_path_rate_limit(
    'ai-path-diagnostic',
    array[repeat('a', 64), repeat('b', 64)],
    2,
    60000,
    first_time
  );
  second_result := public.consume_ai_path_rate_limit(
    'ai-path-diagnostic',
    array[repeat('a', 64), repeat('b', 64)],
    2,
    60000,
    first_time + interval '1 second'
  );
  denied_result := public.consume_ai_path_rate_limit(
    'ai-path-diagnostic',
    array[repeat('a', 64), repeat('b', 64)],
    2,
    60000,
    first_time + interval '2 seconds'
  );
  reset_result := public.consume_ai_path_rate_limit(
    'ai-path-diagnostic',
    array[repeat('a', 64), repeat('b', 64)],
    2,
    60000,
    first_time + interval '61 seconds'
  );

  if first_result #>> '{allowed}' <> 'true'
    or first_result #>> '{remaining}' <> '1'
    or second_result #>> '{allowed}' <> 'true'
    or second_result #>> '{remaining}' <> '0'
    or denied_result #>> '{allowed}' <> 'false'
    or denied_result #>> '{reason}' <> 'exceeded'
    or reset_result #>> '{allowed}' <> 'true'
    or reset_result #>> '{remaining}' <> '1' then
    raise exception 'atomic rate-limit contract failed: %, %, %, %',
      first_result, second_result, denied_result, reset_result;
  end if;
end;
$$;

rollback;

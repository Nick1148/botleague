-- BOTLEAGUE 서버 입력 검증 보강 (제안 — 2026-10-27 점검). ⚠ 아직 운영 DB에 적용되지 않았다.
-- 적용은 사람이 직접: Supabase 대시보드(couple-invest) → SQL Editor 에 붙여넣고 실행,
-- 또는 `supabase db push` / 마이그레이션 이름 'botleague_hardening'.
-- 클라이언트 코드는 이 파일 적용 여부와 무관하게 동작한다 (함수 시그니처·반환형 동일).
--
-- 막는 것: anon 키로 RPC를 직접 호출해 stat_bonus 에 999·문자열을 넣거나, 미러 성향을 범위 밖으로 올리거나,
--          wins/losses 를 음수로 넣는 변조. 랭킹 순위표에 비정상 값이 바로 노출되던 문제.
-- 못 막는 것: tier/points/wins 를 "범위 안에서" 부풀리는 것 — 전투 결과를 서버가 검증하지 않는 구조라서
--          (MVP 신뢰 모델, §14). 근본 해결은 서버가 seed+스냅샷으로 시뮬을 재실행해 결과를 확정하는 것.

create or replace function public.bl_upsert_bot(
  p_device_id text, p_secret uuid, p_name text, p_persona text,
  p_stat_bonus jsonb, p_mirror jsonb, p_tier integer, p_points integer, p_wins integer, p_losses integer)
returns uuid
language plpgsql
security definer
set search_path to 'botleague', 'public'
as $function$
declare v_id uuid; k text;
begin
  if char_length(p_device_id) not between 8 and 64 then raise exception 'bad device'; end if;
  if p_secret is null then raise exception 'bad secret'; end if;
  if jsonb_typeof(p_stat_bonus) <> 'object' or jsonb_typeof(p_mirror) <> 'object' then raise exception 'bad json'; end if;
  foreach k in array array['power','tech','speed','mind'] loop
    if jsonb_typeof(p_stat_bonus->k) is distinct from 'number'
       or (p_stat_bonus->>k)::numeric not between 0 and 40 then raise exception 'bad stat_bonus'; end if;
  end loop;
  foreach k in array array['brave','calm','grit'] loop
    if jsonb_typeof(p_mirror->k) is distinct from 'number'
       or (p_mirror->>k)::numeric not between -15 and 15 then raise exception 'bad mirror'; end if;
  end loop;
  if p_points not between 0 and 100000 or p_wins < 0 or p_losses < 0 then raise exception 'bad record'; end if;
  insert into botleague.bots (device_id, owner_secret, name, persona, stat_bonus, mirror_axes, tier, points, wins, losses)
  values (p_device_id, p_secret, btrim(p_name), btrim(p_persona),
          jsonb_build_object('power', p_stat_bonus->'power', 'tech', p_stat_bonus->'tech', 'speed', p_stat_bonus->'speed', 'mind', p_stat_bonus->'mind'),
          jsonb_build_object('brave', p_mirror->'brave', 'calm', p_mirror->'calm', 'grit', p_mirror->'grit'),
          p_tier, p_points, p_wins, p_losses)
  on conflict (device_id) do update set
    name = excluded.name, persona = excluded.persona,
    stat_bonus = excluded.stat_bonus, mirror_axes = excluded.mirror_axes,
    tier = excluded.tier, points = excluded.points,
    wins = excluded.wins, losses = excluded.losses, updated_at = now()
  where botleague.bots.owner_secret = p_secret
  returning id into v_id;
  if v_id is null then raise exception 'secret mismatch'; end if;
  return v_id;
end $function$;

-- p_limit 이 음수/NULL 이면 LIMIT 오류 → 1..100 으로 고정
create or replace function public.bl_get_ranking(p_limit integer, p_device_id text)
returns jsonb
language sql
security definer
set search_path to 'botleague', 'public'
as $function$
  select jsonb_build_object(
    'top', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from (
        select name, tier, points, wins, losses, is_npc, (device_id = p_device_id) as me
        from botleague.bots
        order by tier desc, points desc, wins desc
        limit greatest(1, least(coalesce(p_limit, 50), 100))
      ) t
    ),
    'my_rank', (
      select rank from (
        select device_id, rank() over (order by tier desc, points desc, wins desc) as rank
        from botleague.bots
      ) r where r.device_id = p_device_id
    )
  );
$function$;

-- 매치 스냅샷 형식 최소 검증 (이름·성격 필수). 클라이언트는 이제 skills·cond 도 함께 보낸다 (4KB 이내).
create or replace function public.bl_insert_match(p_seed bigint, p_snap_a jsonb, p_snap_b jsonb, p_winner integer)
returns uuid
language plpgsql
security definer
set search_path to 'botleague', 'public'
as $function$
declare v_id uuid;
begin
  if pg_column_size(p_snap_a) > 4096 or pg_column_size(p_snap_b) > 4096 then raise exception 'snapshot too large'; end if;
  if jsonb_typeof(p_snap_a->'name') <> 'string' or jsonb_typeof(p_snap_b->'name') <> 'string' then raise exception 'bad snapshot'; end if;
  if p_seed not between 0 and 4294967295 then raise exception 'bad seed'; end if;
  insert into botleague.matches (seed, snap_a, snap_b, winner)
  values (p_seed, p_snap_a, p_snap_b, p_winner) returning id into v_id;
  return v_id;
end $function$;

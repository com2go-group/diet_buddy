-- Digital Twin (Phase 4, decision log 2026-09-28): a cartoon avatar the user styles themselves.
-- Only the look is stored (variant, skin tone, hair); the body shape is drawn from body_metrics.
alter table public.profiles add column avatar jsonb;

alter table public.profiles add constraint profiles_avatar_shape check (
  avatar is null or (
    jsonb_typeof(avatar) = 'object'
    and avatar ?& array['variant', 'skin', 'hair']
    and avatar - 'variant' - 'skin' - 'hair' = '{}'::jsonb
    and avatar ->> 'variant' in ('male', 'female', 'other')
    and jsonb_typeof(avatar -> 'skin') = 'number'
    and (avatar ->> 'skin')::numeric in (0, 1, 2, 3, 4, 5)
    and jsonb_typeof(avatar -> 'hair') = 'number'
    and (avatar ->> 'hair')::numeric in (0, 1, 2, 3, 4, 5)
  )
);

grant update (avatar) on public.profiles to authenticated;

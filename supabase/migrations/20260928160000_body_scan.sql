-- AI body scan (Phase 4, decision log 2026-09-28): body photos are sent to the AI once to
-- estimate tape measurements and are never stored. They need their own explicit consent
-- (special-category data, GDPR Art. 9), separate from the general health-data consent.
alter type public.consent_type add value if not exists 'body_photos';
-- Wellness insights from coach chats (P4.7) need their own optional consent too.
alter type public.consent_type add value if not exists 'coach_insights';

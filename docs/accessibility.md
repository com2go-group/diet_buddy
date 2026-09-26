# Accessibility

Target: WCAG 2.1 AA, accessibility labels on every interactive element, Dynamic Type and 44 pt
touch targets (CLAUDE.md §5).

## Audit (2026-09-28)

The web build was audited with axe-core (rules `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) in
light and dark mode, signed out (welcome, sign-in, legal pages) and signed in as a Premium user
with data (home, meals, log food, coach, progress, profile, privacy, check-in, paywall, twin,
story, wellness, help, notification settings, health apps, body check, grocery, restaurant). A
second check listed interactive elements smaller than 44 × 44.

### Fixed

- **Contrast of secondary text:** light `muted-foreground` `#6B7280` → `#5F6673`. It was 3.9–4.4:1
  on tinted panels (muted, amber and blue tints); now ≥ 4.6:1 on all of them.
- **Contrast of amber text:** light `primary-text` `#B45309` → `#A34A08`. It was 4.0–4.4:1 on
  amber tints; now ≥ 4.7:1.
- **Accent colours used as small text** (macro numbers and labels): all now ≥ 4.5:1. Dark blue
  `#3B82F6` → `#60A5FA`, dark violet `#8B5CF6` → `#A78BFA`, dark red `#EF4444` → `#F87171`,
  light red `#DC2626` → `#B91C1C`. Rings and bars keep the prototype colours.
  `src/theme/__tests__/accents.test.ts` now checks 4.5:1 for every accent and for muted and
  primary text on each tint.
- **Premium badge on the dark AI-scan card:** used the light theme's amber on a dark card
  (2.3:1); now uses light amber.
- **Coach persona picker:** the selected name was accent-on-tint (4.0:1); the name now stays
  full-contrast text and the border and tint show the selection.
- **Switches:** a shared `SwitchRow` makes the whole row the touch target (Privacy & Data,
  notification settings, Weekly Story) and drops an invalid `aria-checked` from the switch
  wrapper; the switch keeps its own state for screen readers.
- **Digital Twin timeline:** items are radios in a radio group (they used `aria-selected` on
  buttons, which isn't valid).
- **Coach quick prompts:** 36 → 44 pt tall. **"Forgot password?":** larger touch area on phones.
- **Legal pages:** the scroll area can be focused and scrolled with the keyboard on the web.

### Known and accepted

- On the web build the switch control itself measures 40 × 20; its row is the 44 pt target.
  Native switches follow platform sizes.
- "Forgot password?" sits in a field label. On phones its touch area is 44 pt; on the web it
  is a text link (WCAG 2.2 allows inline links).

## Still to check on devices before submission

Automated checks cannot cover these. Test on a real iPhone and Android phone:

1. **VoiceOver / TalkBack:** walk the signup → onboarding → plan → log food → paywall flow. Every
   control is announced with its role, name and state, and headers are reachable by rotor.
2. **Largest text size** (iOS Accessibility → Larger Text; Android font size max): text scales
   up to 1.8× (1.3× for large KPI numbers). Check nothing is cut off on Home, Meals, the plan
   and the paywall.
3. **Reduce Motion:** sheets appear without the spring (`Sheet` honours it); confirm no other
   large motion.
4. **Colour-only information:** macros and charts also show numbers and labels.
5. **Dark mode** on both platforms.

Record the result and any fixes here.

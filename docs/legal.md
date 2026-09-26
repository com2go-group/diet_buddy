# Privacy Policy and Terms

The Privacy Policy and Terms of Service live in the app as data:
`src/features/legal/privacy.en.ts` and `src/features/legal/terms.en.ts`. They are shown at
`/legal/privacy` and `/legal/terms`, with account-deletion instructions at `/legal/delete-account`
(Google Play's account deletion URL): public routes that work before sign-in, inside the iOS and
Android apps, and on the web build. Hosting the web build therefore gives the live URLs that
App Store Connect and Google Play ask for.

**These are drafts written from `docs/data-inventory.md`. Have them reviewed by a lawyer before
launch.** Whenever data collection changes, update the data inventory and the policy together
(`src/features/legal/__tests__/legal.test.tsx` checks that every processor is named).

## Before going live

1. **Fill in the legal entity** in `.env` (and the EAS build environment). Until they are set,
   the pages show visible placeholders such as `[company name]`:
   - `EXPO_PUBLIC_LEGAL_COMPANY`: the company name.
   - `EXPO_PUBLIC_LEGAL_ADDRESS`: its registered address.
   - `EXPO_PUBLIC_LEGAL_EMAIL`: the privacy contact email.
   - `EXPO_PUBLIC_LEGAL_COUNTRY`: the country whose law governs the Terms.
2. **Sign data processing agreements** with every processor the policy names: Supabase,
   Anthropic, RevenueCat, Brevo, sms.to and Expo (push). Google AdMob is covered by accepting
   Google's EU controller terms in the AdMob console. The policy says Anthropic works under a
   DPA, so it must be signed before launch.
3. **Lawyer review checklist**:
   - Legal bases (contract, and explicit consent for health data under GDPR Art. 9(2)(a)).
   - The separate optional consents: AI body scan photos, wellness insights from coach chats,
     marketing and analytics.
   - International transfers (Anthropic, RevenueCat and Google outside the EU).
   - Whether an EU representative (Art. 27) or a data protection officer (Art. 37) is needed.
   - Retention (immediate deletion, backups within 30 days).
   - Consumer-law wording in the Terms (subscriptions, liability, governing law) for each launch
     country.
4. **Host the web build** (for example with EAS Hosting: `npx expo export --platform web`, then
   `npx eas deploy --prod`, or any static host that serves the SPA with a fallback to
   `index.html`). The URLs are then `https://<your-domain>/legal/privacy` and
   `https://<your-domain>/legal/terms`.
5. **Point the app at the hosted pages** (optional): set `EXPO_PUBLIC_PRIVACY_URL` and
   `EXPO_PUBLIC_TERMS_URL`. When they are set, the links open the hosted page in the browser;
   when they are not, the same text opens inside the app. Either way the links are always shown
   at sign-up, in the onboarding consent step and in Profile.
6. **Enter the URLs in the stores**: App Store Connect (App Privacy → Privacy Policy URL, and
   the License Agreement if you use custom Terms) and Google Play Console (App content →
   Privacy policy).

When the text changes, bump `updated` in the document. If a change affects what users consented
to, also bump the consent version in the code (`HEALTH_CONSENT_VERSION`,
`OPTIONAL_CONSENT_VERSION`, `BODY_PHOTO_CONSENT_VERSION`) so the new version is recorded.

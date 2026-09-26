# Store submission

What CLAUDE.md §16 lists before store submission, and where each part stands.

| Item                                                 | Where                                                        | Status                         | Still to do                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------------------------------------- |
| Privacy policy and terms URLs                        | `/legal/privacy`, `/legal/terms` in the app; `docs/legal.md` | Drafts in the app              | Fill `EXPO_PUBLIC_LEGAL_*`, lawyer review, sign DPAs, host the web build            |
| Account deletion URL (Google Play)                   | `/legal/delete-account`                                      | Done                           | Host the web build                                                                  |
| App Store privacy label                              | `apple-app-privacy.md`                                       | Answers ready                  | Enter in App Store Connect; re-check AdMob's disclosure                             |
| Google Play Data safety, Health apps, Health Connect | `google-data-safety.md`                                      | Answers ready                  | Enter in Play Console                                                               |
| Age rating                                           | `age-rating.md`                                              | Answers ready (18+)            | Enter in both consoles                                                              |
| Screenshots                                          | `screenshots/`                                               | Web drafts at store sizes      | Final captures on devices with `.maestro/screenshots/`                              |
| Accessibility pass                                   | `docs/accessibility.md`                                      | Automated audit done and fixed | VoiceOver/TalkBack and largest text checks on devices                               |
| E2E tests (signup → plan → log → paywall)            | `.maestro/`, `docs/testing.md`                               | Web journey passes             | Run `npm run e2e` on an iOS simulator and Android emulator with a development build |

Other setup guides (stores, RevenueCat, AdMob, email and SMS, push, health) are in
`docs/setup/`.

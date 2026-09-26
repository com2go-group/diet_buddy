# Age rating

DietBuddy is for adults only: the database refuses accounts under 18 (date of birth at sign-up,
or in onboarding for Apple/Google sign-in), and the Terms and Privacy Policy say so. The store
ratings should match. Weight-management apps aimed at minors also get extra scrutiny, which is
another reason to target 18+.

The questionnaires change from time to time, so the wording below may differ from the console.
Answer each question truthfully from the facts in the right-hand column.

## Apple (App Store Connect → App Information → Age Rating)

| Topic                                                             | Answer             | Why                                                                                                     |
| ----------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| Violence, horror, sexual content, nudity, profanity, crude humour | None               | None in the app                                                                                         |
| Alcohol, tobacco or drug use or references                        | None               | Users can log drinks from the food database; the app neither depicts nor promotes them                  |
| Mature or suggestive themes                                       | None               |                                                                                                         |
| Simulated gambling, contests, loot boxes                          | None               | XP, levels and achievements are progress rewards; nothing is bought or won by chance                    |
| Medical or treatment information                                  | Infrequent/Mild    | General nutrition and fitness guidance with "not medical advice" disclaimers; no diagnosis or treatment |
| Health or wellness topics                                         | Yes                | Nutrition, weight management, sleep and mood check-ins                                                  |
| Unrestricted web access                                           | No                 | Only fixed links (legal pages, store pages)                                                             |
| User-generated content shared with other users                    | No                 | Nothing a user writes is visible to other users                                                         |
| Messaging or chat between users                                   | No                 | The AI coach is not user-to-user chat (mention the AI coach if the form asks about AI chat)             |
| Advertising                                                       | Yes                | Free plan (AdMob), non-personalised on iOS                                                              |
| Parental controls / age assurance                                 | Age assurance: yes | Date of birth checked, 18+ enforced by the database                                                     |

**Resulting rating:** if the calculated rating is lower than **18+**, use the option to set a
higher rating and choose 18+, so the store rating matches the age gate.

## Google Play (Play Console → App content)

### Content rating (IARC questionnaire)

- **Category:** "All other app types" (not a game, not social, not news).
- Violence, fear, sexuality, language, controlled substances, crude humour: **No**.
- Gambling or simulated gambling: **No**.
- Users interact or exchange content with each other: **No**.
- Shares the user's location with other users: **No**.
- Allows purchases of digital goods: **Yes** (Premium subscription).
- Contains ads: **Yes** (free plan).
- If asked about AI-generated content or chatbots: **Yes**. The coach, meal plans and insights
  are AI-generated, with code-level safety rules (CLAUDE.md §9).

### Target audience and content

- **Target age groups:** 18 and over only.
- **Could the app unintentionally appeal to children?** No (plain nutrition-tracking design;
  the cartoon Digital Twin shows the user's own body shape and is not a children's character).
- Not enrolled in the Designed for Families program.

### Other declarations

See `google-data-safety.md` for Data safety, Health apps, Health Connect and Ads.

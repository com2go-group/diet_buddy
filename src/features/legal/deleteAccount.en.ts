import type { LegalDoc } from './types';

/** How to delete a DietBuddy account (Google Play's account-deletion URL). */
export const DELETE_ACCOUNT: LegalDoc = {
  title: 'Delete your account',
  updated: '2026-09-28',
  intro: [
    'You can delete your DietBuddy account and all its data yourself at any time, in the app or on the web.',
  ],
  sections: [
    {
      heading: 'In the app or on the web',
      blocks: [
        {
          list: [
            'Open DietBuddy (or sign in to the DietBuddy web app with the same account).',
            'Go to Profile → Privacy & Data.',
            'Under Delete account, tap Delete my account, then type DELETE to confirm.',
          ],
        },
        'Want a copy first? Tap Export my data on the same screen.',
      ],
    },
    {
      heading: 'By email',
      blocks: [
        'If you can’t sign in, email {{email}} from the address or with the phone number linked to your account and ask us to delete it. We will confirm it is your account and delete it within one month.',
      ],
    },
    {
      heading: 'What is deleted',
      blocks: [
        'Everything: your account, profile, goals, preferences, body measurements, food and water logs, check-ins, plans, coach conversations, insights, progress photos, achievements and settings. Deletion is immediate; copies in encrypted backups are gone within 30 days. Nothing is kept afterwards.',
        'A Premium subscription is billed by Apple or Google and is not cancelled by deleting your account. Cancel it in your App Store or Google Play account settings.',
      ],
    },
  ],
};

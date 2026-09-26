import type { LegalDoc } from './types';

/**
 * Privacy Policy (English). Written from docs/data-inventory.md: update both together. A draft
 * for legal review before launch (docs/legal.md).
 */
export const PRIVACY_POLICY: LegalDoc = {
  title: 'Privacy Policy',
  updated: '2026-09-28',
  intro: [
    'This policy explains what personal data DietBuddy collects, why, who it is shared with and the choices and rights you have. DietBuddy is for adults (18+).',
    {
      list: [
        'Your health data is used only to run DietBuddy for you. It is never sold and never used for advertising.',
        'Your data is stored in the EU and only you can see it in the app.',
        'AI features send only the data each feature needs to our AI provider, which does not use it to train its models.',
        'Optional features (AI body scan, wellness insights from coach chats, marketing) each need your separate consent, and you can change your mind at any time.',
        'You can export or delete all your data in Profile → Privacy & Data.',
      ],
    },
  ],
  sections: [
    {
      heading: '1. Who we are',
      blocks: [
        'DietBuddy is provided by {{company}}, {{address}} ("we", "us"). We are the controller of your personal data. Contact us about privacy at {{email}} or through Profile → Help in the app.',
      ],
    },
    {
      heading: '2. What we collect and why',
      blocks: [
        'Account data: your email address or phone number, sign-in identifiers from Apple or Google if you use them, and your date of birth. We use them to create and secure your account and to confirm you are 18 or older. Legal basis: performance of our contract with you (GDPR Art. 6(1)(b)).',
        'Health and fitness data: height, weight, body measurements and body-composition estimates, goals, activity and training level, diet style, restrictions, foods you avoid, allergies, food and water logs, daily check-ins (mood, energy, sleep, hunger, weight), your plan and your progress. We use it to calculate your plan, track your progress and personalise the coach, meal plans and insights. Legal basis: your explicit consent (GDPR Art. 9(2)(a)), which you give in onboarding, and our contract with you.',
        'Progress photos: stored in a private storage area that only you can access, through links that expire after 10 minutes. Location data is removed from photos on your device before upload. Progress photos are never sent to the AI or anyone else.',
        'Coach conversations: the messages you exchange with Aria, Max and Luna are stored so you can continue them.',
        'Your name: used to greet you in the app. It is never sent to the AI.',
        'Purchases: if you subscribe to Premium, Apple or Google processes the payment. We receive your subscription status only, through RevenueCat, never your card details.',
        'Notifications: if you allow them, a push token for your device and your notification settings.',
        'Support requests: what you write to us in Profile → Help, and our replies.',
        'Technical records: how many AI requests you make (to keep costs and limits in check), and, if a coach message shows signs of a crisis or disordered eating, a record of that flag type (not the message) so our staff can review our safety measures.',
      ],
    },
    {
      heading: '3. Optional features and consents',
      blocks: [
        'Each of these needs its own consent, separate from your health-data consent, and each can be switched off in Profile → Privacy & Data:',
        {
          list: [
            'AI body scan (Premium): your front and side photos (neck down) plus your height and sex are sent once to our AI provider to estimate your waist, hip and neck measurements. The photos are never stored and a photo showing a face is refused.',
            'Wellness insights from coach chats (Premium): the messages you wrote to the coach in the last 14 days are sent to our AI provider to find themes such as sleep, stress or energy. Coach replies, your profile and your name are not sent. Only the short insights are stored, never your words, and switching the consent off deletes them. If your messages show signs of a crisis or disordered eating, they are not analysed; we show you where to find professional help instead.',
            'Marketing messages: occasional news about features and offers.',
            'Analytics: anonymous usage statistics (not collected at present).',
          ],
        },
      ],
    },
    {
      heading: '4. AI features',
      blocks: [
        'DietBuddy uses Claude, provided by Anthropic, for its AI features. We send only what each feature needs:',
        {
          list: [
            'Coach: your message, the recent conversation and a short summary of your profile, targets, recent logs and latest check-in. Never your name, email, phone, date of birth or photos.',
            'Meal plans and grocery lists: your targets, diet style, restrictions, allergies and foods to avoid, or the week’s ingredient names and amounts.',
            'AI insights: daily totals and check-in answers for the last 14 days, without food names or free text.',
            'Food photo scan and restaurant mode: the meal or menu photo you take (location data removed), or the dishes you type. These photos are not stored.',
          ],
        },
        'Anthropic processes this data for us under a data processing agreement and does not use it to train its models. Calorie and nutrient numbers come from food databases (USDA FoodData Central and Open Food Facts), not from the AI. We check AI meal plans against your allergies and restrictions in our own code. AI output can be wrong, so always use your own judgement.',
      ],
    },
    {
      heading: '5. Health apps (Apple Health and Health Connect)',
      blocks: [
        'If you connect Apple Health or Health Connect, DietBuddy reads your weight, body fat, steps, active energy and water, and writes the weight from your check-ins and the water you log. Weights are saved to your progress; steps and active energy are only shown. Data from these health apps is never used for advertising, marketing or data mining, and is never sold or given to advertisers or data brokers. You can disconnect at any time in Profile → Health apps and in your device settings.',
      ],
    },
    {
      heading: '6. Advertising (free plan)',
      blocks: [
        'The free plan shows ads from Google AdMob. Before any ad is requested, we ask for your choice about personalised ads (Google’s consent tool). Google may use your device’s advertising identifier and how you interact with ads; if you don’t agree to personalisation, only non-personalised ads are shown. We never pass health data, logs or anything you enter in the app to advertisers. Google acts as an independent controller for personalised advertising: see policies.google.com/privacy. Premium has no ads.',
      ],
    },
    {
      heading: '7. Who we share data with',
      blocks: [
        'We do not sell your personal data. We share it only with service providers who process it for us under contract, or as described above:',
        {
          list: [
            'Supabase: database, sign-in, file storage and server functions (EU region).',
            'Anthropic: AI features (section 4).',
            'RevenueCat, Apple and Google: subscriptions and restore purchases.',
            'Google AdMob: ads on the free plan (section 6).',
            'Expo, Apple and Google: delivering push notifications (device token and message text).',
            'Brevo: sign-in and account emails. sms.to: verification codes by SMS.',
            'USDA FoodData Central and Open Food Facts: the food name you search or the barcode you scan, with nothing about you.',
          ],
        },
        'We may also disclose data if the law requires it, or to protect the rights and safety of our users and others.',
      ],
    },
    {
      heading: '8. International transfers',
      blocks: [
        'Your data is stored in the EU. Some providers (for example Anthropic, RevenueCat and Google) may process data outside the EU/EEA. We rely on the European Commission’s Standard Contractual Clauses or an adequacy decision (such as the EU-US Data Privacy Framework) to protect it.',
      ],
    },
    {
      heading: '9. How long we keep data',
      blocks: [
        'We keep your data while you have an account. When you delete your account in Profile → Privacy & Data, your account, all your data and your photos are deleted straight away; copies in our encrypted backups are gone within 30 days. You can also delete individual entries, progress photos and wellness insights at any time. Photos for the AI body scan, food photo scan and restaurant mode are never stored. Push tokens are removed when you sign out.',
      ],
    },
    {
      heading: '10. Your rights',
      blocks: [
        'Under the GDPR you can:',
        {
          list: [
            'access your data and receive a copy (Profile → Privacy & Data → Export my data);',
            'correct it (in the app, or by contacting us);',
            'delete it (Profile → Privacy & Data → Delete account);',
            'restrict or object to processing, and take your data to another service;',
            'withdraw any consent at any time, without affecting processing before the withdrawal. Withdrawing the health-data consent means deleting your account, because DietBuddy cannot work without it;',
            'complain to your local data protection authority.',
          ],
        },
        'To use a right that isn’t available in the app, contact {{email}}. We reply within one month.',
      ],
    },
    {
      heading: '11. Staff access',
      blocks: [
        'A small number of authorised staff can see basic account details (such as your email or phone, sign-up date, subscription status and support requests) to help you and keep DietBuddy safe. They cannot read your coach messages, food logs or photos in our tools, they sign in with two-factor authentication, and every change they make is logged.',
      ],
    },
    {
      heading: '12. Security',
      blocks: [
        'Data is encrypted in transit and at rest. Database rules ensure each user can only reach their own data, AI keys never leave our servers, and photos are stored privately.',
      ],
    },
    {
      heading: '13. Age limit',
      blocks: [
        'DietBuddy is only for people aged 18 or over. We check your date of birth when you create an account and do not knowingly collect data from anyone younger.',
      ],
    },
    {
      heading: '14. Changes to this policy',
      blocks: [
        'If we change this policy we will update the date above and, for important changes, tell you in the app. When a change needs your consent, we will ask for it again.',
      ],
    },
  ],
};

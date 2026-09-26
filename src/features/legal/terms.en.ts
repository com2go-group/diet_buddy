import type { LegalDoc } from './types';

/** Terms of Service (English). A draft for legal review before launch (docs/legal.md). */
export const TERMS_OF_SERVICE: LegalDoc = {
  title: 'Terms of Service',
  updated: '2026-09-28',
  intro: [
    'These terms are an agreement between you and {{company}}, {{address}} ("we", "us") for using the DietBuddy app. By creating an account you accept them. Please also read our Privacy Policy, which explains how we handle your data.',
  ],
  sections: [
    {
      heading: '1. Who can use DietBuddy',
      blocks: [
        'You must be 18 or older. You are responsible for keeping your sign-in details safe and for everything done with your account.',
      ],
    },
    {
      heading: '2. Not medical advice',
      blocks: [
        'DietBuddy gives general nutrition, fitness and wellbeing information. It is not medical advice, diagnosis or treatment and does not replace a doctor, registered dietitian or other health professional.',
        {
          list: [
            'Talk to a doctor before starting a new diet or exercise programme, especially if you have a medical condition, take medication, or are pregnant or breastfeeding.',
            'DietBuddy is not suitable for people with, or recovering from, an eating disorder. If you are struggling, please contact a health professional or an eating disorder support service.',
            'Calorie targets, body-composition estimates, AI scans and forecasts are estimates. Your results may differ.',
            'In an emergency, call your local emergency number.',
          ],
        },
        'DietBuddy never sets calorie targets below safe minimums and will not help with extreme restriction.',
      ],
    },
    {
      heading: '3. AI features',
      blocks: [
        'The coach, meal plans, insights, scans and other AI features are generated automatically and can be incomplete or wrong. Check anything important, especially ingredients and allergens: always read food labels, even though we check AI meal plans against the allergies you tell us about. Nutrition numbers come from public food databases and may contain errors.',
      ],
    },
    {
      heading: '4. Free plan and Premium',
      blocks: [
        'The free plan is supported by ads. Some features can be unlocked for a day by choosing to watch a rewarded video; rewards are given only after the video is complete.',
        'Premium is an auto-renewing subscription bought through the App Store or Google Play. The price, billing period and any free trial are shown before you buy.',
        {
          list: [
            'Payment is charged to your App Store or Google Play account when you confirm the purchase, or when a free trial ends.',
            'The subscription renews automatically unless you cancel at least 24 hours before the end of the current period.',
            'You manage and cancel it in your App Store or Google Play account settings. Deleting the app or your DietBuddy account does not cancel it.',
            'Refunds are handled by Apple or Google under their policies. This does not affect your statutory rights.',
          ],
        },
        'We may change Premium features or prices. Price changes apply from your next renewal after notice, as the stores require.',
      ],
    },
    {
      heading: '5. Acceptable use',
      blocks: [
        'Do not misuse DietBuddy. In particular, do not try to access other people’s data, interfere with or overload the service, reverse engineer it (except where the law allows), use it to harm yourself or others, or use automated means to collect rewards or XP.',
      ],
    },
    {
      heading: '6. Your content',
      blocks: [
        'You own the data and content you add (logs, photos, messages). You give us permission to store and process it only to provide DietBuddy to you, as described in the Privacy Policy. You can export or delete it at any time.',
      ],
    },
    {
      heading: '7. Other services',
      blocks: [
        'DietBuddy can connect to Apple Health, Health Connect, the app stores and other services. Their own terms apply to them, and we are not responsible for them.',
      ],
    },
    {
      heading: '8. Our rights',
      blocks: [
        'DietBuddy, its design, text, characters and software belong to us or our licensors. We give you a personal, non-transferable licence to use the app for your own, non-commercial purposes.',
      ],
    },
    {
      heading: '9. Changes and ending the service',
      blocks: [
        'We may update DietBuddy and these terms. For important changes we will tell you in the app before they apply. You can stop using DietBuddy and delete your account at any time. We may suspend or close accounts that seriously or repeatedly break these terms, after warning you where possible.',
      ],
    },
    {
      heading: '10. Liability',
      blocks: [
        'We provide DietBuddy with reasonable care and skill. Nothing in these terms limits liability that cannot be limited by law, such as for death or personal injury caused by negligence, fraud, or your rights as a consumer. Otherwise we are not liable for losses that were not foreseeable, or for losses caused by relying on DietBuddy instead of professional advice.',
      ],
    },
    {
      heading: '11. Law and disputes',
      blocks: [
        'These terms are governed by the laws of {{country}}. If you are a consumer, you also keep the protection of the mandatory laws of the country where you live and can bring claims in your local courts. The EU Online Dispute Resolution platform is available at ec.europa.eu/consumers/odr.',
      ],
    },
    {
      heading: '12. App Store terms',
      blocks: [
        'If you downloaded DietBuddy from Apple’s App Store: these terms are between you and us, not Apple. Apple is not responsible for the app or its content, has no obligation to provide maintenance or support, and is not responsible for any claims about the app (including product liability, legal compliance or intellectual property claims). If the app fails to meet any applicable warranty, you may notify Apple, who will refund the purchase price, if any; Apple has no other warranty obligation. Apple and its subsidiaries are third-party beneficiaries of these terms and may enforce them. You confirm that you are not in a country subject to a US Government embargo and are not on any US Government list of prohibited or restricted parties.',
      ],
    },
    {
      heading: '13. Contact',
      blocks: ['Questions about these terms: {{email}}, or Profile → Help in the app.'],
    },
  ],
};

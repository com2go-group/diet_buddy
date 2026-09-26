import { LegalScreen, TERMS_OF_SERVICE } from '@/features/legal';

export default function TermsRoute() {
  return <LegalScreen doc={TERMS_OF_SERVICE} />;
}

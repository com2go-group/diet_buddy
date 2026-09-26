import { Text } from '@/components';
import { t } from '@/i18n';

import { openLegal, type LegalKind } from '../../legal/legal';

function LegalLink({ label, kind }: { label: string; kind: LegalKind }) {
  return (
    <Text
      variant="caption"
      tone="primary"
      className="font-semibold"
      accessibilityRole="link"
      onPress={() => openLegal(kind)}
    >
      {label}
    </Text>
  );
}

/** "By signing up you agree to our Terms of Service and Privacy Policy" with links. */
export function LegalNotice() {
  return (
    <Text variant="caption" tone="muted" className="text-center">
      {t('auth.legalPrefix')}
      <LegalLink label={t('auth.terms')} kind="terms" />
      {t('auth.legalAnd')}
      <LegalLink label={t('auth.privacy')} kind="privacy" />
    </Text>
  );
}

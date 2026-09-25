import { Linking } from 'react-native';

import { Text } from '@/components';
import { t } from '@/i18n';

import { authConfig } from '../config';

function LegalLink({ label, url }: { label: string; url?: string }) {
  if (!url)
    return (
      <Text variant="caption" className="font-semibold">
        {label}
      </Text>
    );
  return (
    <Text
      variant="caption"
      tone="primary"
      className="font-semibold"
      accessibilityRole="link"
      onPress={() => Linking.openURL(url)}
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
      <LegalLink label={t('auth.terms')} url={authConfig.termsUrl} />
      {t('auth.legalAnd')}
      <LegalLink label={t('auth.privacy')} url={authConfig.privacyUrl} />
    </Text>
  );
}

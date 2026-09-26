import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { Button, Callout, Card, Text, TextField } from '@/components';
import { t } from '@/i18n';

import { FormMessage } from '../../auth/components/FormMessage';
import { sendCampaign } from '../api';
import { PageTitle, errorText } from './common';

/** Promotional push + in-app notification, marketing consent only, two taps to send. */
export function CampaignsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);
  const send = useMutation({
    mutationFn: () => sendCampaign(title.trim(), body.trim()),
    onSuccess: () => (setTitle(''), setBody(''), setConfirming(false)),
  });
  const valid = title.trim().length >= 3 && title.trim().length <= 80 && body.length <= 300;
  return (
    <>
      <PageTitle>{t('admin.nav_campaigns')}</PageTitle>
      <Callout emoji="📣" tone="info">
        {t('admin.campaignIntro')}
      </Callout>
      <Card className="gap-3">
        <TextField
          label={t('admin.campaignTitle')}
          value={title}
          maxLength={80}
          onChangeText={(v) => (setTitle(v), setConfirming(false))}
        />
        <TextField
          label={t('admin.campaignBody')}
          value={body}
          maxLength={300}
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          onChangeText={(v) => (setBody(v), setConfirming(false))}
        />
        <FormMessage message={send.isError ? errorText(send.error) : undefined} />
        {send.isSuccess ? (
          <Text accessibilityLiveRegion="polite">
            ✓ {t('admin.campaignSent', { count: send.data })}
          </Text>
        ) : null}
        <Button
          label={confirming ? t('admin.campaignConfirm') : t('admin.campaignSend')}
          variant={confirming ? 'destructive' : 'primary'}
          disabled={!valid}
          loading={send.isPending}
          onPress={() => (confirming ? send.mutate() : setConfirming(true))}
        />
      </Card>
    </>
  );
}

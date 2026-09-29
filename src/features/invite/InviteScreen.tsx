import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, ErrorState, SkeletonCard, Text, TextField } from '@/components';
import { t } from '@/i18n';
import { siteLinks } from '@/lib/site';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { useSessionStore } from '../auth/sessionStore';
import { canRedeem, loadInvite, redeemCode } from './api';

const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

/**
 * Invite friends (decision log 2026-09-30): the user's code to share, how many friends joined,
 * and, in the first 14 days after sign-up, a field for a friend's code. Both get a month of
 * Premium once the new user has logged food on 3 days.
 */
export function InviteScreen() {
  const { colors } = useTheme();
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const [now] = useState(() => new Date());
  const [code, setCode] = useState('');
  const query = useQuery({
    queryKey: ['invite', userId],
    enabled: Boolean(userId),
    queryFn: () => loadInvite(userId!),
  });
  const redeem = useMutation({
    mutationFn: () => redeemCode(code),
    onSuccess: (result) => {
      if (result === 'ok') {
        setCode('');
        return queryClient.invalidateQueries({ queryKey: ['invite'] });
      }
    },
  });
  const share = (myCode: string) =>
    Share.share({ message: t('invite.shareText', { code: myCode, url: siteLinks.home }) }).catch(
      () => undefined,
    );

  const body = () => {
    if (query.isPending) return <SkeletonCard lines={4} />;
    if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} />;
    const data = query.data;
    return (
      <View className="gap-4">
        <Text className="text-[15px] leading-6">{t('invite.intro')}</Text>
        <Card className="items-center gap-3">
          <Text variant="caption" tone="muted">
            {t('invite.yourCode')}
          </Text>
          <Text
            className="font-extrabold text-[32px] tracking-widest"
            accessibilityLabel={t('invite.codeA11y', { code: data.code.split('').join(' ') })}
            selectable
          >
            {data.code}
          </Text>
          <Button label={t('invite.share')} onPress={() => share(data.code)} />
          <Text variant="caption" tone="muted" className="text-center">
            {t('invite.stats', { joined: data.joined, rewarded: data.rewarded })}
          </Text>
        </Card>
        {data.referredStatus ? (
          <Text tone="muted" className="text-[14px]">
            {t(
              data.referredStatus === 'rewarded' ? 'invite.referredDone' : 'invite.referredWaiting',
            )}
          </Text>
        ) : canRedeem(data, now) ? (
          <Card className="gap-3">
            <Text variant="heading" accessibilityRole="header" className="text-base">
              {t('invite.gotCode')}
            </Text>
            <TextField
              label={t('invite.codeLabel')}
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
            />
            <FormMessage
              tone={redeem.data === 'ok' ? 'info' : 'error'}
              message={
                redeem.isError
                  ? t('invite.failed')
                  : redeem.data
                    ? t(`invite.result_${redeem.data}`)
                    : undefined
              }
            />
            <Button
              label={t('invite.apply')}
              variant="outline"
              loading={redeem.isPending}
              disabled={code.trim().length < 8}
              onPress={() => redeem.mutate()}
            />
          </Card>
        ) : null}
        <Text variant="caption" tone="muted">
          {t('invite.terms')}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-5 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('invite.back')}
          onPress={close}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
        </Pressable>
        <Text variant="title" accessibilityRole="header" className="text-[22px]">
          🎁 {t('invite.title')}
        </Text>
      </View>
      <ScrollView contentContainerClassName="px-5 pb-10" keyboardShouldPersistTaps="handled">
        {body()}
      </ScrollView>
    </SafeAreaView>
  );
}

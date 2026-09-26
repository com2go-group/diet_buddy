import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, SkeletonCard, Text, TextField } from '@/components';
import { t, type StringKey } from '@/i18n';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { useSessionStore } from '../auth/sessionStore';
import { loadFaq, loadTickets, sendTicket } from './api';

const BUILT_IN_FAQ = [1, 2, 3, 4, 5] as const;
const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));

/** Help & support: FAQ (from the dashboard, else built in), contact form and the user's requests. */
export function HelpScreen() {
  const { colors } = useTheme();
  const userId = useSessionStore((s) => s.session?.user.id);
  const queryClient = useQueryClient();
  const faq = useQuery({ queryKey: ['faq'], queryFn: loadFaq, staleTime: 10 * 60_000 });
  const tickets = useQuery({
    queryKey: ['tickets', userId],
    enabled: Boolean(userId),
    queryFn: () => loadTickets(userId!),
  });
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [tooShort, setTooShort] = useState(false);
  const send = useMutation({
    mutationFn: () => sendTicket(subject.trim(), message.trim()),
    onSuccess: () => {
      setSubject('');
      setMessage('');
      return queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const entries =
    faq.data && faq.data.length
      ? faq.data
      : BUILT_IN_FAQ.map((n) => ({
          question: t(`profile.faq${n}q` as StringKey),
          answer: t(`profile.faq${n}a` as StringKey),
        }));

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-5 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('help.back')}
          onPress={close}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
        </Pressable>
        <Text variant="heading" accessibilityRole="header">
          {t('help.title')}
        </Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="gap-5 px-5 pb-10"
          keyboardShouldPersistTaps="handled"
        >
          <Card className="gap-3">
            <Text variant="label" accessibilityRole="header" className="font-bold">
              {t('help.faq')}
            </Text>
            {faq.isPending ? (
              <SkeletonCard lines={3} />
            ) : (
              entries.map((e) => (
                <View key={e.question} className="gap-1">
                  <Text className="font-semibold">{e.question}</Text>
                  <Text tone="muted" className="text-[14px] leading-5">
                    {e.answer}
                  </Text>
                </View>
              ))
            )}
          </Card>

          <Card className="gap-3">
            <Text variant="label" accessibilityRole="header" className="font-bold">
              {t('help.contactTitle')}
            </Text>
            <Text tone="muted" className="text-[14px]">
              {t('help.contactIntro')}
            </Text>
            <TextField
              label={t('help.subject')}
              value={subject}
              maxLength={120}
              onChangeText={setSubject}
            />
            <TextField
              label={t('help.message')}
              value={message}
              maxLength={4000}
              multiline
              onChangeText={setMessage}
              style={{ minHeight: 110, textAlignVertical: 'top' }}
            />
            <FormMessage
              message={
                tooShort ? t('help.tooShort') : send.isError ? t('help.sendFailed') : undefined
              }
            />
            {send.isSuccess ? (
              <Text accessibilityLiveRegion="polite">✓ {t('help.sent')}</Text>
            ) : null}
            <Button
              label={t('help.send')}
              loading={send.isPending}
              onPress={() => {
                const ok = subject.trim().length >= 3 && message.trim().length >= 1;
                setTooShort(!ok);
                if (ok) send.mutate();
              }}
            />
          </Card>

          {tickets.data?.length ? (
            <Card className="gap-3">
              <Text variant="label" accessibilityRole="header" className="font-bold">
                {t('help.myTickets')}
              </Text>
              {tickets.data.map((tk) => (
                <View key={tk.id} className="gap-1 border-b border-border pb-3">
                  <Text className="font-semibold">{tk.subject}</Text>
                  <Text variant="caption" tone="muted">
                    {t(`help.status_${tk.status}` as StringKey)}
                  </Text>
                  {tk.reply ? (
                    <Text className="text-[14px]">{t('help.reply', { reply: tk.reply })}</Text>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : tickets.isError ? (
            <FormMessage message={t('help.loadFailed')} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

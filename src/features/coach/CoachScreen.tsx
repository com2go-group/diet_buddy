import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ErrorState, GradientFill, SkeletonCard, Text } from '@/components';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../auth/components/FormMessage';
import { NotificationBell } from '../notifications';
import { CoachError, type Persona } from './api';
import { MessageBubble } from './components/MessageBubble';
import { PERSONAS, PersonaPicker } from './components/PersonaPicker';
import { TypingIndicator } from './components/TypingIndicator';
import { useCoach } from './useCoach';

const QUICK_PROMPTS = ['coach.q1', 'coach.q2', 'coach.q3', 'coach.q4', 'coach.q5'] as const;

/** AI coach chat (CLAUDE.md §7.7): Aria, Max and Luna, with server-side limits and safety. */
export function CoachScreen() {
  const { colors } = useTheme();
  const [persona, setPersona] = useState<Persona>('aria');
  const [text, setText] = useState('');
  const scroll = useRef<ScrollView>(null);
  const { query, send, startFresh } = useCoach(persona);
  const meta = PERSONAS.find((p) => p.id === persona)!;
  const name = t(`coach.${persona}`);

  const thread = query.data;
  const blocked = Boolean(thread && !thread.premium && thread.usedToday >= thread.limit);
  const canSend = !send.isPending && !blocked && text.trim().length > 0;

  useEffect(() => {
    const timer = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [thread?.messages.length, send.isPending, persona]);

  const submit = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || send.isPending || blocked) return;
    send.mutate(trimmed, { onSuccess: () => setText('') });
  };

  const errorCode =
    send.error instanceof CoachError ? send.error.code : send.error ? 'failed' : null;

  const body = () => {
    if (query.isPending) return <SkeletonCard lines={4} />;
    if (query.isError || !thread) {
      return <ErrorState message={t('coach.loadFailed')} onRetry={() => query.refetch()} />;
    }
    return (
      <>
        <Text variant="caption" tone="muted" className="mb-3 text-center">
          {t('coach.disclaimer')}
        </Text>
        <MessageBubble
          role="assistant"
          content={t(`coach.${persona}_intro`)}
          avatar={meta.emoji}
          speaker={name}
        />
        {thread.messages.map((m) => (
          <MessageBubble
            key={m.id}
            role={m.role}
            content={m.content}
            avatar={meta.emoji}
            speaker={m.role === 'user' ? t('coach.you') : name}
          />
        ))}
        {send.isPending && send.variables ? (
          <>
            <MessageBubble
              role="user"
              content={send.variables}
              avatar=""
              speaker={t('coach.you')}
            />
            <TypingIndicator avatar={meta.emoji} label={t('coach.typing', { name })} />
          </>
        ) : null}
      </>
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="gap-3 px-5 pb-3 pt-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center overflow-hidden rounded-2xl">
              <GradientFill id="coachAvatar" />
              <Feather name="zap" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text variant="heading" accessibilityRole="header">
                {t('coach.title')}
              </Text>
              <Text variant="caption" tone="muted">
                {name} · {t(`coach.${persona}_role`)}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('coach.newChat')}
              onPress={startFresh}
              style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
              className="items-center justify-center rounded-full border border-border bg-card active:opacity-70"
            >
              <Feather name="refresh-cw" size={17} color={colors.foreground} />
            </Pressable>
            <NotificationBell />
          </View>
        </View>
        <PersonaPicker
          value={persona}
          onChange={(p) => {
            send.reset();
            setPersona(p);
          }}
        />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerClassName="px-5 pb-3"
          keyboardShouldPersistTaps="handled"
        >
          {body()}
        </ScrollView>
        <View className="gap-2 px-5 pb-3 pt-1">
          {errorCode ? <FormMessage message={t(`coach.error_${errorCode}`)} /> : null}
          {thread && !thread.premium ? (
            <Text
              variant="caption"
              tone="muted"
              className="text-center"
              accessibilityLiveRegion="polite"
            >
              {blocked
                ? `${t('coach.remainingNone', { limit: thread.limit })} ${t('coach.premiumNote')}`
                : t('coach.remaining', {
                    count: Math.max(0, thread.limit - thread.usedToday),
                    limit: thread.limit,
                  })}
            </Text>
          ) : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {QUICK_PROMPTS.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                aria-disabled={blocked || send.isPending}
                disabled={blocked || send.isPending}
                onPress={() => submit(t(key))}
                style={{ minHeight: 36 }}
                className="justify-center rounded-full border border-primary/25 bg-primary/10 px-3 active:opacity-70"
              >
                <Text variant="caption" tone="primary" className="font-semibold text-[13px]">
                  {t(key)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View className="flex-row items-end gap-2 rounded-2xl border-[1.5px] border-border bg-card py-1 pl-4 pr-1">
            <TextInput
              accessibilityLabel={t('coach.inputLabel', { name })}
              placeholder={t('coach.placeholder', { name })}
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
              editable={!blocked}
              onSubmitEditing={() => submit(text)}
              onKeyPress={(e) => {
                // Web: Enter sends, Shift+Enter adds a line (native keyboards have their own key).
                const key = e.nativeEvent as { key: string; shiftKey?: boolean };
                if (Platform.OS === 'web' && key.key === 'Enter' && !key.shiftKey) {
                  e.preventDefault();
                  submit(text);
                }
              }}
              style={{
                flex: 1,
                minHeight: MIN_TOUCH_TARGET,
                maxHeight: 120,
                paddingVertical: 12,
                color: colors.foreground,
                fontFamily: 'Inter_400Regular',
                fontSize: 15,
                ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('coach.send')}
              aria-disabled={!canSend}
              disabled={!canSend}
              onPress={() => submit(text)}
              style={{
                width: MIN_TOUCH_TARGET,
                height: MIN_TOUCH_TARGET,
                opacity: canSend ? 1 : 0.4,
              }}
              className="items-center justify-center overflow-hidden rounded-xl"
            >
              <GradientFill id="send" />
              <Feather name="send" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

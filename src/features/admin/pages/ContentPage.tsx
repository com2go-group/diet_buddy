import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, Text, TextField } from '@/components';
import { t } from '@/i18n';

import { FormMessage } from '../../auth/components/FormMessage';
import {
  deleteFaq,
  listAchievements,
  listFaq,
  saveFaq,
  updateAchievement,
  type FaqRow,
} from '../api';
import { PageTitle, QueryState, errorText } from './common';

type Achievement = Awaited<ReturnType<typeof listAchievements>>[number];

function AchievementEditor({ a }: { a: Achievement }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: a.title,
    description: a.description,
    emoji: a.emoji ?? '',
    xp: String(a.xp_reward),
  });
  const save = useMutation({
    mutationFn: () => updateAchievement({ code: a.code, ...form, xp: Number(form.xp) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'achievements'] }),
  });
  return (
    <View className="gap-2 border-b border-border pb-4">
      <Text variant="caption" tone="muted">
        {a.code}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <View className="w-20">
          <TextField
            label="Emoji"
            value={form.emoji}
            onChangeText={(emoji) => setForm({ ...form, emoji })}
          />
        </View>
        <View className="min-w-48 flex-1">
          <TextField
            label="Title"
            value={form.title}
            onChangeText={(title) => setForm({ ...form, title })}
          />
        </View>
        <View className="w-24">
          <TextField
            label="XP"
            value={form.xp}
            keyboardType="number-pad"
            onChangeText={(xp) => setForm({ ...form, xp })}
          />
        </View>
      </View>
      <TextField
        label="Description"
        value={form.description}
        onChangeText={(description) => setForm({ ...form, description })}
      />
      <View className="flex-row items-center gap-3">
        <Button
          label={t('admin.save')}
          size="md"
          variant="outline"
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
        {save.isSuccess ? <Text>✓ {t('admin.saved')}</Text> : null}
      </View>
      <FormMessage message={save.isError ? errorText(save.error) : undefined} />
    </View>
  );
}

const blank = { id: null as string | null, question: '', answer: '', sort: '0', published: true };

function FaqEditor({ entry }: { entry: FaqRow | null }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(entry ? { ...entry, sort: String(entry.sort) } : blank);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'faq'] });
  const save = useMutation({
    mutationFn: () => saveFaq({ ...form, id: entry?.id ?? null, sort: Number(form.sort) || 0 }),
    onSuccess: () => {
      if (!entry) setForm(blank);
      return refresh();
    },
  });
  const remove = useMutation({ mutationFn: () => deleteFaq(entry!.id), onSuccess: refresh });
  return (
    <View className="gap-2 border-b border-border pb-4">
      <TextField
        label={t('admin.faqQuestion')}
        value={form.question}
        onChangeText={(question) => setForm({ ...form, question })}
      />
      <TextField
        label={t('admin.faqAnswer')}
        value={form.answer}
        onChangeText={(answer) => setForm({ ...form, answer })}
        multiline
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />
      <View className="flex-row flex-wrap items-end gap-2">
        <View className="w-24">
          <TextField
            label={t('admin.faqSort')}
            value={form.sort}
            keyboardType="number-pad"
            onChangeText={(sort) => setForm({ ...form, sort })}
          />
        </View>
        <Chip
          label={form.published ? t('admin.faqPublished') : t('admin.faqHidden')}
          selected={form.published}
          onPress={() => setForm({ ...form, published: !form.published })}
        />
        <Button
          label={entry ? t('admin.save') : t('admin.faqNew')}
          size="md"
          variant="outline"
          disabled={form.question.trim().length < 3 || !form.answer.trim()}
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
        {entry ? (
          <Button
            label={t('admin.faqDelete')}
            size="md"
            variant="ghost"
            loading={remove.isPending}
            onPress={() => remove.mutate()}
          />
        ) : null}
      </View>
      <FormMessage
        message={
          save.isError
            ? errorText(save.error)
            : remove.isError
              ? errorText(remove.error)
              : undefined
        }
      />
    </View>
  );
}

export function ContentPage() {
  const achievements = useQuery({ queryKey: ['admin', 'achievements'], queryFn: listAchievements });
  const faq = useQuery({ queryKey: ['admin', 'faq'], queryFn: listFaq });
  return (
    <>
      <PageTitle>{t('admin.nav_content')}</PageTitle>
      <Card className="gap-4">
        <Text variant="heading" accessibilityRole="header" className="text-base">
          {t('admin.faqTitle')}
        </Text>
        <QueryState query={faq}>
          {(rows) => (
            <>
              {rows.map((f) => (
                <FaqEditor key={`${f.id}:${f.updated_at}`} entry={f} />
              ))}
              <FaqEditor entry={null} />
            </>
          )}
        </QueryState>
      </Card>
      <Card className="gap-4">
        <Text variant="heading" accessibilityRole="header" className="text-base">
          {t('admin.achievementsTitle')}
        </Text>
        <QueryState query={achievements}>
          {(rows) => rows.map((a) => <AchievementEditor key={a.code} a={a} />)}
        </QueryState>
      </Card>
    </>
  );
}

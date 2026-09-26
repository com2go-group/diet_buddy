import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Chip, Text, TextField } from '@/components';
import { t, type StringKey } from '@/i18n';
import type { Json } from '@/lib/supabase';

import { FormMessage } from '../../auth/components/FormMessage';
import { AdminError, listConfig, setConfig } from '../api';
import { PageTitle, QueryState, errorText } from './common';

type Kind = 'int' | 'budget' | 'text' | 'json';
const FIELDS: [string, Kind][] = [
  ['coach_daily_message_limit_free', 'int'],
  ['food_photo_daily_limit_free', 'int'],
  ['ai_monthly_budget_usd', 'budget'],
  ['sms_provider', 'text'],
  ['sms_sender_id', 'text'],
  ['min_app_version', 'text'],
  ['ai_prices', 'json'],
];

const toText = (v: Json | undefined, kind: Kind) =>
  v === undefined || v === null
    ? ''
    : kind === 'json'
      ? JSON.stringify(v, null, 2)
      : typeof v === 'string'
        ? v
        : String(v);

/** Text → the JSON value for the key; the database validates it again. */
function parse(text: string, kind: Kind): Json {
  const s = text.trim();
  if (kind === 'budget') return s === '' ? null : Number(s);
  if (kind === 'int') return Number(s);
  if (kind === 'json') {
    try {
      return JSON.parse(s) as Json;
    } catch {
      throw new AdminError('invalid JSON');
    }
  }
  return s;
}

function Field({ name, kind, value }: { name: string; kind: Kind; value: Json | undefined }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(toText(value, kind));
  const save = useMutation({
    mutationFn: () => setConfig(name, parse(text, kind)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });
  return (
    <View className="gap-2">
      <TextField
        label={t(`admin.setting_${name}` as StringKey)}
        value={text}
        onChangeText={(v) => (setText(v), save.reset())}
        keyboardType={kind === 'int' || kind === 'budget' ? 'decimal-pad' : 'default'}
        autoCapitalize="none"
        multiline={kind === 'json'}
        style={kind === 'json' ? { minHeight: 120, fontFamily: 'monospace' } : undefined}
      />
      <View className="flex-row items-center gap-3">
        <Button
          label={t('admin.save')}
          size="md"
          variant="outline"
          loading={save.isPending}
          onPress={() => save.mutate()}
        />
        {save.isSuccess ? <Text accessibilityLiveRegion="polite">✓ {t('admin.saved')}</Text> : null}
      </View>
      <FormMessage message={save.isError ? errorText(save.error) : undefined} />
    </View>
  );
}

function Features({ values }: { values: [string, boolean][] }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const set = useMutation({
    mutationFn: ({ key, on }: { key: string; on: boolean }) => setConfig(key, on),
    onSuccess: () => (setName(''), queryClient.invalidateQueries({ queryKey: ['admin'] })),
  });
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z_]+/g, '_');
  return (
    <Card className="gap-3">
      <Text variant="heading" accessibilityRole="header" className="text-base">
        {t('admin.featuresTitle')}
      </Text>
      {values.map(([key, on]) => (
        <View key={key} className="flex-row flex-wrap items-center justify-between gap-2">
          <Text className="font-semibold">{key.replace(/^feature_/, '')}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={key} className="flex-row gap-2">
            <Chip
              label={t('admin.on')}
              selected={on}
              selectionRole="radio"
              onPress={() => set.mutate({ key, on: true })}
            />
            <Chip
              label={t('admin.off')}
              selected={!on}
              selectionRole="radio"
              onPress={() => set.mutate({ key, on: false })}
            />
          </View>
        </View>
      ))}
      <View className="flex-row flex-wrap items-end gap-2">
        <View className="min-w-48 flex-1">
          <TextField
            label={t('admin.featureAdd')}
            value={name}
            onChangeText={setName}
            autoCapitalize="none"
          />
        </View>
        <Button
          label={t('admin.featureAddButton')}
          size="md"
          variant="outline"
          disabled={slug.length < 2}
          onPress={() => set.mutate({ key: `feature_${slug}`, on: true })}
        />
      </View>
      <FormMessage message={set.isError ? errorText(set.error) : undefined} />
    </Card>
  );
}

export function SettingsPage() {
  const config = useQuery({ queryKey: ['admin', 'config'], queryFn: listConfig });
  return (
    <>
      <PageTitle>{t('admin.nav_settings')}</PageTitle>
      <Text tone="muted">{t('admin.settingsIntro')}</Text>
      <QueryState query={config}>
        {(rows) => {
          const byKey = new Map(rows.map((r) => [r.key, r.value]));
          return (
            <>
              <Card className="gap-5">
                {FIELDS.map(([key, kind]) => (
                  <Field
                    key={`${key}:${JSON.stringify(byKey.get(key))}`}
                    name={key}
                    kind={kind}
                    value={byKey.get(key)}
                  />
                ))}
              </Card>
              <Features
                values={rows
                  .filter((r) => r.key.startsWith('feature_'))
                  .map((r) => [r.key, r.value === true] as [string, boolean])}
              />
            </>
          );
        }}
      </QueryState>
    </>
  );
}

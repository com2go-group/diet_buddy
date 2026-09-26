import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { t } from '@/i18n';
import { formatLongDate, formatWeight } from '@/lib/format';
import type { UnitSystem } from '@/lib/nutrition';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../../auth/components/FormMessage';
import type { ProgressPhoto } from './api';

/** Full-screen view of one photo, with a two-tap delete. */
export function PhotoViewer({
  photo,
  weightKg,
  units,
  deleting,
  deleteFailed,
  onDelete,
  onClose,
}: {
  photo: ProgressPhoto;
  weightKg: number | null;
  units: UnitSystem;
  deleting: boolean;
  deleteFailed: boolean;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const date = formatLongDate(new Date(photo.takenAt));
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-5 py-3">
          <View className="flex-1">
            <Text variant="heading" accessibilityRole="header">
              {date}
            </Text>
            {weightKg !== null ? (
              <Text variant="caption" tone="muted">
                {t('progress.photoWeight', { weight: formatWeight(weightKg, units) })}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('progress.photoClose')}
            onPress={onClose}
            style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
            className="items-center justify-center rounded-full bg-muted active:opacity-70"
          >
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <View className="flex-1 px-5">
          {photo.url ? (
            <Image
              source={{ uri: photo.url }}
              accessibilityLabel={t('progress.photoLabel', { date })}
              resizeMode="contain"
              style={{ flex: 1, borderRadius: 16 }}
            />
          ) : (
            <View className="flex-1 items-center justify-center rounded-2xl bg-muted">
              <Text tone="muted">{t('progress.photoUnavailable')}</Text>
            </View>
          )}
        </View>
        <View className="gap-2 px-5 pt-4">
          <FormMessage message={deleteFailed ? t('progress.photoDeleteFailed') : undefined} />
          <Button
            label={confirming ? t('progress.photoDeleteConfirm') : t('progress.photoDelete')}
            variant={confirming ? 'destructive' : 'outline'}
            loading={deleting}
            onPress={() => (confirming ? onDelete() : setConfirming(true))}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components';
import { t } from '@/i18n';
import { parseDayKey } from '@/lib/dates';
import { formatLongDate } from '@/lib/format';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { fillBlock } from './legal';
import type { LegalBlock, LegalDoc } from './types';

const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

function Block({ block }: { block: LegalBlock }) {
  const filled = fillBlock(block);
  if (typeof filled === 'string') {
    return <Text className="text-[15px] leading-6">{filled}</Text>;
  }
  return (
    <View className="gap-1.5">
      {filled.list.map((item) => (
        <View key={item} className="flex-row gap-2">
          <Text className="text-[15px] leading-6">•</Text>
          <Text className="flex-1 text-[15px] leading-6">{item}</Text>
        </View>
      ))}
    </View>
  );
}

/** A legal document (Privacy Policy or Terms), readable before and after sign-in. */
export function LegalScreen({ doc }: { doc: LegalDoc }) {
  const { colors } = useTheme();
  const updated = parseDayKey(doc.updated);
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('legal.back')}
          onPress={back}
          style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
          className="items-center justify-center rounded-full bg-muted active:opacity-70"
        >
          <Feather name="arrow-left" size={18} color={colors.foreground} />
        </Pressable>
        <Text variant="heading" accessibilityRole="header">
          {doc.title}
        </Text>
      </View>
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-12"
        style={{ maxWidth: 760, width: '100%', alignSelf: 'center' }}
      >
        {updated ? (
          <Text variant="caption" tone="muted">
            {t('legal.updated', { date: formatLongDate(updated) })}
          </Text>
        ) : null}
        {doc.intro.map((block, i) => (
          <Block key={`intro-${i}`} block={block} />
        ))}
        {doc.sections.map((section) => (
          <View key={section.heading} className="gap-2">
            <Text variant="heading" accessibilityRole="header" className="mt-2 text-base">
              {section.heading}
            </Text>
            {section.blocks.map((block, i) => (
              <Block key={`${section.heading}-${i}`} block={block} />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

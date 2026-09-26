import { Feather } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text, TextField } from '@/components';
import { t } from '@/i18n';
import { MIN_TOUCH_TARGET, useTheme } from '@/theme';

import { FormMessage } from '../../auth/components/FormMessage';
import { BarcodeError, isValidBarcode, lookupBarcode } from '../barcode';
import type { FoodResult } from '../types';

const ERRORS = {
  not_found: 'barcode.notFound',
  invalid_barcode: 'barcode.invalid',
  failed: 'barcode.failed',
} as const;

/** Full-screen barcode scanner with a typed fallback; hands the found product back. */
export function BarcodeScanner({
  visible,
  onClose,
  onFound,
}: {
  visible: boolean;
  onClose: () => void;
  onFound: (food: FoodResult) => void;
}) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [typed, setTyped] = useState('');
  const [invalid, setInvalid] = useState(false);
  const lastScan = useRef<string | null>(null);
  const lookup = useMutation({
    mutationFn: (code: string) => lookupBarcode(code),
    onSuccess: (food) => {
      onFound(food);
      onClose();
    },
  });
  const native = Platform.OS !== 'web';

  const submit = (code: string) => {
    setInvalid(false);
    if (!isValidBarcode(code)) return setInvalid(true);
    if (lookup.isPending) return;
    lookup.mutate(code);
  };

  const message = invalid
    ? t('barcode.invalid')
    : lookup.isError
      ? t(ERRORS[lookup.error instanceof BarcodeError ? lookup.error.code : 'failed'])
      : undefined;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-5 py-3">
          <View style={{ width: MIN_TOUCH_TARGET }} />
          <Text variant="heading" accessibilityRole="header">
            {t('barcode.title')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('barcode.close')}
            onPress={onClose}
            style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET }}
            className="items-center justify-center rounded-full bg-muted active:opacity-70"
          >
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <View className="flex-1 gap-4 px-5">
          {!native ? (
            <Text tone="muted">{t('barcode.webNote')}</Text>
          ) : permission?.granted ? (
            <View className="overflow-hidden rounded-2xl" style={{ height: 280 }}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a'] }}
                onBarcodeScanned={({ data }) => {
                  if (data === lastScan.current || lookup.isPending) return;
                  lastScan.current = data;
                  submit(data);
                }}
              />
            </View>
          ) : (
            <View className="gap-3">
              <Text tone="muted">{t('barcode.permission')}</Text>
              <Button label={t('barcode.allowCamera')} onPress={() => requestPermission()} />
            </View>
          )}
          {native && permission?.granted ? (
            <Text tone="muted" className="text-center">
              {t('barcode.hint')}
            </Text>
          ) : null}
          {lookup.isPending ? (
            <Text tone="muted" className="text-center" accessibilityLiveRegion="polite">
              {t('barcode.looking')}
            </Text>
          ) : null}
          <FormMessage message={message} />
          <TextField
            label={t('barcode.manualLabel')}
            placeholder={t('barcode.manualPlaceholder')}
            value={typed}
            onChangeText={(v) => setTyped(v.replace(/[^\d\s]/g, ''))}
            keyboardType="number-pad"
            returnKeyType="search"
            onSubmitEditing={() => submit(typed)}
          />
          <Button
            label={t('barcode.lookUp')}
            variant="outline"
            disabled={typed.replace(/\s/g, '').length < 8}
            loading={lookup.isPending}
            onPress={() => submit(typed)}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

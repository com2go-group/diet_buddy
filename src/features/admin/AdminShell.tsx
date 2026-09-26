import { router, usePathname, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';

import { Button, Text } from '@/components';
import { t, type StringKey } from '@/i18n';

import { signOut } from '../auth';
import { atLeast, type AdminRole } from './api';

const NAV: { href: string; label: StringKey; min: AdminRole }[] = [
  { href: '/admin', label: 'admin.nav_overview', min: 'support' },
  { href: '/admin/users', label: 'admin.nav_users', min: 'support' },
  { href: '/admin/support', label: 'admin.nav_support', min: 'support' },
  { href: '/admin/safety', label: 'admin.nav_safety', min: 'support' },
  { href: '/admin/settings', label: 'admin.nav_settings', min: 'admin' },
  { href: '/admin/content', label: 'admin.nav_content', min: 'admin' },
  { href: '/admin/campaigns', label: 'admin.nav_campaigns', min: 'admin' },
  { href: '/admin/audit', label: 'admin.nav_audit', min: 'admin' },
];

/** Sidebar (wide screens) or top tabs (narrow) around the admin pages. */
export function AdminShell({ role, children }: { role: AdminRole; children: ReactNode }) {
  const path = usePathname();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const items = NAV.filter((n) => atLeast(role, n.min));
  const active = (href: string) =>
    href === '/admin' ? path === '/admin' : path === href || path.startsWith(`${href}/`);

  const nav = items.map((n) => (
    <Pressable
      key={n.href}
      accessibilityRole="link"
      aria-selected={active(n.href)}
      onPress={() => router.push(n.href as Href)}
      style={{ minHeight: 44 }}
      className={`justify-center rounded-xl px-3 active:opacity-70 ${active(n.href) ? 'bg-accent' : ''}`}
    >
      <Text
        className={`text-[14px] ${active(n.href) ? 'font-bold text-accent-foreground' : 'font-medium'}`}
      >
        {t(n.label)}
      </Text>
    </Pressable>
  ));

  return (
    <View className={`flex-1 bg-background ${wide ? 'flex-row' : ''}`}>
      <View
        className={
          wide ? 'w-56 gap-1 border-r border-border p-4' : 'gap-2 border-b border-border p-3'
        }
      >
        <Text variant="heading" accessibilityRole="header" className="mb-2 text-base">
          🛠️ {t('admin.title')}
        </Text>
        {wide ? (
          nav
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-1"
          >
            {nav}
          </ScrollView>
        )}
        <View className={wide ? 'mt-4 gap-2' : 'flex-row gap-2'}>
          <Text variant="caption" tone="muted">
            {t(`admin.role_${role}`)}
          </Text>
          <Button
            label={t('admin.signOut')}
            variant="ghost"
            size="md"
            onPress={() => signOut().catch(() => undefined)}
          />
        </View>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-5 pb-16">
        {children}
      </ScrollView>
    </View>
  );
}

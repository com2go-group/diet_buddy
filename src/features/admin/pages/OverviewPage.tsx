import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { Card, KpiTile, Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';

import { loadStats, type AdminStats } from '../api';
import { PageTitle, QueryState } from './common';

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

function AiUsage({ stats }: { stats: AdminStats }) {
  const total = stats.ai_month.reduce((s, r) => s + Number(r.cost_usd), 0);
  const budget = stats.ai_budget_usd;
  return (
    <Card className="gap-2">
      <Text variant="heading" accessibilityRole="header" className="text-base">
        {t('admin.aiTitle')}
      </Text>
      {stats.ai_month.length ? (
        stats.ai_month.map((r) => (
          <View
            key={`${r.function}-${r.model}`}
            className="flex-row flex-wrap justify-between gap-2"
          >
            <Text className="font-semibold">
              {r.function} · {r.model}
            </Text>
            <Text tone="muted" className="text-[13px]">
              {t('admin.aiRow', {
                calls: formatNumber(r.calls),
                input: formatNumber(r.input_tokens),
                output: formatNumber(r.output_tokens),
                cost: usd(Number(r.cost_usd)),
              })}
            </Text>
          </View>
        ))
      ) : (
        <Text tone="muted">{t('admin.aiEmpty')}</Text>
      )}
      <Text className="font-bold">{t('admin.aiTotal', { cost: usd(total) })}</Text>
      <Text tone="muted" className="text-[13px]">
        {budget === null
          ? t('admin.aiNoBudget')
          : t('admin.aiBudget', {
              budget: usd(budget),
              pct: budget > 0 ? Math.round((total / budget) * 100) : 0,
            })}
      </Text>
    </Card>
  );
}

export function OverviewPage() {
  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: loadStats });
  return (
    <>
      <PageTitle>{t('admin.nav_overview')}</PageTitle>
      <QueryState query={stats}>
        {(s) => {
          const tiles: [string, number][] = [
            [t('admin.kpiUsers'), s.users_total],
            [t('admin.kpiNew7'), s.users_7d],
            [t('admin.kpiNew30'), s.users_30d],
            [t('admin.kpiOnboarded'), s.onboarded],
            [t('admin.kpiPremium'), s.premium],
            [t('admin.kpiActiveToday'), s.active_today],
            [t('admin.kpiActive7'), s.active_7d],
            [t('admin.kpiTickets'), s.open_tickets],
            [t('admin.kpiSafety'), s.open_safety],
          ];
          return (
            <>
              <View className="flex-row flex-wrap gap-3">
                {tiles.map(([label, value]) => (
                  <KpiTile
                    key={label}
                    label={label}
                    value={formatNumber(value)}
                    className="min-w-40 flex-1"
                  />
                ))}
              </View>
              <AiUsage stats={s} />
            </>
          );
        }}
      </QueryState>
    </>
  );
}

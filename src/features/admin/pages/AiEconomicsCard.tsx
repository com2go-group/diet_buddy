import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { Card, KpiTile, Text } from '@/components';
import { t } from '@/i18n';
import { formatNumber } from '@/lib/format';

import { loadAiEconomics, type AiEconomics } from '../api';
import { QueryState } from './common';

const usd = (n: number, digits = 2) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

function Body({ e }: { e: AiEconomics }) {
  const cost = e.cost_per_free_active_day_usd;
  const revenue = e.revenue_per_free_active_day_usd;
  const margin =
    cost !== null && revenue !== null && revenue > 0 ? (revenue - cost) / revenue : null;
  const a = e.assumptions;
  return (
    <>
      {cost === null || revenue === null ? (
        <Text tone="muted">{t('admin.econNoData')}</Text>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          <KpiTile
            label={t('admin.econCostDay')}
            value={usd(cost, 4)}
            className="min-w-40 flex-1"
          />
          <KpiTile
            label={t('admin.econRevenueDay')}
            value={usd(revenue, 4)}
            className="min-w-40 flex-1"
          />
          <KpiTile
            label={t('admin.econMargin')}
            value={margin === null ? '–' : `${Math.round(margin * 100)}%`}
            className="min-w-40 flex-1"
          />
        </View>
      )}
      <Text tone="muted" className="text-[13px]">
        {t('admin.econTotals', {
          days: formatNumber(e.free_active_days),
          views: formatNumber(e.rewarded_views),
          cost: usd(e.free_ai_cost_usd),
          revenue: usd(e.est_ad_revenue_usd),
        })}
      </Text>
      <Text tone="muted" className="text-[13px]">
        {t('admin.econPremium', {
          cost: usd(e.premium_ai_cost_usd),
          users: formatNumber(e.premium_users),
        })}
      </Text>
      <Text tone="muted" className="text-[13px]">
        {t('admin.econAssumptions', {
          rewarded: usd(a.rewarded_ecpm_usd ?? 0),
          banner: usd(a.banner_ecpm_usd ?? 0),
          impressions: formatNumber(a.banner_impressions_per_active_day ?? 0),
        })}
      </Text>
    </>
  );
}

/**
 * Whether ads cover free users' AI (decision log 2026-09-29): AI cost per active free user-day
 * against the estimated ad revenue, and the margin.
 */
export function AiEconomicsCard() {
  const economics = useQuery({
    queryKey: ['admin', 'aiEconomics'],
    queryFn: () => loadAiEconomics(30),
  });
  return (
    <Card className="gap-3">
      <Text variant="heading" accessibilityRole="header" className="text-base">
        {t('admin.econTitle', { days: 30 })}
      </Text>
      <QueryState query={economics}>{(e) => <Body e={e} />}</QueryState>
    </Card>
  );
}

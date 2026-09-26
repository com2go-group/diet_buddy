import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { Card, EmptyState, Text } from '@/components';
import { t } from '@/i18n';

import { loadAudit } from '../api';
import { PageTitle, QueryState, formatDateTime } from './common';

export function AuditPage() {
  const audit = useQuery({ queryKey: ['admin', 'audit'], queryFn: loadAudit });
  return (
    <>
      <PageTitle>{t('admin.nav_audit')}</PageTitle>
      <QueryState query={audit}>
        {(rows) =>
          rows.length ? (
            <Card className="gap-3">
              {rows.map((r) => (
                <View key={r.id} className="gap-0.5 border-b border-border pb-2">
                  <Text className="font-semibold">{`${r.action}${r.target ? ` · ${r.target}` : ''}`}</Text>
                  <Text variant="caption" tone="muted">
                    {`${r.admin_email ?? '—'} · ${formatDateTime(r.created_at)}`}
                  </Text>
                  {r.details && JSON.stringify(r.details) !== '{}' ? (
                    <Text variant="caption" tone="muted" selectable>
                      {JSON.stringify(r.details)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : (
            <EmptyState emoji="📜" title={t('admin.auditEmpty')} />
          )
        }
      </QueryState>
    </>
  );
}

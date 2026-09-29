import { scrub, setCrashReportsEnabled } from '../crash';

type Analytics = typeof import('../analytics');

describe('analytics', () => {
  const load = (key: string | undefined): Analytics => {
    let mod!: Analytics;
    jest.isolateModules(() => {
      process.env.EXPO_PUBLIC_POSTHOG_KEY = key ?? '';
      mod = jest.requireActual<Analytics>('../analytics');
    });
    return mod;
  };

  it('sends nothing without consent or without a key', async () => {
    const fetcher = jest.fn();
    const off = load('phc_test');
    off.track('paywall_viewed');
    await off.flushAnalytics(fetcher);
    const noKey = load(undefined);
    noKey.setAnalyticsEnabled(true);
    noKey.track('paywall_viewed');
    await noKey.flushAnalytics(fetcher);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('batches events to the EU host with a random ID, and drops them when consent is withdrawn', async () => {
    const fetcher = jest.fn(async () => new Response('{}'));
    const a = load('phc_test');
    a.setAnalyticsEnabled(true);
    a.track('paywall_viewed', { feature: 'coach' });
    await a.flushAnalytics(fetcher as unknown as typeof fetch);
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toBe('https://eu.i.posthog.com/batch/');
    const body = JSON.parse(init.body);
    expect(body.api_key).toBe('phc_test');
    expect(body.batch[0]).toMatchObject({
      event: 'paywall_viewed',
      properties: { feature: 'coach', distinct_id: expect.stringMatching(/^[0-9a-f-]{36}$/) },
    });
    a.track('meal_plan_action');
    a.setAnalyticsEnabled(false);
    await a.flushAnalytics(fetcher as unknown as typeof fetch);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('crash reports', () => {
  it('strip anything that could identify the user', () => {
    const event = scrub({
      user: { id: 'u1', email: 'a@example.com' },
      request: { data: '{"weight":80}', query_string: 'q=1', url: 'https://x' },
      breadcrumbs: [{ category: 'fetch', data: { url: 'https://x?token=1' } }],
    } as never) as unknown as {
      user?: unknown;
      request: Record<string, unknown>;
      breadcrumbs: { data?: unknown }[];
    };
    expect(event.user).toBeUndefined();
    expect(event.request).toEqual({ url: 'https://x' });
    expect(event.breadcrumbs[0]!.data).toBeUndefined();
  });

  it('are dropped once switched off', async () => {
    await setCrashReportsEnabled(false);
    expect(scrub({} as never)).toBeNull();
    await setCrashReportsEnabled(true);
  });
});

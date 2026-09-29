describe('captcha', () => {
  const load = (key: string) => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY = key;
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- fresh module per env value
    return require('../captcha') as typeof import('../captcha');
  };
  afterAll(() => {
    delete process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;
  });

  it('is off (no token) without a site key', async () => {
    const c = load('');
    expect(c.captchaEnabled).toBe(false);
    await expect(c.captchaToken()).resolves.toBeUndefined();
  });

  it('asks the mounted widget for a token, and fails without one', async () => {
    const c = load('site-key');
    await expect(c.captchaToken()).rejects.toThrow('captcha_unavailable');
    const unregister = c.registerCaptcha(async () => 'tok');
    await expect(c.captchaToken()).resolves.toBe('tok');
    unregister();
    await expect(c.captchaToken()).rejects.toThrow('captcha_unavailable');
  });

  it('times out', async () => {
    jest.useFakeTimers();
    const c = load('site-key');
    c.registerCaptcha(() => new Promise(() => undefined));
    const p = c.captchaToken();
    jest.advanceTimersByTime(c.CAPTCHA_TIMEOUT_MS);
    await expect(p).rejects.toThrow('captcha_timeout');
    jest.useRealTimers();
  });

  it('settles every waiter from one widget message', async () => {
    const c = load('site-key');
    const q = c.createTokenQueue();
    const a = q.wait();
    const b = q.wait();
    expect(q.pending).toBe(2);
    q.resolve('t');
    await expect(Promise.all([a, b])).resolves.toEqual(['t', 't']);
    const d = q.wait();
    q.reject(new c.CaptchaError());
    await expect(d).rejects.toThrow('captcha_failed');
  });

  it('parses only well-formed widget messages', () => {
    const c = load('site-key');
    expect(c.parseCaptchaMessage('{"type":"token","token":"x"}')).toEqual({
      type: 'token',
      token: 'x',
    });
    expect(c.parseCaptchaMessage('{"type":"token"}')).toBeNull();
    expect(c.parseCaptchaMessage('{"type":"interactive","on":true}')).toEqual({
      type: 'interactive',
      on: true,
    });
    expect(c.parseCaptchaMessage('nope')).toBeNull();
    expect(c.captchaHtml('k', 'dark', 'de')).toContain('"sitekey":"k"');
  });
});

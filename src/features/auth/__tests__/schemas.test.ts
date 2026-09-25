import {
  codeSchema,
  emailSchema,
  identifierOf,
  normalizePhone,
  passwordSchema,
  phoneSchema,
  signInSchema,
  signUpSchema,
  toIsoDate,
} from '../schemas';

const messages = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.success ? [] : (r.error?.issues.map((i) => i.message) ?? []);

describe('identifiers', () => {
  it('accepts and trims emails', () => {
    expect(emailSchema.parse('  alex@example.com ')).toBe('alex@example.com');
    expect(messages(emailSchema.safeParse('alex@'))).toEqual(['authErrors.invalidEmail']);
    expect(messages(emailSchema.safeParse(''))).toEqual(['authErrors.required']);
  });

  it('normalizes phone numbers to E.164', () => {
    expect(normalizePhone('+44 (7700) 900-123')).toBe('+447700900123');
    expect(phoneSchema.parse('+44 7700 900123')).toBe('+447700900123');
    expect(messages(phoneSchema.safeParse('07700 900123'))).toEqual(['authErrors.invalidPhone']);
    expect(messages(phoneSchema.safeParse('+0123456789'))).toEqual(['authErrors.invalidPhone']);
  });

  it('lower-cases emails for Supabase', () => {
    expect(identifierOf({ method: 'email', email: ' Alex@Example.com ', phone: '' })).toBe(
      'alex@example.com',
    );
    expect(identifierOf({ method: 'phone', email: '', phone: '+44 7700 900123' })).toBe(
      '+447700900123',
    );
  });
});

describe('passwords and codes', () => {
  it.each(['short1', 'lettersonly', '12345678'])('rejects weak password %p', (pw) => {
    expect(passwordSchema.safeParse(pw).success).toBe(false);
  });

  it('accepts letters and digits, 8+ characters', () => {
    expect(passwordSchema.safeParse('diet2buddy').success).toBe(true);
  });

  it('requires exactly six digits', () => {
    expect(codeSchema.safeParse('123456').success).toBe(true);
    expect(codeSchema.safeParse('12345').success).toBe(false);
    expect(codeSchema.safeParse('12a456').success).toBe(false);
  });
});

describe('toIsoDate', () => {
  it('builds ISO dates', () => {
    expect(toIsoDate('7', '3', '1990')).toBe('1990-03-07');
  });

  it.each([
    ['31', '2', '1990'],
    ['29', '2', '2023'],
    ['0', '1', '1990'],
    ['1', '13', '1990'],
    ['1', '1', '90'],
    ['', '', ''],
  ])('rejects %s/%s/%s', (d, m, y) => {
    expect(toIsoDate(d, m, y)).toBeNull();
  });

  it('accepts 29 February in a leap year', () => {
    expect(toIsoDate('29', '2', '2000')).toBe('2000-02-29');
  });
});

describe('signUpSchema', () => {
  const today = new Date();
  const base = {
    method: 'email' as const,
    email: 'alex@example.com',
    phone: '',
    name: 'Alex',
    birthDate: { day: '17', month: '5', year: '1990' },
    password: 'diet2buddy',
    confirmPassword: 'diet2buddy',
  };

  it('outputs an ISO birth date', () => {
    expect(signUpSchema.parse(base).birthDate).toBe('1990-05-17');
  });

  it('enforces 18+, accepting an 18th birthday today', () => {
    const eighteenToday = {
      day: String(today.getDate()),
      month: String(today.getMonth() + 1),
      year: String(today.getFullYear() - 18),
    };
    expect(signUpSchema.safeParse({ ...base, birthDate: eighteenToday }).success).toBe(true);

    const tomorrow = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate() + 1);
    const almost = {
      day: String(tomorrow.getDate()),
      month: String(tomorrow.getMonth() + 1),
      year: String(tomorrow.getFullYear()),
    };
    expect(messages(signUpSchema.safeParse({ ...base, birthDate: almost }))).toEqual([
      'authErrors.underage',
    ]);
  });

  it('rejects impossible and future dates', () => {
    expect(
      messages(
        signUpSchema.safeParse({ ...base, birthDate: { day: '31', month: '2', year: '1990' } }),
      ),
    ).toEqual(['authErrors.invalidDate']);
    expect(
      messages(
        signUpSchema.safeParse({
          ...base,
          birthDate: { day: '1', month: '1', year: String(today.getFullYear() + 1) },
        }),
      ),
    ).toEqual(['authErrors.invalidDate']);
  });

  it('reports identifier and confirmation errors alongside other field errors', () => {
    const r = signUpSchema.safeParse({ ...base, name: '', email: '', confirmPassword: 'nope' });
    expect(r.error?.issues.map((i) => i.path.join('.'))).toEqual(
      expect.arrayContaining(['name', 'email', 'confirmPassword']),
    );
  });

  it('checks the password confirmation', () => {
    const r = signUpSchema.safeParse({ ...base, confirmPassword: 'other2pass' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['confirmPassword']);
  });

  it('validates only the chosen method', () => {
    expect(
      signUpSchema.safeParse({
        ...base,
        email: 'not-an-email',
        method: 'phone',
        phone: '+447700900123',
      }).success,
    ).toBe(true);
    const r = signUpSchema.safeParse({ ...base, method: 'phone', phone: '07700' });
    expect(r.error?.issues.map((i) => i.path)).toEqual([['phone']]);
  });
});

describe('signInSchema', () => {
  it('needs a password but not a strong one (existing accounts)', () => {
    const base = { method: 'email' as const, email: 'a@b.co', phone: '' };
    expect(signInSchema.safeParse({ ...base, password: 'x' }).success).toBe(true);
    expect(messages(signInSchema.safeParse({ ...base, password: '' }))).toEqual([
      'authErrors.required',
    ]);
  });
});

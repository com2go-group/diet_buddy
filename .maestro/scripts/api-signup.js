// Creates an unverified account through the Supabase Auth API (web runs only: Maestro's web
// driver can't fill the auto-advancing date-of-birth boxes). Signing in then asks for the code.
const res = http.post(`${SUPABASE_URL}/auth/v1/signup`, {
  headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: output.email,
    password: PASSWORD,
    data: { name: 'Maestro Tester', birth_date: '1990-05-17' },
  }),
});
if (res.status >= 400) throw new Error(`Sign-up failed: ${res.status} ${res.body}`);

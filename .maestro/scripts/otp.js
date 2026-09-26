// Reads the newest 6-digit verification code sent to EMAIL from the local Supabase mail catcher
// (Mailpit, `npm run db:start`, http://127.0.0.1:54324). Set MAILBOX_URL for another host
// (Android emulators reach the host at http://10.0.2.2:54324).
const base =
  typeof MAILBOX_URL !== 'undefined' && MAILBOX_URL ? MAILBOX_URL : 'http://127.0.0.1:54324';
const query = encodeURIComponent(`to:"${EMAIL}"`);
const found = json(http.get(`${base}/api/v1/search?query=${query}&limit=1`).body);
if (!found.messages || !found.messages.length) throw new Error(`No email for ${EMAIL} yet`);
const message = json(http.get(`${base}/api/v1/message/${found.messages[0].ID}`).body);
const match = /\b(\d{6})\b/.exec(message.Text || message.HTML || '');
if (!match) throw new Error('No 6-digit code in the email');
output.code = match[1];

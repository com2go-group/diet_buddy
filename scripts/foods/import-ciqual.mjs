// Loads the CIQUAL food table into eu_foods (docs/backend.md → European food data).
//   npm run foods:ciqual -- <ciqual.csv> --sql <out.sql>   write SQL for the SQL editor / psql
//   npm run foods:ciqual -- <ciqual.csv> --upload          upsert through the REST API
// --upload needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (never commit them).
import { readFileSync, writeFileSync } from 'node:fs';

import { ciqualRows, toSql } from './ciqual.ts';

const [input, mode, out] = process.argv.slice(2);
if (!input || !['--sql', '--upload'].includes(mode ?? '')) {
  console.error('Usage: npm run foods:ciqual -- <ciqual.csv> --sql <out.sql> | --upload');
  process.exit(1);
}

const { rows, skipped } = ciqualRows(readFileSync(input, 'utf8'));
console.log(`CIQUAL: ${rows.length} foods read, ${skipped} rows skipped.`);

if (mode === '--sql') {
  if (!out) throw new Error('--sql needs an output file');
  writeFileSync(out, toSql(rows));
  console.log(`Wrote ${out}. Run it in the Supabase SQL editor or with psql.`);
} else {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  for (let i = 0; i < rows.length; i += 500) {
    const res = await fetch(`${url}/rest/v1/eu_foods?on_conflict=source,code`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows.slice(i, i + 500)),
    });
    if (!res.ok) throw new Error(`Upload failed at row ${i}: ${res.status} ${await res.text()}`);
    console.log(`Uploaded ${Math.min(i + 500, rows.length)} / ${rows.length}`);
  }
}

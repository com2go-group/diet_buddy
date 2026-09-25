#!/usr/bin/env node
/**
 * Runs the Supabase migrations, seed and pgTAP tests against a plain Postgres server,
 * using scripts/db/supabase-stub.sql in place of Supabase's auth and storage schemas.
 *
 * For machines without Docker. With Docker, prefer `npx supabase start && npx supabase test db`.
 *
 * Requires psql on PATH and the pgTAP extension installed on the server.
 * DATABASE_URL must point at a server where the user can create databases
 * (default postgres://postgres:postgres@localhost:5432/postgres). A throwaway database
 * named dietbuddy_test is dropped and recreated on each run.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const adminUrl = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres';
const testDb = 'dietbuddy_test';
const testUrl = new URL(adminUrl);
testUrl.pathname = `/${testDb}`;

function psql(url, args, input) {
  return execFileSync('psql', [url, '-X', '-q', '-v', 'ON_ERROR_STOP=1', ...args], {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function runFile(label, sql) {
  try {
    return psql(testUrl.href, ['-t', '-A'], sql);
  } catch (error) {
    console.error(`✗ ${label}\n${error.stderr || error.message}`);
    process.exit(1);
  }
}

psql(adminUrl, ['-c', `drop database if exists ${testDb} with (force)`]);
psql(adminUrl, ['-c', `create database ${testDb}`]);

const stub = readFileSync(join(root, 'scripts/db/supabase-stub.sql'), 'utf8').replace(
  'current_database_placeholder',
  testDb,
);
runFile('supabase stub', stub);
runFile('pgtap', 'create extension if not exists pgtap with schema extensions;');

const migrationsDir = join(root, 'supabase/migrations');
for (const file of readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()) {
  runFile(file, readFileSync(join(migrationsDir, file), 'utf8'));
  console.log(`✓ migration ${file}`);
}
runFile('seed.sql', readFileSync(join(root, 'supabase/seed.sql'), 'utf8'));
console.log('✓ seed.sql');

const testsDir = join(root, 'supabase/tests/database');
let failed = 0;
let passed = 0;
for (const file of readdirSync(testsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()) {
  const output = runFile(file, readFileSync(join(testsDir, file), 'utf8'));
  const lines = output.split('\n').filter(Boolean);
  const failures = lines.filter((l) => l.startsWith('not ok'));
  const oks = lines.filter((l) => l.startsWith('ok'));
  const diagnostics = lines.filter((l) => l.startsWith('#'));
  // A file that ran no assertions counts as one failure.
  const fileFailures = failures.length || (oks.length === 0 ? 1 : 0);
  passed += oks.length;
  failed += fileFailures;
  if (fileFailures > 0) {
    console.error(`✗ ${file}: ${failures.length} failed, ${oks.length} passed`);
    console.error([...failures, ...diagnostics].join('\n'));
  } else {
    console.log(`✓ ${file}: ${oks.length} passed`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);

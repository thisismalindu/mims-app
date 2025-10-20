#!/usr/bin/env node
/*
 * Interactive DB apply script
 * - Loads DATABASE_URL from .env.local (or process.env)
 * - Prompts for admin/agent/manager passwords (hidden)
 * - Hashes with bcrypt
 * - Replaces placeholders in SQL and executes against Postgres
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const env = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
  return env;
}

function createHiddenPrompt() {
  // Mute output while typing
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  const origWrite = rl._writeToOutput;
  rl._writeToOutput = function (stringToWrite) {
    // Prevent echoing typed characters (but keep question text)
    if (rl.stdoutMuted) return;
    origWrite.call(rl, stringToWrite);
  };
  return rl;
}

function askHidden(rl, question) {
  return new Promise((resolve) => {
    rl.stdoutMuted = false;
    rl.question(question, (ans) => {
      resolve(ans);
    });
    // After the question text is printed, mute further output
    rl.stdoutMuted = true;
  });
}

async function promptPasswords() {
  const rl = createHiddenPrompt();
  try {
    const admin = await askHidden(rl, 'Enter password for admin: ');
    rl.output.write('\n');
    const agent = await askHidden(rl, 'Enter password for agent: ');
    rl.output.write('\n');
    const manager = await askHidden(rl, 'Enter password for manager: ');
    rl.output.write('\n');
    return { admin, agent, manager };
  } finally {
    rl.close();
  }
}

async function main() {
  console.log('mims-app: applying database schema...');
  const envLocal = await loadEnvLocal();
  const DATABASE_URL = envLocal.DATABASE_URL || process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set in .env.local or environment.');
    process.exit(1);
  }

  const schemaPath = path.resolve(process.cwd(), 'src/app/api/setup-database/database-schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error('ERROR: Could not find database schema at', schemaPath);
    process.exit(1);
  }

  const { admin, agent, manager } = await promptPasswords();
  if (!admin || !agent || !manager) {
    console.error('ERROR: All three passwords are required.');
    process.exit(1);
  }

  const saltRounds = 10;
  console.log('Hashing passwords...');
  const [adminHash, agentHash, managerHash] = await Promise.all([
    bcrypt.hash(admin, saltRounds),
    bcrypt.hash(agent, saltRounds),
    bcrypt.hash(manager, saltRounds),
  ]);

  console.log('Preparing SQL...');
  let sql = fs.readFileSync(schemaPath, 'utf8');
  sql = sql
    .replace(/<adminhash>/g, adminHash)
    .replace(/<agenthash>/g, agentHash)
    .replace(/<managerhash>/g, managerHash);

  // Basic SSL opt-in: if the URL hints SSL or env flag set
  const needsSSL = /sslmode=require/i.test(DATABASE_URL) || /neon\.tech/i.test(DATABASE_URL) || envLocal.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === 'true';
  const client = new Client({ connectionString: DATABASE_URL, ssl: needsSSL ? { rejectUnauthorized: false } : undefined });

  console.log('Connecting to database...');
  await client.connect();
  try {
    console.log('Applying schema and seed data (this may take a moment)...');
    await client.query(sql);
    console.log('Success: schema applied and initial users created.');
  } catch (err) {
    console.error('ERROR applying schema:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});

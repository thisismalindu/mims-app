#!/usr/bin/env node
/*
  Usage:
    - Set DATABASE_URL or enter it when prompted
    - node scripts\\apply-sql.js [path-to-sql]
      default path: src/app/api/setup-database/database-schema.sql

  This script:
    - Prompts for admin/agent/manager passwords (hidden)
    - Hashes them with bcrypt (in-memory)
    - Replaces <adminhash>/<agenthash>/<managerhash> in the SQL (in-memory)
    - Executes the SQL against the Postgres database
    - Does not write hashes or passwords to disk
*/

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

function createRL() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function questionMasked(query) {
  return new Promise((resolve) => {
    const rl = createRL();
    const stdin = process.stdin;
    const onData = (char) => {
      char = char + '';
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          stdin.removeListener('data', onData);
          break;
        default:
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(query + '*'.repeat(buffer.length));
          break;
      }
    };

    let buffer = '';
    rl.question(query, (answer) => {
      rl.history = rl.history.slice(1); // prevent storing in history
      rl.close();
      resolve(buffer.length ? buffer : answer);
    });
    stdin.on('data', (chunk) => {
      const str = chunk.toString();
      // handle backspace
      if (str === '\u0008' || str === '\u007f') {
        buffer = buffer.slice(0, -1);
      } else if (str === '\r' || str === '\n') {
        // enter key -> let rl finish
      } else {
        buffer += str;
      }
      onData(str);
    });
  });
}

function question(query) {
  return new Promise((resolve) => {
    const rl = createRL();
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  try {
    const sqlPath = process.argv[2] || path.join('src', 'app', 'api', 'setup-database', 'database-schema.sql');
    if (!fs.existsSync(sqlPath)) {
      console.error(`SQL file not found: ${sqlPath}`);
      process.exit(1);
    }

    const dbUrl = process.env.DATABASE_URL || (await question('Enter DATABASE_URL: ')).trim();
    if (!dbUrl) {
      console.error('DATABASE_URL is required');
      process.exit(1);
    }

    // Prompt for passwords (hidden, not logged)
    const adminPw = await questionMasked('Enter password for admin: ');
    const agentPw = await questionMasked('Enter password for agent: ');
    const managerPw = await questionMasked('Enter password for manager: ');

    if (!adminPw || !agentPw || !managerPw) {
      console.error('All three passwords are required');
      process.exit(1);
    }

    // Hash in memory
    const [adminHash, agentHash, managerHash] = await Promise.all([
      bcrypt.hash(adminPw, 10),
      bcrypt.hash(agentPw, 10),
      bcrypt.hash(managerPw, 10),
    ]);

    // Read & replace placeholders (in memory only)
    let sql = fs.readFileSync(sqlPath, 'utf8');
    const before = sql;
    sql = sql.replace(/<adminhash>/g, adminHash)
             .replace(/<agenthash>/g, agentHash)
             .replace(/<managerhash>/g, managerHash);

    if (before === sql) {
      console.warn('Warning: No placeholders were replaced. Ensure <adminhash>, <agenthash>, <managerhash> exist in the SQL.');
    }

    // Connect and execute
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    try {
      await client.query(sql);
      console.log('SQL applied successfully.');
    } finally {
      await client.end();
    }
  } catch (err) {
    console.error('Error applying SQL:', err.message || err);
    process.exit(1);
  }
}

main();

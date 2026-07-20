import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_PATH = join(ROOT, 'wrangler.jsonc');

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: 'pipe', cwd: ROOT, ...opts }).trim();
  } catch (e) {
    const stdout = e.stdout ? e.stdout.trim() : '';
    const stderr = e.stderr ? e.stderr.trim() : '';
    if (stdout) return stdout;
    if (stderr) throw new Error(stderr);
    throw e;
  }
}

function readConfig() {
  return readFileSync(CONFIG_PATH, 'utf-8');
}

function writeConfig(content) {
  writeFileSync(CONFIG_PATH, content, 'utf-8');
}

function generateSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  console.log('Label Manager - Cloudflare Workers Deploy\n');

  // Step 1: Check wrangler
  console.log('1. Checking wrangler...');
  let wranglerVersion;
  try {
    wranglerVersion = run('npx wrangler --version').split('\n')[0];
    console.log(`   ${wranglerVersion}\n`);
  } catch {
    console.error('   ERROR: wrangler not found. Run: npm install');
    process.exit(1);
  }

  // Step 2: Check login
  console.log('2. Checking Cloudflare login...');
  try {
    const whoami = run('npx wrangler whoami');
    const accountMatch = whoami.match(/([a-f0-9]{32})/i);
    console.log(`   Logged in${accountMatch ? ` (account: ${accountMatch[1].slice(0, 8)}...)` : ''}\n`);
  } catch {
    console.error('   ERROR: Not logged in. Run: npx wrangler login');
    process.exit(1);
  }

  let config = readConfig();

  // Step 3: Create D1 database
  console.log('3. Setting up D1 database...');
  const dbIdMatch = config.match(/"database_id"\s*:\s*"([^"]+)"/);
  const currentDbId = dbIdMatch ? dbIdMatch[1] : null;

  if (currentDbId && !currentDbId.startsWith('<')) {
    console.log(`   Already configured (id: ${currentDbId.slice(0, 8)}...)\n`);
  } else {
    console.log('   Creating D1 database...');
    try {
      const output = run('npx wrangler d1 create label-manager-db');
      // Match: id: "xxxx-xxxx-xxxx" or id: xxxx-xxxx-xxxx
      const newDbIdMatch = output.match(/id:\s*"?([a-f0-9-]+)"?/i);
      if (!newDbIdMatch) {
        console.error('   Failed to parse D1 output:');
        console.error('   ', output.split('\n').join('\n    '));
        process.exit(1);
      }
      const newDbId = newDbIdMatch[1];
      config = config.replace(/"database_id"\s*:\s*"[^"]*"/, `"database_id": "${newDbId}"`);
      writeConfig(config);
      config = readConfig();
      console.log(`   Created (id: ${newDbId})\n`);
    } catch (e) {
      // If it already exists (e.g. previous run created it but didn't save ID)
      if (e.message && e.message.includes('already exists')) {
        console.log('   Database already exists, listing to find ID...');
        try {
          const list = run('npx wrangler d1 list');
          const match = list.match(/label-manager-db\s+([a-f0-9-]+)/i);
          if (match) {
            const existingId = match[1];
            config = config.replace(/"database_id"\s*:\s*"[^"]*"/, `"database_id": "${existingId}"`);
            writeConfig(config);
            config = readConfig();
            console.log(`   Found and configured (id: ${existingId})\n`);
          } else {
            console.error('   Could not find database ID. Please set it manually in wrangler.jsonc');
            process.exit(1);
          }
        } catch {
          console.error('   Could not list databases. Please set database_id manually in wrangler.jsonc');
          process.exit(1);
        }
      } else {
        console.error('   ', e.message);
        process.exit(1);
      }
    }
  }

  // Step 4: Create KV namespace (optional)
  console.log('4. Setting up KV namespace...');
  const kvIdMatch = config.match(/"binding"\s*:\s*"KV"[^}]*"id"\s*:\s*"([^"]+)"/s);
  const currentKvId = kvIdMatch ? kvIdMatch[1] : null;

  if (currentKvId && !currentKvId.startsWith('<')) {
    console.log(`   Already configured (id: ${currentKvId.slice(0, 8)}...)\n`);
  } else {
    console.log('   Creating KV namespace...');
    try {
      const output = run('npx wrangler kv namespace create KV');
      const newKvIdMatch = output.match(/Id:\s*"?([a-f0-9-]+)"?/i);
      if (!newKvIdMatch) {
        console.error('   Failed to parse KV output. Continuing without KV...');
        console.error('   ', output.split('\n').join('\n    '));
      } else {
        const newKvId = newKvIdMatch[1];
        config = readConfig();
        config = config.replace(/"id"\s*:\s*"<YOUR_KV_NAMESPACE_ID>"/, `"id": "${newKvId}"`);
        writeConfig(config);
        config = readConfig();
        console.log(`   Created (id: ${newKvId})\n`);
      }
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        console.log('   KV namespace already exists, listing to find ID...');
        try {
          const list = run('npx wrangler kv namespace list');
          const match = list.match(/([a-f0-9]{32})/i);
          if (match) {
            const existingId = match[1];
            config = readConfig();
            config = config.replace(/"id"\s*:\s*"<YOUR_KV_NAMESPACE_ID>"/, `"id": "${existingId}"`);
            writeConfig(config);
            config = readConfig();
            console.log(`   Found and configured (id: ${existingId})\n`);
          } else {
            console.log('   Could not find KV ID. Continuing without KV...\n');
          }
        } catch {
          console.log('   Could not list KV namespaces. Continuing without KV...\n');
        }
      } else {
        console.log(`   KV setup failed (${e.message}). Continuing without KV...\n`);
      }
    }
  }

  // Step 5: Generate JWT secret if needed
  console.log('5. Checking JWT secret...');
  config = readConfig();
  if (config.includes('CHANGE THIS TO A STRONG SECRET')) {
    const secret = generateSecret();
    config = config.replace('CHANGE THIS TO A STRONG SECRET', secret);
    writeConfig(config);
    config = readConfig();
    console.log('   Generated new JWT secret\n');
  } else {
    console.log('   Already configured\n');
  }

  // Step 6: Initialize database schema
  console.log('6. Initializing D1 schema...');
  try {
    run('npx wrangler d1 execute label-manager-db --remote --file=worker/schema.sql');
    console.log('   Schema applied successfully\n');
  } catch (e) {
    const msg = e.message || String(e);
    if (msg.includes('already') || msg.includes('UNIQUE') || msg.includes('duplicate')) {
      console.log('   Schema already applied\n');
    } else {
      console.error('   Schema failed:', msg);
      console.error('   Continuing anyway...\n');
    }
  }

  // Step 7: Build frontend
  console.log('7. Building frontend...');
  try {
    run('npm run build', { stdio: 'inherit' });
    console.log();
  } catch {
    console.error('   ERROR: Build failed');
    process.exit(1);
  }

  // Step 8: Deploy
  console.log('8. Deploying to Cloudflare Workers...');
  let deployUrl;
  try {
    const output = run('npx wrangler deploy');
    console.log('   ', output.split('\n').join('\n    '));

    // Extract the URL from the deploy output
    const urlMatch = output.match(/(https:\/\/[^\s]+\.workers\.dev)/);
    deployUrl = urlMatch ? urlMatch[1] : null;

    console.log('\n   Deployed successfully!\n');
  } catch (e) {
    console.error('   Deploy failed:', e.message);
    process.exit(1);
  }

  // Step 9: Run setup (create admin user)
  if (deployUrl) {
    console.log('9. Running initial setup...');
    try {
      const response = await fetch(`${deployUrl}/api/setup`, { method: 'POST' });
      const data = await response.json();
      console.log(`   ${data.message || JSON.stringify(data)}\n`);
    } catch (e) {
      console.log(`   Setup request failed: ${e.message}`);
      console.log(`   Run manually: curl -X POST ${deployUrl}/api/setup\n`);
    }
  }

  // Done
  console.log('='.repeat(60));
  console.log('  DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  if (deployUrl) {
    console.log(`\n  URL: ${deployUrl}`);
  }
  console.log('\n  Default login: admin / admin123');
  console.log('  Change the password immediately after first login!');
  console.log('='.repeat(60));
}

main().catch(e => {
  console.error('Deploy failed:', e);
  process.exit(1);
});

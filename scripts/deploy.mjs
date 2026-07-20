import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CONFIG_PATH = join(ROOT, 'wrangler.jsonc');
const DB_NAME = 'label-manager-db';
const KV_BINDING = 'KV';

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8', cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    const combined = [e.stdout, e.stderr].filter(Boolean).join('\n');
    const err = new Error(combined || e.message);
    err.combined = combined;
    throw err;
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

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function findOrCreateD1(config) {
  const dbIdMatch = config.match(/"database_id"\s*:\s*"([^"]+)"/);
  const currentDbId = dbIdMatch ? dbIdMatch[1] : null;
  if (currentDbId && !currentDbId.startsWith('<')) {
    console.log(`   Already configured (id: ${currentDbId.slice(0, 8)}...)`);
    return currentDbId;
  }

  console.log('   Creating D1 database...');
  try {
    const output = run(`npx wrangler d1 create ${DB_NAME}`);
    const match = output.match(/database_id["\s:"]+([a-f0-9-]{36})/i)
      || output.match(/["']database_id["']\s*:\s*["']([a-f0-9-]{36})["']/i);
    if (match) return match[1];
    console.error('   Could not parse D1 creation output, listing databases...');
  } catch (e) {
    const msg = e.combined || e.message || '';
    if (msg.includes('already exists')) {
      console.log('   Database already exists, listing to find ID...');
    } else {
      console.error(`   Create failed: ${msg.split('\n').slice(-3).join('   ')}`);
    }
  }

  // Fallback: list databases and find ours
  try {
    const list = run('npx wrangler d1 list');
    const rows = list.split('\n').filter(l => l.includes(DB_NAME));
    if (rows.length > 0) {
      const uuidMatch = rows[0].match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      if (uuidMatch) {
        console.log(`   Found (id: ${uuidMatch[1]})`);
        return uuidMatch[1];
      }
    }
  } catch {}

  // Last resort: manual input
  const manual = await ask('   Could not find D1 database ID. Enter it manually (or press Enter to skip): ');
  return manual || null;
}

async function findOrCreateKV(config) {
  const kvIdMatch = config.match(/"binding"\s*:\s*"KV"[^}]*"id"\s*:\s*"([^"]+)"/s);
  const currentKvId = kvIdMatch ? kvIdMatch[1] : null;
  if (currentKvId && !currentKvId.startsWith('<')) {
    console.log(`   Already configured (id: ${currentKvId.slice(0, 8)}...)`);
    return currentKvId;
  }

  console.log('   Creating KV namespace...');
  try {
    const output = run(`npx wrangler kv namespace create ${KV_BINDING}`);
    const match = output.match(/Id:\s*"?([a-f0-9-]{32,})"?/i)
      || output.match(/"id"\s*:\s*"([a-f0-9-]{32,})"/i);
    if (match) return match[1];
    console.error('   Could not parse KV output, listing namespaces...');
  } catch (e) {
    const msg = e.combined || e.message || '';
    if (msg.includes('already exists')) {
      console.log('   KV namespace already exists, listing to find ID...');
    } else {
      console.error(`   Create failed: ${msg.split('\n').slice(-3).join('   ')}`);
    }
  }

  // Fallback: list KV namespaces
  try {
    const list = run('npx wrangler kv namespace list');
    const match = list.match(/([a-f0-9]{32})/i);
    if (match) {
      console.log(`   Found (id: ${match[1]})`);
      return match[1];
    }
  } catch {}

  console.log('   Could not find KV namespace. KV will be unavailable.');
  return null;
}

async function main() {
  console.log('Label Manager - Cloudflare Workers Deploy\n');

  // Step 1: Check wrangler
  console.log('1. Checking wrangler...');
  try {
    const v = run('npx wrangler --version').split('\n')[0];
    console.log(`   ${v}\n`);
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
  const dbId = await findOrCreateD1(config);
  if (dbId) {
    config = readConfig();
    config = config.replace(/"database_id"\s*:\s*"[^"]*"/, `"database_id": "${dbId}"`);
    writeConfig(config);
  } else {
    console.error('   ERROR: D1 database ID is required');
    process.exit(1);
  }
  console.log();

  // Step 4: Create KV namespace
  console.log('4. Setting up KV namespace...');
  const kvId = await findOrCreateKV(config);
  if (kvId) {
    config = readConfig();
    config = config.replace(/"id"\s*:\s*"[^"]*"/, `"id": "${kvId}"`);
    writeConfig(config);
  }
  console.log();

  // Step 5: Generate JWT secret
  console.log('5. Checking JWT secret...');
  config = readConfig();
  if (config.includes('CHANGE THIS TO A STRONG SECRET')) {
    const secret = generateSecret();
    config = config.replace('CHANGE THIS TO A STRONG SECRET', secret);
    writeConfig(config);
    console.log('   Generated new JWT secret\n');
  } else {
    console.log('   Already configured\n');
  }

  // Step 6: Initialize schema
  console.log('6. Initializing D1 schema...');
  try {
    run('npx wrangler d1 execute label-manager-db --remote --file=worker/schema.sql');
    console.log('   Schema applied\n');
  } catch (e) {
    const msg = (e.combined || e.message || '');
    if (msg.includes('already') || msg.includes('UNIQUE') || msg.includes('duplicate') || msg.includes('table') && msg.includes('exist')) {
      console.log('   Schema already applied\n');
    } else {
      console.log('   Schema note (likely already applied):', msg.split('\n').slice(-2).join('   '), '\n');
    }
  }

  // Step 7: Build frontend
  console.log('7. Building frontend...');
  try {
    run('npm run build');
    console.log('   Build complete\n');
  } catch {
    console.error('   ERROR: Build failed');
    process.exit(1);
  }

  // Step 8: Deploy
  console.log('8. Deploying to Cloudflare Workers...');
  let deployUrl;
  try {
    const output = run('npx wrangler deploy');
    const urlMatch = output.match(/(https:\/\/[^\s]+\.workers\.dev)/);
    deployUrl = urlMatch ? urlMatch[1] : null;
    console.log(`   ${deployUrl || 'Deployed'}\n`);
  } catch (e) {
    console.error('   Deploy failed:', (e.combined || e.message).split('\n').slice(-5).join('\n   '));
    process.exit(1);
  }

  // Step 9: Run setup
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

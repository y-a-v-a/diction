#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');

// Generate a secure random token
const token = crypto.randomBytes(32).toString('hex');

// Check if .env exists
let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
}

// Append CREATE_SECRET_TOKEN if not already set
if (envContent.includes('CREATE_SECRET_TOKEN=')) {
  console.log('ℹ️  CREATE_SECRET_TOKEN already exists in .env, skipping.');
} else {
  const tokenLine = `\n# Secret token for /create route access (PoC/demo protection)\nCREATE_SECRET_TOKEN=${token}\n`;
  fs.appendFileSync(envPath, tokenLine);

  const port = process.env.PORT || '3000';
  console.log('✅ Token generated and saved to .env');
  console.log(`   Create URL: http://localhost:${port}/create?token=${token}`);
  console.log('');
}

// Generate session signing secret if not already set
// Used to sign the admin session cookie issued after Google login.
envContent = fs.readFileSync(envPath, 'utf-8');
if (envContent.includes('SESSION_SECRET=')) {
  console.log('ℹ️  SESSION_SECRET already exists in .env, skipping.');
} else {
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  const sessionLine = `\n# Secret used to sign admin session cookies (Google login)\nSESSION_SECRET=${sessionSecret}\n`;
  fs.appendFileSync(envPath, sessionLine);
  console.log('✅ Session secret generated and saved to .env');
  console.log('   Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and ADMIN_EMAILS to enable admin login.');
}

console.log('');
console.log('💡 Tip: Run "npm run token:url" to see the create URL again later');

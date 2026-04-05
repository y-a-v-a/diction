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

// Generate admin secret if not already set
envContent = fs.readFileSync(envPath, 'utf-8');
if (envContent.includes('ADMIN_SECRET=')) {
  console.log('ℹ️  ADMIN_SECRET already exists in .env, skipping.');
} else {
  const adminSecret = crypto.randomBytes(16).toString('hex');
  const adminLine = `\n# Admin secret for delete access (login at /admin/login)\nADMIN_SECRET=${adminSecret}\n`;
  fs.appendFileSync(envPath, adminLine);
  console.log('✅ Admin secret generated and saved to .env');
  console.log(`   Login at /admin/login with: ${adminSecret}`);
}

console.log('');
console.log('💡 Tip: Run "npm run token:url" to see the create URL again later');

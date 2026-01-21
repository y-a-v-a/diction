#!/usr/bin/env node
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env');

// Check if .env exists
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.error('Run "npm run token:setup" to create a token first.');
  process.exit(1);
}

// Get token from environment
const token = process.env.CREATE_SECRET_TOKEN;

if (!token) {
  console.error('❌ CREATE_SECRET_TOKEN not found in .env file!');
  console.error('Run "npm run token:setup" to create a token first.');
  process.exit(1);
}

// Get PORT from environment (default to 3000)
const port = process.env.PORT || 3000;

console.log('');
console.log('🔗 Your secret create URL:');
console.log('');
console.log(`   http://localhost:${port}/create?token=${token}`);
console.log('');
console.log('💡 Bookmark this URL to access the dictation creation page');
console.log('');

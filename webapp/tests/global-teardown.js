import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDictationsDir = path.join(__dirname, '..', 'dictations-test');

export default async function globalTeardown() {
  if (fs.existsSync(testDictationsDir)) {
    fs.rmSync(testDictationsDir, { recursive: true, force: true });
  }
}

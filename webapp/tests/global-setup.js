import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures', 'dictations');
const testDictationsDir = path.join(__dirname, '..', 'dictations-test');

export default async function globalSetup() {
  // Clean slate: remove any leftover test dictations dir
  if (fs.existsSync(testDictationsDir)) {
    fs.rmSync(testDictationsDir, { recursive: true, force: true });
  }

  // Copy fixture dictations into the test dictations dir
  fs.mkdirSync(testDictationsDir, { recursive: true });

  for (const entry of fs.readdirSync(fixturesDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const src = path.join(fixturesDir, entry.name);
      const dest = path.join(testDictationsDir, entry.name);
      fs.mkdirSync(dest, { recursive: true });
      for (const file of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file));
      }
    }
  }
}

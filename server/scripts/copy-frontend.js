import { copyFileSync, cpSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const srcDir = join(root, 'dist');
const destDir = join(__dirname, 'dist', 'public');

if (existsSync(srcDir)) {
  cpSync(srcDir, destDir, { recursive: true });
  console.log(`Copied frontend build from ${srcDir} to ${destDir}`);
} else {
  console.warn('Frontend dist/ not found. Run `npm run build` from root first.');
}

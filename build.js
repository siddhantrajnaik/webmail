import { execSync } from 'child_process';
import { cpSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(import.meta.url);

console.log('Building frontend...');
execSync('npm run build', { cwd: join(__dirname, '..'), stdio: 'inherit' });

console.log('Building backend...');
execSync('npm run build', { cwd: join(__dirname, '..', 'server'), stdio: 'inherit' });

console.log('Copying frontend to server dist/public...');
const srcDir = resolve(__dirname, '..', 'dist');
const destDir = resolve(__dirname, '..', 'server', 'dist', 'public');
if (existsSync(srcDir)) {
  cpSync(srcDir, destDir, { recursive: true });
  console.log(`Copied frontend from ${srcDir} to ${destDir}`);
} else {
  console.warn('Frontend dist/ not found');
}

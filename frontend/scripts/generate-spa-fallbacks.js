import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[SPA Generator] dist/index.html does not exist!');
  process.exit(1);
}

const htmlContent = fs.readFileSync(indexPath, 'utf-8');

// List of all SPA routes that teachers or users can reload on
const routes = [
  'app',
  'login',
  'register',
  'forgot-password',
  'features',
  'how-it-works',
  'curriculum-coverage',
  'faq',
  'about',
  'contact',
  'privacy',
];

routes.forEach((route) => {
  const targetDir = path.join(distDir, route);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), htmlContent, 'utf-8');
});

// Also create 200.html and 404.html in dist root for universal static host fallbacks
fs.writeFileSync(path.join(distDir, '200.html'), htmlContent, 'utf-8');
fs.writeFileSync(path.join(distDir, '404.html'), htmlContent, 'utf-8');

console.log(`[SPA Generator] Successfully generated pre-rendered entry points for ${routes.length} SPA routes.`);


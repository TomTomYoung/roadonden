import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { foundationContent } from '../src/content/foundation.ts';
import { validateContent } from '../src/core/validation.ts';

validateContent(foundationContent);
const result = await build({ entryPoints: ['src/dev/main.ts'], bundle: true, write: false, format: 'iife', target: 'es2022', minify: false });
const template = await readFile('src/dev/index.html', 'utf8');
const css = await readFile('src/dev/style.css', 'utf8');
const script = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
await writeFile('index.html', template.replace('<!-- STYLE -->', () => `<style>${css}</style>`).replace('<!-- SCRIPT -->', () => `<script>${script}</script>`));
console.log('Built index.html: standalone, no server or external requests required.');

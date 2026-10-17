import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { foundationContent } from '../src/content/foundation.ts';
import { dinnerContent } from '../src/content/dinner.ts';
import { validateContent } from '../src/core/validation.ts';

validateContent(foundationContent); validateContent(dinnerContent);
for (const [directory, output] of [['game', 'index.html'], ['dev', 'inspector.html']]) {
  const result = await build({ entryPoints: [`src/${directory}/main.ts`], bundle: true, write: false, format: 'iife', target: 'es2022', minify: false, loader: { '.svg': 'dataurl' } });
  const template = await readFile(`src/${directory}/index.html`, 'utf8');
  const css = await readFile(`src/${directory}/style.css`, 'utf8');
  const script = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
  await writeFile(output, template.replace('<!-- STYLE -->', () => `<style>${css}</style>`).replace('<!-- SCRIPT -->', () => `<script>${script}</script>`));
  console.log(`Built ${output}: standalone, no server or external requests required.`);
}

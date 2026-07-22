import { build } from 'esbuild';

await build({
  entryPoints: ['demo/main.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'demo/bundle.js',
  platform: 'browser',
  target: ['es2022'],
});

console.log('Built demo/bundle.js');

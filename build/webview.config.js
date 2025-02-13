const esbuild = require('esbuild');
const sveltePlugin = require('esbuild-svelte');
const alias = require('esbuild-plugin-alias');
const path = require('path');
const sveltePreprocess = require('svelte-preprocess');

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('esbuild').BuildOptions} */
const config = {
  entryPoints: ['src/webview/index.ts'],
  bundle: true,
  outdir: 'out/webview',
  outbase: 'src/webview',
  entryNames: 'bundle', // This will make the output files bundle.js and bundle.css
  plugins: [
    sveltePlugin({
      compilerOptions: {
        css: 'external', // Extract CSS to separate file
      },
      preprocess: sveltePreprocess({
        typescript: {
          tsconfigFile: './src/webview/tsconfig.json',
          transpileOnly: true // Required for esbuild integration
        },
      }),
    }),
    alias({
      '@/': path.resolve(__dirname, '../src'),
    }),
  ],
  loader: {
    '.json': 'json',
  },
  sourcemap: isDev,
  minify: !isDev,
  format: 'iife',
  target: ['es2020', 'chrome91'],
  mainFields: ['svelte', 'browser', 'module', 'main'],
  conditions: ['svelte', 'browser', 'import'],
  resolveExtensions: ['.svelte', '.ts', '.js', '.json']
};

if (isDev) {
  esbuild.context(config).then((ctx) => {
    ctx.watch();
    console.log('👀 Watching webview for changes...');
  });
} else {
  esbuild.build(config).then(() => {
    console.log('🎉 Webview bundle complete!');
  });
}

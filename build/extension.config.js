const esbuild = require('esbuild');
const alias = require('esbuild-plugin-alias');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';

// Copy SQL WASM file to output directory
const copyWasmPlugin = {
  name: 'copy-wasm',
  setup(build) {
    build.onEnd(() => {
      const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
      const targetPath = path.join(__dirname, '../out/sql-wasm.wasm');
      fs.copyFileSync(wasmPath, targetPath);
      console.log('✨ Copied SQL WASM file to output directory');
    });
  },
};

/** @type {import('esbuild').BuildOptions} */
const config = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  outfile: 'out/extension.js',
  external: ['vscode'], // Only exclude vscode
  plugins: [
    alias({
      '@/': path.resolve(__dirname, '../src'),
    }),
    copyWasmPlugin,
  ],
  loader: {
    '.json': 'json',
    '.node': 'copy', // Handle native binaries
  },
  sourcemap: isDev,
  minify: !isDev,
  tsconfig: 'tsconfig.json',
  // Optimize for size
  treeShaking: true,
  // Target Node.js version that VS Code uses
  target: 'node16',
  // Ensure all dependencies are included
  metafile: true,
};

if (isDev) {
  esbuild.context(config).then((ctx) => {
    ctx.watch();
    console.log('👀 Watching extension for changes...');
  });
} else {
  esbuild.build(config).then(() => {
    console.log('🎉 Extension bundle complete!');
  });
}

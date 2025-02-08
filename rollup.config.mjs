import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import sveltePreprocess from 'svelte-preprocess';
import css from 'rollup-plugin-css-only';
import alias from '@rollup/plugin-alias';
import json from '@rollup/plugin-json';

const production = !process.env.ROLLUP_WATCH;

export default {
    input: 'src/webview/index.ts',
    output: {
        file: 'out/webview/bundle.js',
        format: 'iife',
        name: 'app'
    },
    plugins: [
        alias({
            entries: [
                { find: '@', replacement: './src' }
            ]
        }),
        svelte({
            preprocess: sveltePreprocess({
                typescript: {
                    tsconfigFile: './tsconfig.svelte.json'
                }
            }),
            compilerOptions: {
                dev: !production
            },
            emitCss: true
        }),
        css({
            output: 'bundle.css'
        }),
        resolve({
            browser: true,
            dedupe: ['svelte']
        }),
        commonjs(),
        json(),
        typescript({
            tsconfig: './tsconfig.svelte.json',
            rootDir: './src',
            sourceMap: !production
        })
    ],
    watch: {
        clearScreen: false
    }
}; 
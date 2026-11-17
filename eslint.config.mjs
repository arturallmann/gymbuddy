import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // A key after a spread ({...props} key={…}) makes Next.js compile the element with createElement,
      // and React then warns about children without keys (5.2.7). The key goes first.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXSpreadAttribute ~ JSXAttribute[name.name='key']",
          message: 'Put `key` before any {...spread}: after it, React warns about children without keys (5.2.7).',
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'android/**', 'ios/**', 'next-env.d.ts']),
]);

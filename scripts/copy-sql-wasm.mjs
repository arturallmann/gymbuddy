// Copies the SQLite WebAssembly file for the browser version of the SQLite
// plugin. Only the dev server needs it; the phone uses native SQLite.
// jeep-sqlite 2.8 bundles the sql.js 1.11.0 JavaScript, so the .wasm file must
// come from that exact version (package alias sql.js-for-jeep-sqlite).
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('public/assets', { recursive: true });
copyFileSync(
  'node_modules/sql.js-for-jeep-sqlite/dist/sql-wasm.wasm',
  'public/assets/sql-wasm.wasm',
);

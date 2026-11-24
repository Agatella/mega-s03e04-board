// Builds dist/ from app/: puts the API address, the session and the build sha in. No dependencies.
//   node scripts/build.mjs --sha <git sha> [--session-file <file>] [--api <url>]
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const sha = arg('sha', 'dev');
const api = arg('api', 'https://hq.mega.dev/challenges/show-me-when/api');
const session = process.env.SESSION ?? readFileSync(arg('session-file', `${process.env.HOME}/mega-s03e04/.log/session`), 'utf8').trim();
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
cpSync('app', 'dist', { recursive: true });
writeFileSync('dist/config.js', `export const API = ${JSON.stringify(api)};\nexport const SESSION = ${JSON.stringify(session)};\n`);
const html = readFileSync('dist/index.html', 'utf8').replaceAll('__BUILD__', sha);
writeFileSync('dist/index.html', html);
console.log(`built dist/ for ${sha}`);

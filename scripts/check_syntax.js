#!/usr/bin/env node
/* Parse every <script type="text/babel"> block in an HTML file.
 *
 * Why this exists: the app is a single HTML file edited with string surgery,
 * and a dropped semicolon inside a babel block does NOT show up as a console
 * error — the page just sits on "LOADING THE LAB…" forever. This catches it in
 * one second instead of a browser round trip.
 *
 * Usage:  node scripts/check_syntax.js [index.html ...]
 * Needs:  @babel/standalone. BABEL_STANDALONE overrides; otherwise the
 *         committed copy in scripts/vendor/ is used, then node_modules.
 *         Exit 0 clean, 1 on any parse error.
 */
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const ROOT = path.dirname(HERE);
const files = process.argv.slice(2);
if (!files.length) files.push(path.join(ROOT, 'index.html'));

let Babel;
const candidates = [
  process.env.BABEL_STANDALONE,
  // Committed at the same version the HTML loads from unpkg, so the gate
  // runs offline and on a machine that has never run npm install.
  path.join(ROOT, 'scripts', 'vendor', 'babel.min.js'),
  path.join(ROOT, 'node_modules', '@babel', 'standalone'),
].filter(Boolean);
for (const c of candidates) {
  try { Babel = require(c); break; } catch (e) { /* try the next one */ }
}
if (!Babel) {
  console.error('FATAL: @babel/standalone not found.');
  console.error('Expected scripts/vendor/babel.min.js; set BABEL_STANDALONE to override.');
  process.exit(2);
}

let bad = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const blocks = html.match(/<script type="text\/babel"[^>]*>[\s\S]*?<\/script>/g) || [];
  // Line offset of each block, so a reported error points at the real file line.
  let searchFrom = 0;
  blocks.forEach((block, i) => {
    const at = html.indexOf(block, searchFrom);
    searchFrom = at + block.length;
    const lineOffset = html.slice(0, at).split('\n').length - 1;
    const code = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    try {
      Babel.transform(code, { presets: ['react'], filename: f });
      console.log(`  ok    ${path.basename(f)} block ${i}  (${code.length} chars)`);
    } catch (e) {
      const m = /\((\d+):(\d+)\)/.exec(e.message || '');
      const where = m ? `${path.basename(f)}:${lineOffset + Number(m[1])}` : path.basename(f);
      console.log(`  FAIL  ${where}  ${String(e.message).split('\n')[0]}`);
      bad++;
    }
  });
}
console.log(bad ? `\n${bad} block(s) failed to parse` : '\nAll babel blocks parse.');
process.exit(bad ? 1 : 0);

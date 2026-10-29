#!/usr/bin/env node
/* Parse every <script type="text/babel"> block in an HTML file.
 *
 * Handles both inline blocks and external src="..." references (so the
 * post-extraction layout, where the babel source lives in js/*.jsx, is
 * still gated). Exit 0 clean, 1 on any parse error.
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
  path.join(ROOT, 'scripts', 'vendor', 'babel.min.js'),
  path.join(ROOT, 'node_modules', '@babel', 'standalone'),
].filter(Boolean);
for (const c of candidates) {
  try { Babel = require(c); break; } catch (e) { /* try the next one */ }
}
if (!Babel) {
  console.error('FATAL: @babel/standalone not found.');
  process.exit(2);
}

let bad = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const blocks = html.match(/<script type="text\/babel"[^>]*>[\s\S]*?<\/script>/g) || [];
  const dir = path.dirname(path.resolve(f));
  let searchFrom = 0;
  blocks.forEach((block, i) => {
    const at = html.indexOf(block, searchFrom);
    searchFrom = at + block.length;
    const lineOffset = html.slice(0, at).split('\n').length - 1;
    const srcMatch = /src="([^"]+)"/.exec(block);
    let code = '';
    let label = `${path.basename(f)} block ${i}`;
    if (srcMatch) {
      const srcPath = path.resolve(dir, srcMatch[1].split('?')[0]);
      try { code = fs.readFileSync(srcPath, 'utf8'); label = path.basename(srcPath); }
      catch (e) { console.log(`  FAIL  ${label}  cannot read ${srcPath}: ${e.message}`); bad++; return; }
    } else {
      code = block.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    }
    try {
      Babel.transform(code, { presets: ['react'], filename: srcMatch ? path.resolve(dir, srcMatch[1].split('?')[0]) : f });
      console.log(`  ok    ${label}  (${code.length} chars)`);
    } catch (e) {
      const m = /\((\d+):(\d+)\)/.exec(e.message || '');
      const where = m ? `${label}:${m[1]}` : label;
      console.log(`  FAIL  ${where}  ${String(e.message).split('\n')[0]}`);
      bad++;
    }
  });
}
console.log(bad ? `\n${bad} block(s) failed to parse` : '\nAll babel blocks parse.');
process.exit(bad ? 1 : 0);

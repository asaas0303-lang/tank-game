// index.html ichidagi <script> bloklarini sintaksis bo'yicha tekshiradi (node --check).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g;
let m;
let n = 0;
let failed = false;
while ((m = re.exec(html))) {
  const attrs = m[1] || '';
  if (/\ssrc=/.test(attrs) || !m[2].trim()) continue;
  const isModule = /type="module"/.test(attrs);
  const file = path.join(os.tmpdir(), `tank-script-${n++}${isModule ? '.mjs' : '.js'}`);
  fs.writeFileSync(file, m[2]);
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (e) {
    failed = true;
    console.error(String(e.stderr));
  }
}
console.log(`${n} ta script tekshirildi`);
process.exit(failed ? 1 : 0);

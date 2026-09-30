// 把課文點讀資料（data/reading/lessonXX.js，不進 repo）用「教室密碼」加密成 data/reading.enc.js（進 repo、放上網站）。
// 用法：node tools/encrypt_readings.mjs
//   執行後會請你輸入兩次教室密碼（畫面不顯示）。密碼不會存在任何檔案裡。
//   課文有改（重新跑過 make_reader.py）之後，要再跑一次這個程式。
// 加密方式：PBKDF2-SHA256 導出金鑰 → AES-256-GCM；網頁用瀏覽器內建的 WebCrypto 解密。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { pbkdf2Sync, randomBytes, createCipheriv } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'data', 'reading');
const OUT = join(ROOT, 'data', 'reading.enc.js');
const ITER = 250000;

function loadReadings() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  const files = readdirSync(SRC).filter((f) => /^lesson\d+\.js$/.test(f)).sort();
  if (!files.length) throw new Error('找不到 data/reading/lessonXX.js，請先執行 tools/make_reader.py 產生點讀資料。');
  for (const f of files) vm.runInContext(readFileSync(join(SRC, f), 'utf8'), ctx, { filename: f });
  return ctx.window.READINGS || {};
}

function askHidden(prompt) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(prompt);
    let buf = '';
    stdin.setRawMode && stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (ch) => {
      for (const c of ch) {
        if (c === '\r' || c === '\n') {
          stdin.setRawMode && stdin.setRawMode(false);
          stdin.pause(); stdin.removeListener('data', onData);
          process.stdout.write('\n');
          return resolve(buf);
        }
        if (c === '\u0003') { process.stdout.write('\n已取消。\n'); process.exit(1); }
        if (c === '\u0008' || c === '\u007f') { if (buf.length) { buf = buf.slice(0, -1); process.stdout.write('\b \b'); } continue; }
        buf += c; process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}

const readings = loadReadings();
const lessons = Object.keys(readings).sort();
console.log('要加密的課文：第 ' + lessons.map((l) => parseInt(l, 10)).join('、') + ' 課');

let pw = process.env.CLASS_PASSWORD || '';
if (!pw) {
  pw = await askHidden('請輸入教室密碼：');
  const again = await askHidden('請再輸入一次：');
  if (pw !== again) { console.error('兩次密碼不一樣，沒有產生檔案。'); process.exit(1); }
}
pw = pw.trim();
if (pw.length < 4) { console.error('密碼太短（至少 4 個字元），沒有產生檔案。'); process.exit(1); }

const salt = randomBytes(16), iv = randomBytes(12);
const key = pbkdf2Sync(Buffer.from(pw, 'utf8'), salt, ITER, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const plain = Buffer.from(JSON.stringify(readings), 'utf8');
const data = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]); // WebCrypto 要把驗證碼接在最後

const out = {
  v: 1, lessons, iter: ITER,
  salt: salt.toString('base64'), iv: iv.toString('base64'), data: data.toString('base64')
};
writeFileSync(OUT, '/* 課文點讀資料（已用教室密碼加密；由 tools/encrypt_readings.mjs 產生，不要手動修改） */\n' +
  'window.READINGS_ENC = ' + JSON.stringify(out) + ';\n', 'utf8');
console.log('完成：' + OUT.replace(ROOT, '.') + '（' + Math.round(data.length / 1024) + ' KB）');

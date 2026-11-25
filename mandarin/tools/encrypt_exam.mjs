// 把出卷題庫（data/exam_plain.js，不進 repo）用「出卷密碼」加密成 data/exam.enc.js（進 repo、放上網站）。
// 用法：node mandarin/tools/encrypt_exam.mjs
//   會請你輸入兩次出卷密碼（畫面不顯示）。密碼不會存在任何檔案裡。
//   出卷密碼只有老師知道，不要和學生用的教室密碼一樣（學生 iPad 有教室密碼，出卷密碼不同才看不到考題）。
//   題庫有改（tools/exam/bank.json → python tools/build_exam.py）之後，要再跑一次這個程式。
// 加密方式和課文一樣：PBKDF2-SHA256 導出金鑰 → AES-256-GCM；網頁用瀏覽器內建的 WebCrypto 解密。
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { pbkdf2Sync, randomBytes, createCipheriv } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'data', 'exam_plain.js');
const OUT = join(ROOT, 'data', 'exam.enc.js');
const ITER = 250000;

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

let src;
try { src = readFileSync(SRC, 'utf8'); } catch (e) { console.error('找不到 data/exam_plain.js，請先執行 python mandarin/tools/build_exam.py'); process.exit(1); }
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(src, ctx);
const bank = ctx.window.EXAM_BANK || {};
console.log('要加密的題庫：第 ' + Object.keys(bank).sort().map((l) => parseInt(l, 10)).join('、') + ' 課');

let pw = process.env.EXAM_PASSWORD || '';
if (!pw) {
  pw = await askHidden('請輸入出卷密碼：');
  const again = await askHidden('請再輸入一次：');
  if (pw !== again) { console.error('兩次密碼不一樣，沒有產生檔案。'); process.exit(1); }
}
pw = pw.trim();
if (pw.length < 4) { console.error('密碼太短（至少 4 個字元），沒有產生檔案。'); process.exit(1); }

const salt = randomBytes(16), iv = randomBytes(12);
const key = pbkdf2Sync(Buffer.from(pw, 'utf8'), salt, ITER, 32, 'sha256');
const cipher = createCipheriv('aes-256-gcm', key, iv);
const data = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(bank), 'utf8')), cipher.final(), cipher.getAuthTag()]);
const out = { v: 1, iter: ITER, salt: salt.toString('base64'), iv: iv.toString('base64'), data: data.toString('base64') };
writeFileSync(OUT, '/* 出卷題庫（已用出卷密碼加密；由 tools/encrypt_exam.mjs 產生，不要手動修改） */\n' +
  'window.EXAM_ENC = ' + JSON.stringify(out) + ';\n', 'utf8');
console.log('完成：data/exam.enc.js（' + Math.round(data.length / 1024) + ' KB）');

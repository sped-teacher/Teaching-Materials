// 把範本（格線已統一的字詞單）換成新一課的課名、生字列、彩色生字圖
// 用法：node fill_template.js <已解壓的範本資料夾> <課號數字> <課名> <生字串> <生字圖資料夾> <圖檔前綴(課次 L01)>
// （通常由 build_docx.ps1 呼叫，不必直接執行）
const fs = require("fs"), path = require("path");
const [out, num, title, chars, imgDir, prefix] = process.argv.slice(2);
const CN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四"];


const docP = path.join(out, "word/document.xml"), relP = path.join(out, "word/_rels/document.xml.rels");
let x = fs.readFileSync(docP, "utf8"), rels = fs.readFileSync(relP, "utf8");

// 1. 找出每格生字圖（出現 2 次的圖檔，依出現順序）
const map = {};
for (const m of rels.matchAll(/Id="(rId\d+)"[^>]*Target="([^"]+)"/g)) map[m[1]] = m[2];
const refs = [...x.matchAll(/r:(?:embed|id)="(rId\d+)"/g)].map(m => m[1]).filter(r => /^media\//.test(map[r] || ""));
const cnt = {}; refs.forEach(r => cnt[map[r]] = (cnt[map[r]] || 0) + 1);
const slots = [...new Set(refs.map(r => map[r]))].filter(t => cnt[t] === 2);
const list = [...chars];
if (list.length > slots.length) throw new Error(`生字 ${list.length} 個，範本只有 ${slots.length} 格`);


const BLANK = fs.readFileSync(path.join(__dirname, "..", "assets", "blank.png")); // 白色空白圖
slots.forEach((t, i) => {
  const newT = `media/c${String(i + 1).padStart(2, "0")}.png`;
  let buf = BLANK;
  if (i < list.length) {
    const f = path.join(imgDir, `${prefix}_${String(i + 1).padStart(2, "0")}_${list[i]}.png`);
    if (!fs.existsSync(f)) throw new Error("缺圖 " + f);
    buf = fs.readFileSync(f);
  }
  fs.rmSync(path.join(out, "word", t), { force: true });
  fs.writeFileSync(path.join(out, "word", newT), buf);
  rels = rels.replace(new RegExp(`(Target=")${t.replace(/[.]/g, "\\.")}(")`, "g"), `$1${newT}$2`);
});

// 2. 標題欄：課名、生字列
const txt = (s) => (s.match(/<w:t(?: [^>]*)?>[^<]*/g) || []).map(z => z.replace(/<[^>]*>/, "")).join("");
const runs = (c) => c.match(/<w:r(?: [^>]*)?>(?:(?!<\/w:r>).)*<\/w:r>/gs) || [];
let titles = 0;
x = x.replace(/<w:tr(?=[ >])[^>]*>.*?<\/w:tr>/gs, (tr) => {
  const tcs = tr.match(/<w:tc>.*?<\/w:tc>/gs) || [];
  if (tcs.length !== 3 || !txt(tcs[0]).startsWith("字詞")) return tr;
  titles++;
  // 課名格：保留「字詞」那個 run，其餘換成一個 run
  const r1 = runs(tcs[0]);
  const keep = r1[0], sample = r1[1];
  const rPr = (sample.match(/<w:rPr>.*?<\/w:rPr>/s) || [""])[0];
  let c1 = tcs[0];
  r1.slice(1).forEach(r => { c1 = c1.replace(r, ""); });
  c1 = c1.replace(keep, keep + `<w:r>${rPr}<w:t xml:space="preserve">【第${CN[+num]}課 ${title}】</w:t></w:r>`);
  // 生字列
  const r3 = runs(tcs[2]);
  const rPr3 = (r3[0].match(/<w:rPr>.*?<\/w:rPr>/s) || [""])[0];
  let c3 = tcs[2];
  r3.forEach((r, i) => { c3 = c3.replace(r, i === 0 ? `<w:r>${rPr3}<w:t>${chars}</w:t></w:r>` : ""); });
  return tr.replace(tcs[0], c1).replace(tcs[2], c3);
});
fs.writeFileSync(docP, x);
fs.writeFileSync(relP, rels);
console.log(`L${num} ${title} 生字${list.length} 格${slots.length} 標題${titles}`);

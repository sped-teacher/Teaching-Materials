// 取得某學年、版本、年級學期的各課生字與課名，輸出 lessons.tsv（課次<TAB>課名<TAB>生字）
// 用法：node fetch_lessons.js <學年> <版本> <年級學期> <輸出.tsv>
// 例：  node fetch_lessons.js 114 康軒 5下 lessons.tsv
// 生字：雄筆順網站 gsyan888.blogspot.com/p/stroke.html 的 wordsLines
// 課名：教育百科生字詞彙表 pedia.cloud.edu.tw
const fs = require("fs");
const [year, press, gs, out] = process.argv.slice(2);
if (!out) { console.error("用法：node fetch_lessons.js 114 康軒 5下 lessons.tsv"); process.exit(1); }
const grade = gs.replace(/[上下]/, ""), sem = gs.endsWith("上") ? 1 : 2;
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12, 十三: 13, 十四: 14, 十五: 15, 十六: 16 };

(async () => {
  const blog = await (await fetch("https://gsyan888.blogspot.com/p/stroke.html")).text();
  const re = new RegExp(`^${year}#${press}#${gs}#L(\\d+)\\t(.+)$`, "gm");
  const chars = {};
  for (const m of blog.matchAll(re)) chars[+m[1]] = m[2].trim();
  if (!Object.keys(chars).length) {
    const have = [...new Set([...blog.matchAll(/^(\d+)#([^#]+)#([^#]+)#/gm)].map(m => `${m[1]} ${m[2]} ${m[3]}`))];
    console.error(`雄筆順網站找不到 ${year} ${press} ${gs}。網站現有：\n` + have.filter(h => h.includes(press)).join("\n"));
    process.exit(2);
  }

  const url = `https://pedia.cloud.edu.tw/Bookmark/Textword?category=${encodeURIComponent("國語")}&year=${year}_${sem}&degree=${grade}&press=${encodeURIComponent(press + "版")}`;
  const titles = {};
  try {
    const html = await (await fetch(url)).text();
    for (const m of html.matchAll(/第([一二三四五六七八九十]+)課：([^<(（"]+?)(?=<|\(另開新視窗|")/g)) {
      const n = CN[m[1]]; if (n && !titles[n]) titles[n] = m[2].trim();
    }
  } catch (e) { console.error("教育百科讀取失敗：" + e.message); }

  const rows = Object.keys(chars).map(Number).sort((a, b) => a - b).map(n => {
    const L = "L" + String(n).padStart(2, "0");
    return [L, titles[n] || "", chars[n]].join("\t");
  });
  fs.writeFileSync(out, rows.join("\n") + "\n");
  for (const r of rows) { const [L, t, c] = r.split("\t"); console.log(`${L} ${t || "（缺課名）"} ${[...c].length}字 ${c}`); }
  console.log("教育百科：" + url);
})();

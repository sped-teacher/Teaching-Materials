// 用 Edge headless 開雄筆順網站，擷取每個生字的「部件顏色」圖（含白底格線）
// 用法：node capture_chars.js <lessons.tsv> <圖片資料夾>   （lessons.tsv 每行：課次<TAB>課名<TAB>生字）
// 已存在的圖會略過，可重跑補抓失敗的字
const fs = require("fs"), path = require("path"), { spawn } = require("child_process");
const OUT = path.resolve(process.argv[3] || "chars");
fs.mkdirSync(OUT, { recursive: true });
const lessons = fs.readFileSync(process.argv[2], "utf8").trim().split(/\r?\n/).map(l => { const c = l.split("\t"); return [c[0], c[c.length - 1].trim()]; });
// 可只抓指定課次：node capture_chars.js lessons.tsv chars L03 L07
const only = process.argv.slice(4);
if (only.length) lessons.splice(0, lessons.length, ...lessons.filter(([L]) => only.includes(L)));
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PAGE_JS = `
window.__cap = async function(ch){
  const base='https://gsyan888.github.io/html5_fun/html5_stroke_parts/html5_stroke_parts.html?words=';
  document.querySelectorAll('iframe.__cap').forEach(f=>f.remove());
  const f=document.createElement('iframe'); f.className='__cap';
  f.style.cssText='position:fixed;left:0;top:0;width:665px;height:694px;z-index:99999;border:0;background:#fff';
  f.src=base+encodeURIComponent(ch); document.body.appendChild(f);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  await new Promise(r=>f.onload=r);
  let btn=null; for(let i=0;i<75 && !btn;i++){ await sleep(200); btn=[...f.contentDocument.querySelectorAll('*')].find(e=>e.childElementCount==0 && e.textContent.trim()=='開始下載' && e.getBoundingClientRect().width>0); }
  if(!btn) return {err:'nobtn'};
  const r=btn.getBoundingClientRect(); const o={bubbles:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2};
  for(const t of ['pointerdown','mousedown','pointerup','mouseup','click']) btn.dispatchEvent(new (t.startsWith('pointer')?PointerEvent:MouseEvent)(t,o));
  let prev=-1, stable=0, cs;
  for(let i=0;i<120;i++){ await sleep(300); cs=[...f.contentDocument.querySelectorAll('canvas')]; if(cs.length<3) continue;
    const d=cs[2].getContext('2d').getImageData(0,0,cs[2].width,cs[2].height).data; let n=0; for(let k=3;k<d.length;k+=64) if(d[k]>0) n++;
    if(n>0 && n==prev){ if(++stable>=4) break; } else stable=0; prev=n; }
  if(prev<=0) return {err:'nodraw'};
  const bg=cs[1], fg=cs[2], W=bg.width, H=bg.height;
  const d=bg.getContext('2d').getImageData(0,0,W,H).data;
  let x0=W,y0=H,x1=0,y1=0;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){const k=(y*W+x)*4; if(d[k+3]>200&&d[k]>240&&d[k+1]>240&&d[k+2]>240){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }}
  const w=x1-x0+1,h=y1-y0+1; const oc=document.createElement('canvas'); oc.width=w; oc.height=h; const c=oc.getContext('2d');
  c.drawImage(bg,x0,y0,w,h,0,0,w,h); c.drawImage(fg,x0,y0,w,h,0,0,w,h);
  return {data:oc.toDataURL('image/png'), w, h};
};`;

(async () => {
  const prof = path.join(require("os").tmpdir(), "word-list-edgeprof");
  const edge = spawn(EDGE, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, "--window-size=900,900", "--no-first-run", "about:blank"], { stdio: "ignore" });
  let targets;
  for (let i = 0; i < 50; i++) { await sleep(300); try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.some(t => t.type === "page")) break; } catch {} }
  const page = targets.find(t => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pending = {};
  ws.onmessage = (m) => { const j = JSON.parse(m.data); if (j.id && pending[j.id]) { pending[j.id](j); delete pending[j.id]; } };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };

  await send("Page.enable");
  await send("Page.navigate", { url: "https://gsyan888.github.io/html5_fun/html5_stroke_parts/html5_stroke_parts.html" });
  await sleep(4000);
  await evalJs(PAGE_JS);
  const fails = [];
  for (const [les, chars] of lessons) {
    let i = 0;
    for (const ch of [...chars]) {
      i++;
      const name = `${les}_${String(i).padStart(2, "0")}_${ch}`;
      if (fs.existsSync(path.join(OUT, name + ".png"))) continue;
      let res;
      for (let t = 0; t < 2; t++) { res = await evalJs(`window.__cap(${JSON.stringify(ch)})`); if (res && res.data) break; }
      if (!res || !res.data) { fails.push(name + ":" + (res && res.err)); console.log("FAIL", name, res && res.err); continue; }
      fs.writeFileSync(path.join(OUT, name + ".png"), Buffer.from(res.data.split(",")[1], "base64"));
      console.log("ok", name, res.w + "x" + res.h);
    }
  }
  console.log("DONE fails=" + fails.length, fails.join(" "));
  ws.close(); edge.kill();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });

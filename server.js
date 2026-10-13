// Scoreboard لـ TikTok LIVE Studio — بدون أي مكتبات خارجية
// التشغيل:  node server.js
const http = require('http');
const PORT = 3000;

let state = {
  a: { name: 'الأحمر', color: '#d0202e', score: 0 },
  b: { name: 'الأزرق', color: '#1538d8', score: 0 },
};
const clients = new Set();
const push = () => clients.forEach(r => r.write(`data: ${JSON.stringify(state)}\n\n`));

const OVERLAY = `<!doctype html><html lang="ar"><head><meta charset="utf-8">
<title>Overlay</title>
<style>
  html,body{margin:0;background:transparent;overflow:hidden}
  #bar{display:flex;align-items:stretch;width:640px;height:64px;margin:8px;
       font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#fff;border-radius:12px;
       overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,.45)}
  .team{flex:1;display:flex;align-items:center;justify-content:center;gap:10px;
        font-size:26px;font-weight:700;padding:0 12px;white-space:nowrap;overflow:hidden}
  .dot{width:12px;height:12px;border-radius:50%;background:#ffd400;flex:none}
  #mid{display:flex;align-items:center;justify-content:center;gap:14px;min-width:150px;
       background:#111;font-size:38px;font-weight:800;direction:ltr;padding:0 18px}
  #mid span{display:inline-block;min-width:26px;text-align:center}
  .pop{animation:pop .5s}
  @keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.6);color:#ffd400}100%{transform:scale(1)}}
</style></head><body>
<div id="bar">
  <div class="team" id="ta"><i class="dot"></i><b id="na"></b></div>
  <div id="mid"><span id="sa">0</span><span>-</span><span id="sb">0</span></div>
  <div class="team" id="tb"><b id="nb"></b><i class="dot"></i></div>
</div>
<script>
  let prev={a:0,b:0};
  function bump(el){el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop')}
  function render(s){
    for(const k of ['a','b']){
      document.getElementById('n'+k).textContent=s[k].name;
      document.getElementById('t'+k).style.background=s[k].color;
      const el=document.getElementById('s'+k);
      el.textContent=s[k].score;
      if(s[k].score!==prev[k]) bump(el);
      prev[k]=s[k].score;
    }
  }
  const es=new EventSource('/events');
  es.onmessage=e=>render(JSON.parse(e.data));
</script></body></html>`;

const CONTROL = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>لوحة التحكم</title>
<style>
  :root{color-scheme:light dark}
  body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;max-width:560px;margin:20px auto;padding:0 14px}
  h1{font-size:20px}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .card{border:1px solid #8884;border-radius:12px;padding:14px;text-align:center}
  .score{font-size:64px;font-weight:800;line-height:1.1}
  input[type=text]{width:100%;box-sizing:border-box;padding:8px;font-size:16px;margin-bottom:8px}
  input[type=color]{width:100%;height:36px;border:0;padding:0;margin-bottom:8px}
  button{font-size:22px;padding:10px 0;width:48%;border-radius:8px;border:1px solid #8886;cursor:pointer}
  .full{width:100%;margin-top:12px;font-size:16px}
  small{opacity:.7;display:block;margin-top:14px;line-height:1.7}
</style></head><body>
<h1>⚽ لوحة التحكم في النتيجة</h1>
<div class="row" id="row"></div>
<button class="full" onclick="swap()">🔄 تبديل الفريقين</button>
<button class="full" onclick="resetAll()">♻️ تصفير النتيجة</button>
<small>اختصارات: ‎Q / A ‎= فريق 1 (+/−) ، ‎P / L ‎= فريق 2 (+/−)<br>
رابط العرض لـ TikTok: <b id="link"></b></small>
<script>
  let S=null, ready=false;
  const send=()=>fetch('/state',{method:'POST',body:JSON.stringify(S)});
  function build(){
    row.innerHTML='';
    for(const k of ['a','b']){
      const d=document.createElement('div');d.className='card';
      d.innerHTML=\`<input type="text" value="\${S[k].name}" oninput="S.\${k}.name=this.value;send()">
      <input type="color" value="\${S[k].color}" oninput="S.\${k}.color=this.value;send()">
      <div class="score" id="sc\${k}">\${S[k].score}</div>
      <button onclick="add('\${k}',1)">+</button> <button onclick="add('\${k}',-1)">−</button>\`;
      row.appendChild(d);
    }
  }
  function add(k,n){S[k].score=Math.max(0,S[k].score+n);document.getElementById('sc'+k).textContent=S[k].score;send()}
  function swap(){[S.a,S.b]=[S.b,S.a];build();send()}
  function resetAll(){S.a.score=S.b.score=0;build();send()}
  document.addEventListener('keydown',e=>{
    if(e.target.tagName==='INPUT'&&e.target.type==='text')return;
    const m={q:['a',1],a:['a',-1],p:['b',1],l:['b',-1]}[e.key.toLowerCase()];
    if(m&&S)add(...m);
  });
  link.textContent=location.origin+'/overlay';
  const es=new EventSource('/events');
  es.onmessage=e=>{S=JSON.parse(e.data);if(!ready){build();ready=true}else{
    for(const k of ['a','b'])document.getElementById('sc'+k).textContent=S[k].score}};
</script></body></html>`;

http.createServer((req, res) => {
  if (req.url === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(state)}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
  } else if (req.url === '/state' && req.method === 'POST') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try { state = JSON.parse(body); push(); } catch (e) {}
      res.end('ok');
    });
  } else if (req.url === '/overlay') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(OVERLAY);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(CONTROL);
  }
}).listen(PORT, () => {
  console.log(`لوحة التحكم : http://localhost:${PORT}/`);
  console.log(`رابط العرض  : http://localhost:${PORT}/overlay`);
});

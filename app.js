const SECS = { events: 'Eventos', limited: 'Limited', categories: 'Categorias' };
const NAV = [['home','Home'],['search','Search'],['events','Eventos'],['limited','Limited'],['categories','Categorias'],['credits','Credits']];
let db = { events: [], limited: [], categories: [] }, tok = sessionStorage.getItem('lt') || '', route = 'home', cur = null;
const $ = s => document.querySelector(s), admin = () => !!tok;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const getCookie = n => (document.cookie.match('(?:^|; )' + n + '=([^;]*)') || [])[1];
const setCookie = (n, v) => document.cookie = `${n}=${v};max-age=31536000;path=/;SameSite=Lax`;
const consent = () => getCookie('lunex_consent') === '1';

// Imagem -> dataURL reduzida
const readImg = f => new Promise(r => {
  if (!f || !f.size) return r('');
  const fr = new FileReader(), i = new Image();
  fr.onload = () => { i.onload = () => { const k = Math.min(1, 900 / i.width), c = document.createElement('canvas');
    c.width = i.width * k; c.height = i.height * k; c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); r(c.toDataURL('image/jpeg', .72)); }; i.src = fr.result; };
  fr.readAsDataURL(f);
});

// Persistência: servidor (Netlify Blobs) + cópia local
async function load() {
  try { const r = await fetch('/api/data'); if (r.ok) { const d = await r.json(); if (d.events) { db = { events: [], limited: [], categories: [], ...d }; return; } } } catch {}
  try { db = { ...db, ...JSON.parse(localStorage.getItem('lunex_db') || '{}') }; } catch {}
}
async function save() {
  try { localStorage.setItem('lunex_db', JSON.stringify(db)); } catch { alert('Armazenamento local cheio.'); }
  try {
    const r = await fetch('/api/data', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify(db) });
    if (r.status === 401) { logout(); alert('Sessão de admin expirada.'); }
  } catch {}
}

// Navegação
function go(r, c = null) { route = r; cur = c; if (consent()) setCookie('lunex_last', r); render(); scrollTo({ top: 0, behavior: 'smooth' }); }
function render() {
  $('#nav').innerHTML = NAV.map(([k, n]) => `<button class="${k === route ? 'on' : ''}" data-act="nav" data-k="${k}">${n}</button>`).join('');
  $('#adminBtn').textContent = admin() ? 'Sair (admin)' : 'Admin';
  const v = $('#view'); v.style.animation = 'none'; v.offsetWidth; v.style.animation = '';
  v.innerHTML = route === 'home' ? home() : route === 'search' ? search() : route === 'credits' ? credits() : cur ? detail() : section();
  if (route === 'search') $('#q').focus();
}
const home = () => `<section class="hero"><h1>Bem-vindo à Lunex Wiki</h1><p>Explore eventos, itens limitados e categorias. Use a busca para achar qualquer aba rapidamente.</p>
<button class="btn" data-act="nav" data-k="search">🔍 Buscar</button></section>
<div class="grid">${Object.keys(SECS).map((k, i) => `<div class="card" style="animation-delay:${i * .1}s" data-act="nav" data-k="${k}"><div class="cin"><div><h3>${SECS[k]}</h3><p>${db[k].length} item(ns)</p></div></div></div>`).join('')}</div>`;
const credits = () => `<h2>Credits</h2><div class="panel fade"><div>Lunex Wiki — criada pela equipe Lunex.\nFeita com HTML, CSS, JavaScript e Netlify Functions (Node.js).\nObrigado por visitar! 🌙</div></div>`;

const card = (t, it, i) => `<article class="card" style="animation-delay:${i * .06}s" data-act="open" data-t="${t}" data-id="${it.id}"><div class="bg" style="background-image:url('${it.bg || ''}')"></div>
<div class="cin">${it.img ? `<img src="${it.img}" alt="">` : ''}<div><h3>${esc(it.title)}</h3><p>${esc(it.text).slice(0, 110)}</p></div></div>
${admin() ? `<button class="del" title="Apagar" data-act="del" data-t="${t}" data-id="${it.id}">✕</button>` : ''}</article>`;
const addForm = (t) => `<form class="add" data-form="item" data-t="${t}"><b>➕ Adicionar em ${SECS[t]}</b>
<input name="title" placeholder="Nome da categoria" required><textarea name="text" rows="3" placeholder="Texto"></textarea>
<label>Imagem de fundo (ficará levemente distorcida)</label><input type="file" name="bg" accept="image/*">
<label>Imagem na frente do texto</label><input type="file" name="img" accept="image/*"><div class="row"><button class="btn">Adicionar</button></div></form>`;
const section = () => `<h2>${SECS[route]}</h2>${admin() ? addForm(route) : ''}<div class="grid">${db[route].map((it, i) => card(route, it, i)).join('') || ''}</div>${db[route].length ? '' : '<p class="empty">Nada por aqui ainda.</p>'}`;

function detail() {
  const it = db[cur.t].find(x => x.id === cur.id); if (!it) { cur = null; return section(); }
  const tabs = it.tabs || [], sel = tabs.find(x => x.id === cur.tab) || tabs[0];
  return `<button class="back" data-act="back">← Voltar</button>
<div class="hero2"><div class="bg" style="background-image:url('${it.bg || ''}')"></div><div class="card" style="cursor:default;border:0;background:none;min-height:0"><div class="cin">${it.img ? `<img src="${it.img}" alt="">` : ''}<div><h1>${esc(it.title)}</h1><p style="white-space:pre-wrap">${esc(it.text)}</p></div></div></div></div>
<div class="subtabs">${tabs.map(x => `<span><button class="t ${sel && x.id === sel.id ? 'on' : ''}" data-act="tab" data-id="${x.id}">${esc(x.title)}</button>${admin() ? `<button class="x" data-act="deltab" data-id="${x.id}">✕</button>` : ''}</span>`).join('')}</div>
${sel ? `<div class="panel">${sel.img ? `<img class="tabimg" src="${sel.img}" alt="">` : ''}<div>${esc(sel.text)}</div></div>` : '<p class="empty">Sem abas aqui ainda.</p>'}
${admin() ? `<form class="add" style="margin-top:18px" data-form="tab"><b>➕ Nova aba nesta categoria</b><input name="title" placeholder="Título da aba" required><textarea name="text" rows="3" placeholder="Texto"></textarea><label>Imagem na frente da mensagem</label><input type="file" name="img" accept="image/*"><div class="row"><button class="btn">Adicionar aba</button></div></form>` : ''}`;
}

// Busca com nomes iguais ou parecidos
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)); return d[a.length][b.length]; }
function score(q, name) {
  const n = norm(name); if (!q) return 0; if (n === q) return 100; if (n.startsWith(q)) return 80; if (n.includes(q)) return 60;
  const tol = Math.max(1, Math.floor(q.length / 3));
  const best = Math.min(lev(q, n), ...n.split(/\s+/).map(w => lev(q, w)));
  return best <= tol ? 40 - best : 0;
}
function results(q) {
  q = norm(q); const all = NAV.map(([k, n]) => ({ n, sub: 'Aba principal', go: () => go(k) }));
  for (const t in SECS) for (const it of db[t]) { all.push({ n: it.title, sub: SECS[t], go: () => go(t, { t, id: it.id }) });
    for (const x of it.tabs || []) all.push({ n: x.title, sub: `${SECS[t]} › ${it.title}`, go: () => go(t, { t, id: it.id, tab: x.id }) }); }
  return all.map(r => ({ ...r, s: score(q, r.n) })).filter(r => r.s > 0).sort((a, b) => b.s - a.s).slice(0, 20);
}
let found = [];
const search = () => `<h2>Search</h2><input id="q" placeholder="Digite o nome de uma aba…" autocomplete="off"><div id="res" style="margin-top:16px"></div>`;
function showRes() { const q = $('#q').value; found = results(q);
  $('#res').innerHTML = !q.trim() ? '' : found.length ? found.map((r, i) => `<div class="sr" style="animation-delay:${i * .04}s" data-act="sr" data-i="${i}"><span>${esc(r.n)}</span><small>${esc(r.sub)}</small></div>`).join('') : '<p class="empty">Nenhum resultado parecido.</p>'; }

// Eventos
document.addEventListener('input', e => { if (e.target.id === 'q') showRes(); });
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]'); if (!b) return; const d = b.dataset;
  if (d.act === 'nav') go(d.k);
  else if (d.act === 'open') go(route, { t: d.t, id: d.id });
  else if (d.act === 'back') go(route);
  else if (d.act === 'tab') { cur.tab = d.id; render(); }
  else if (d.act === 'sr') found[+d.i].go();
  else if (d.act === 'del' && admin() && confirm('Apagar este item?')) { db[d.t] = db[d.t].filter(x => x.id !== d.id); await save(); render(); }
  else if (d.act === 'deltab' && admin() && confirm('Apagar esta aba?')) { const it = db[cur.t].find(x => x.id === cur.id); it.tabs = it.tabs.filter(x => x.id !== d.id); cur.tab = null; await save(); render(); }
});
document.addEventListener('submit', async e => {
  const f = e.target; if (!f.dataset.form || !admin()) return; e.preventDefault(); const fd = new FormData(f);
  const base = { id: uid(), title: fd.get('title').trim(), text: fd.get('text'), img: await readImg(fd.get('img')) };
  if (f.dataset.form === 'item') db[f.dataset.t].push({ ...base, bg: await readImg(fd.get('bg')), tabs: [] });
  else { const it = db[cur.t].find(x => x.id === cur.id); (it.tabs ||= []).push(base); cur.tab = base.id; }
  await save(); render();
});

// Login admin
function logout() { tok = ''; sessionStorage.removeItem('lt'); render(); }
$('#adminBtn').onclick = () => admin() ? logout() : $('#login').showModal();
$('#loginCancel').onclick = () => $('#login').close();
$('#loginForm').onsubmit = async e => {
  e.preventDefault(); const fd = new FormData(e.target), err = $('#loginErr'); err.textContent = 'Verificando…';
  try {
    const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: fd.get('user'), pass: fd.get('pass') }) });
    const j = await r.json(); if (!r.ok) throw new Error(j.error);
    tok = j.token; sessionStorage.setItem('lt', tok); err.textContent = ''; e.target.reset(); $('#login').close(); render();
  } catch (x) { err.textContent = x.message || 'Erro ao verificar.'; }
};

// Cookies
if (getCookie('lunex_consent') === undefined) $('#cookie').hidden = false;
$('#cAccept').onclick = () => { setCookie('lunex_consent', '1'); setCookie('lunex_last', route); $('#cookie').hidden = true; };
$('#cDeny').onclick = () => { setCookie('lunex_consent', '0'); $('#cookie').hidden = true; };

// Estrelas animadas
(() => { const c = $('#stars'), x = c.getContext('2d'); let s = [];
  const size = () => { c.width = innerWidth; c.height = innerHeight; s = Array.from({ length: 90 }, () => ({ x: Math.random() * c.width, y: Math.random() * c.height, r: Math.random() * 1.5 + .3, p: Math.random() * 6 })); };
  addEventListener('resize', size); size();
  (function t(n) { x.clearRect(0, 0, c.width, c.height); for (const a of s) { x.globalAlpha = .4 + .6 * Math.abs(Math.sin(n / 1200 + a.p)); x.fillStyle = '#fff'; x.beginPath(); x.arc(a.x, a.y, a.r, 0, 7); x.fill(); } requestAnimationFrame(t); })(0); })();

load().then(() => { const l = getCookie('lunex_last'); if (consent() && NAV.some(n => n[0] === l)) route = l; render(); });

const RN={C:'Commun',PC:'Peu commun',R:'Rare',UR:'Ultra rare',L:'Légendaire'},R=['C','PC','R','UR','L'],W=[50,28,14,6,2];
const COL={C:'#8a96a3',PC:'#4fa3e0',R:'#9b6bff',UR:'#f0a030',L:'#ffd34d'};
const IC={Champion:'⚔️',Joueur:'🎮','Équipe':'🛡️','Événement':'🏆',Skin:'🎨','Icône':'🖼️',Ligue:'🌏',Essence:'💎',Coach:'📋',Tournoi:'🏆',Sort:'✨',Passif:'🔹'};
const hash=s=>{let h=7;for(const c of String(s)){h=(h*31+c.charCodeAt(0))>>>0}return h};
let POOL=[];
let S={inv:{},chests:3,ess:0,t:Date.now(),k:0};
try{const x=localStorage.getItem('hm2');if(x)S=Object.assign(S,JSON.parse(x))}catch(e){}
const save=()=>{try{localStorage.setItem('hm2',JSON.stringify(S))}catch(e){}};
const CAP=5,EVERY=30*60e3,DAY=864e5;let tab=1,filt='all';
const $=id=>document.getElementById(id);
function pick(r){const p=POOL.filter(c=>c.r===r);return p[Math.random()*p.length|0]||POOL[0]}
function roll(){let x=Math.random()*100,i=0;for(;i<4;i++){if(x<W[i])break;x-=W[i]}return pick(R[i])}
function card(c,o={}){return`<div class="card${o.ghost?' ghost':''}" data-id="${c.id}" style="--c:${COL[c.r]};--h:${c.h};--d:${o.d||0}s"><span class="tag" title="${RN[c.r]}">${c.r}</span>${o.n>1?`<span class="n">×${o.n}</span>`:''}<div class="art">${IC[c.t]||'🃏'}${c.img?`<img src="${c.img}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}</div><div class="info"><b>${c.n}</b><span>${c.t} · ${c.s}</span></div><div class="st"><i>⚔ ${c.atk}</i><u>🛡 ${c.def}</u></div>${o.dis?`<button class="dis" data-d="${c.id}">Défausser (+1 essence)</button>`:''}</div>`}
function open(special){
  if(special){if(Date.now()-S.k<DAY)return;S.k=Date.now()}else{if(S.chests<1)return;if(S.chests===CAP)S.t=Date.now();S.chests--}
  const got=[];for(let i=0;i<(special?4:5);i++)got.push(roll());
  if(special)got.push(pick(Math.random()<.85?'UR':'L'));
  got.forEach(c=>S.inv[c.id]=(S.inv[c.id]||0)+1);save();
  $('ovt').textContent=special?'Coffre spécial ouvert':'Coffre ouvert';
  $('ovg').innerHTML=got.map((c,i)=>card(c,{d:i*.25})).join('');
  $('ov').classList.add('on');$('ovb').focus();render();
}
function fmt(ms){const s=Math.max(0,Math.ceil(ms/1e3)),h=s/3600|0,m=(s%3600)/60|0;return(h?h+' h ':'')+m+' min '+String(s%60).padStart(2,'0')+' s'}
function render(){
  $('ess').textContent=S.ess;$('t1').className=tab===1?'on':'';$('t2').className=tab===2?'on':'';$('t3').className=tab===3?'on':'';
  if(!POOL.length){$('m').innerHTML='<div class="box"><h2>Aucune carte chargée</h2><p>Lance <code>python tools/build_cards.py</code>, puis ouvre le jeu avec <code>python -m http.server</code>.</p></div>';return}
  if(tab===1){
    const nk=S.k+DAY-Date.now(),ok=nk<=0,nc=S.t+EVERY-Date.now();
    $('m').innerHTML=`<div class="chests"><div class="box"><div class="chest">📦</div><h2>Coffre hextech</h2><p>5 cartes. Stock : <b>${S.chests}</b> / ${CAP}${S.chests<CAP?` · prochain dans <span id="cd">${fmt(nc)}</span>`:''}</p><button class="btn p" id="o1" ${S.chests?'':'disabled'}>Ouvrir un coffre</button></div>
    <div class="box special"><div class="chest">🗝️</div><h2>Coffre spécial</h2><p>Une clé hextech par jour. 4 cartes + 1 UR garantie.</p><button class="btn p" id="o2" ${ok?'':'disabled'}>${ok?'Utiliser la clé':'Clé dans '+fmt(nk)}</button></div></div>
    <p class="mut">Test : <button class="btn" id="o3">+1 coffre</button> <button class="btn" id="o4">Clé prête</button> <button class="btn" id="o5">Tout effacer</button></p>`;
    $('o1').onclick=()=>open(0);$('o2').onclick=()=>open(1);
    $('o3').onclick=()=>{S.chests=Math.min(CAP,S.chests+1);save();render()};$('o4').onclick=()=>{S.k=0;save();render()};
    $('o5').onclick=()=>{S={inv:{},chests:3,ess:0,t:Date.now(),k:0};save();render()};
  }else if(tab===2){
    const own=POOL.filter(c=>S.inv[c.id]),tot=own.length,sh=own.filter(c=>filt==='all'||c.r===filt);
    $('m').innerHTML=`<h2>Collection · ${tot} / ${POOL.length} cartes</h2><div class="chips"><button data-f="all" class="${filt==='all'?'on':''}">Toutes</button>${R.map(r=>`<button data-f="${r}" style="--c:${COL[r]}" class="${filt===r?'on':''}">${RN[r]}</button>`).join('')}</div>
    <div class="grid">${sh.length?sh.sort((a,b)=>R.indexOf(b.r)-R.indexOf(a.r)).map(c=>card(c,{n:S.inv[c.id],dis:1})).join(''):'<p class="mut">Rien ici. Ouvre un coffre pour commencer ta collection.</p>'}</div>`;
    $('m').querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{filt=b.dataset.f;render()});
    $('m').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const i=b.dataset.d;if(--S.inv[i]<1)delete S.inv[i];S.ess++;save();render()});
  }else{allTab()}
}
const A={r:'all',t:'all',o:'all',s:'r',q:'',n:60};
function allTab(){
  const ts=[...new Set(POOL.map(c=>c.t))].sort(),sel=(v,x,l)=>`<option value="${x}"${v===x?' selected':''}>${l}</option>`;
  $('m').innerHTML=`<h2 id="ah"></h2><div class="chips"><button data-r="all" class="${A.r==='all'?'on':''}">Toutes</button>${R.map(r=>`<button data-r="${r}" style="--c:${COL[r]}" class="${A.r===r?'on':''}">${RN[r]}</button>`).join('')}</div>
  <div class="bar"><input id="aq" type="search" placeholder="Rechercher une carte…" value="${A.q.replace(/"/g,'&quot;')}"><select id="at">${sel(A.t,'all','Tous les types')}${ts.map(t=>sel(A.t,t,t)).join('')}</select><select id="ao">${sel(A.o,'all','Toutes')}${sel(A.o,'own','Possédées')}${sel(A.o,'miss','Manquantes')}</select><select id="as">${sel(A.s,'r','Rareté ↓')}${sel(A.s,'r2','Rareté ↑')}${sel(A.s,'n','Nom A→Z')}${sel(A.s,'atk','ATK')}${sel(A.s,'def','DEF')}</select></div><div class="grid" id="ag"></div><p style="text-align:center"><button class="btn" id="am">Afficher plus</button></p>`;
  $('m').querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{A.r=b.dataset.r;A.n=60;render()});
  [['at','t'],['ao','o'],['as','s']].forEach(([i,k])=>$(i).onchange=e=>{A[k]=e.target.value;A.n=60;render()});
  $('aq').oninput=e=>{A.q=e.target.value;A.n=60;drawAll()};
  $('am').onclick=()=>{A.n+=60;drawAll()};
  drawAll();
}
function drawAll(){
  const q=A.q.toLowerCase(),K={r:(a,b)=>R.indexOf(b.r)-R.indexOf(a.r)||a.n.localeCompare(b.n),r2:(a,b)=>R.indexOf(a.r)-R.indexOf(b.r)||a.n.localeCompare(b.n),n:(a,b)=>a.n.localeCompare(b.n),atk:(a,b)=>b.atk-a.atk,def:(a,b)=>b.def-a.def};
  const l=POOL.filter(c=>(A.r==='all'||c.r===A.r)&&(A.t==='all'||c.t===A.t)&&(!q||(c.n+' '+c.s).toLowerCase().includes(q))&&(A.o==='all'||(A.o==='own')===!!S.inv[c.id])).sort(K[A.s]);
  $('ah').textContent=`Toutes les cartes · ${l.length} résultat${l.length>1?'s':''} (possédées : ${POOL.filter(c=>S.inv[c.id]).length} / ${POOL.length})`;
  $('ag').innerHTML=l.length?l.slice(0,A.n).map(c=>card(c,{n:S.inv[c.id],ghost:!S.inv[c.id]})).join(''):'<p class="mut">Aucune carte ne correspond à ces filtres.</p>';
  $('am').style.display=l.length>A.n?'':'none';
}
$('t1').onclick=()=>{tab=1;render()};$('t2').onclick=()=>{tab=2;render()};$('t3').onclick=()=>{tab=3;render()};$('ovb').onclick=()=>$('ov').classList.remove('on');
setInterval(()=>{if(S.chests<CAP&&Date.now()-S.t>=EVERY){S.chests++;S.t+=EVERY;if(S.chests>=CAP)S.t=Date.now();save();if(tab===1&&!$('ov').classList.contains('on'))render()}
  if(tab===1&&!$('ov').classList.contains('on')){const cd=$('cd');if(cd)cd.textContent=fmt(S.t+EVERY-Date.now());const o=$('o2');if(o&&o.disabled)o.textContent='Clé dans '+fmt(S.k+DAY-Date.now())}},1000);
function detail(id){const c=POOL.find(x=>x.id==id);if(!c)return;
const src=c.src||'https://liquipedia.net/leagueoflegends/index.php?search='+encodeURIComponent(c.n);
$('dtc').innerHTML=card(c);
$('dti').innerHTML=`<h2>${c.n}</h2><p class="mut">${c.t} · ${c.s}</p><p><b style="color:${COL[c.r]}">${RN[c.r]}</b> · ⚔ ${c.atk} · 🛡 ${c.def}</p><p>Exemplaires : ${S.inv[c.id]||0}</p><p><a href="${src}" target="_blank" rel="noopener noreferrer">Voir la source →</a></p>`;
$('dt').classList.add('on');$('dtb').focus()}
document.addEventListener('click',e=>{const k=e.target.closest('.card');if(k&&k.dataset.id&&!e.target.closest('.dis')&&!e.target.closest('#dtc'))detail(k.dataset.id)});
$('dtb').onclick=()=>$('dt').classList.remove('on');
render();
fetch('data/cards.json').then(r=>r.ok?r.json():Promise.reject()).then(a=>{if(a.length){POOL=a.map(c=>({...c,h:hash(c.n)%360}));render()}}).catch(e=>{console.error('Chargement des cartes impossible :',e);const b=document.querySelector('#m .box p');if(b)b.textContent='Impossible de charger data/cards.json ('+e+'). Ouvre la console (F12) pour plus de détails.'});

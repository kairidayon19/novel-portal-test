"use strict";
const GAS_URL = "https://script.google.com/macros/s/AKfycbxiekEJjHkTgGnJb-mmjplYS26NHgEMdB5CtU1dwDaq3HmfaRXrWSCeDSBou-S6o3TL/exec";
const root=document.getElementById("contributors");
function validUrl(v) {
  try {
    const u = new URL(String(v || '').trim(), document.baseURI);
    return ['https:', 'http:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
}
function validExternalUrl(value) {
  const raw = String(value || '').trim();
  if (!/^https?:\/\//i.test(raw)) return '';
  return validUrl(raw);
}
function line(parent,tag,text,cls){const el=document.createElement(tag);if(cls)el.className=cls;el.textContent=text;parent.appendChild(el);return el}
function section(card,title,value){if(!value)return;const s=line(card,"div","","contributor-section");line(s,"h3",title);line(s,"p",value)}
function loadJsonp(url){return new Promise((resolve,reject)=>{const cb="portalCallback_"+Date.now()+"_"+Math.floor(Math.random()*1e6);const script=document.createElement("script");const timer=setTimeout(()=>finish(new Error("timeout")),15000);function finish(err,data){clearTimeout(timer);delete window[cb];script.remove();err?reject(err):resolve(data)}window[cb]=data=>finish(null,data);script.onerror=()=>finish(new Error("network"));script.src=url+"?callback="+encodeURIComponent(cb);document.head.appendChild(script)})}
async function init(){try{const data=await loadJsonp(GAS_URL);if(!Array.isArray(data.contributors))throw new Error("協力者一覧データがありません。Apps Scriptを更新してください");for(const c of data.contributors){const card=line(root,"article","","contributor");const header=line(card,"div","","contributor-header");const avatar=document.createElement("img");avatar.className="contributor-avatar";avatar.alt="";avatar.loading="lazy";avatar.src=validUrl(c.icon)||"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23e8eef7'/%3E%3C/svg%3E";avatar.onerror=()=>avatar.removeAttribute("src");header.appendChild(avatar);const info=line(header,"div","");line(info,"h2",c.name||"お名前未登録");const handle=String(c.xName||"").trim().replace(/^@/,"");const x=/^[A-Za-z0-9_]{1,15}$/.test(handle)?"https://x.com/"+handle:"";if(x){const a=line(info,"a",c.xName||"Xプロフィール");a.href=x;a.target="_blank";a.rel="noopener noreferrer"}else if(c.xName)line(info,"span",c.xName);if(c.genres){const s=line(card,"div","","contributor-section");line(s,"h3","好きなジャンル");c.genres.split(/[、,，\n]/).map(v=>v.trim()).filter(Boolean).forEach(v=>line(s,"span",v,"genre-pill"))}section(card,"実績・活動歴",c.achievements);section(card,"一言",c.message);// Xの表示は既存のまま。外部リンクは1件のみ表示する。
const externalUrl = validExternalUrl(c.externalUrl);
if (externalUrl) {
  const block = line(card, "div", "", "contributor-section contributor-external");
  line(block, "h3", "外部リンク");
  const a = line(block, "a", String(c.externalLabel || "外部サイト").trim() || "外部サイト", "contributor-external-link");
  a.href = externalUrl;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
}}if(!data.contributors.length)line(root,"p","協力者情報は準備中です。") }catch(e){console.error(e);const el=document.getElementById("error");el.hidden=false;el.textContent="協力者情報を取得できませんでした。Apps Scriptの公開設定をご確認ください。"}finally{document.getElementById("loading").hidden=true}}init();

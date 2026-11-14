'use strict';
const $ = id => document.getElementById(id);
let books = [], visible = [], shown = 0;
const FAVORITES_KEY = "novel-portal-favorites-v1";
let favorites = new Set();
try { favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")); } catch (e) { console.warn("お気に入りの読み込みに失敗", e); }
function bookKey(b) { return [b.title,b.author,b.label].map(v=>String(v||"").trim().normalize("NFKC")).join("|釁|"); }
function toggleFavorite(key) { if (favorites.has(key)) favorites.delete(key); else favorites.add(key); try {localStorage.setItem(FAVORITES_KEY,JSON.stringify([...favorites]));} catch(e) {console.warn("お気に入りの保存に失敗",e);} update(); }
const PAGE_SIZE = 24;
const collator = new Intl.Collator('ja', {numeric:true, sensitivity:'base'});
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function safeUrl(url) {try {const u = new URL(url);return ['https:','http:'].includes(u.protocol) ? u.href : '';} catch{return '';}}
function genreTags(value) {
  // 明示的な区切り文字のみ分割。例: 「青春ラブコメ」は1ジャンルとして保持。
  const genres = String(value ?? '').split(/[、,，\n／/]+/).map(x => x.trim()).filter(Boolean);
  return genres.length ? genres.map(g => `<span class="genre-pill">${esc(g)}</span>`).join('') : '—';
}
function makeCard(b) {
  const card = document.createElement('article');
  card.className = 'book';
  const links = [['BOOK☆WALKER',b.bookwalker,''],['Amazon',b.amazon,'amazon']]
    .filter(x => safeUrl(x[1]))
    .map(([name,url,cls]) => `<a class="${cls}" href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer sponsored">${name} ↗</a>`).join('');
  const coverUrl = safeUrl(b.cover || '');
  const coverHtml = coverUrl
    ? `<img class="book-cover-image" src="${esc(coverUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : '<span class="book-cover-placeholder">NO IMAGE</span>';
  const date = b.date ? `${b.date.slice(0,4)}年${Number(b.date.slice(5))}月` : '未設定';
  const key = bookKey(b);
  const isFavorite = favorites.has(key);
  card.innerHTML = `
    <h3 class="book-title"><span class="book-title-text">${esc(b.title)}</span>${b.isNew ? '<span class="new-badge new-badge-inline">NEW</span>' : ''}</h3>
    <div class="book-body">
      <button class="book-cover favorite-cover ${isFavorite ? 'is-favorite' : ''}" type="button"
        aria-pressed="${isFavorite}" aria-label="${esc(b.title)}を${isFavorite ? 'お気に入りから解除' : 'お気に入りに登録'}">
        ${coverHtml}<span class="favorite-check" aria-hidden="true">${isFavorite ? '♥' : '♡'}</span>
      </button>
      <div class="book-details">
        <dl class="meta">
          <dt>著者</dt><dd>${esc(b.author) || '—'}</dd>
          <dt>イラスト</dt><dd>${esc(b.illustrator) || '—'}</dd>
          <dt>レーベル</dt><dd>${esc(b.label) || '—'}</dd>
          <dt>発売日</dt><dd>${esc(date)}</dd>
          <dt>刊行状況</dt><dd>${esc(b.publication) || '未設定'}</dd>
          <dt>ジャンル</dt><dd class="book-genres">${genreTags(b.genre)}</dd>
        </dl>
      </div>
    </div>${links ? `<div class="links">${links}</div>` : ''}`;
  card.querySelector('.favorite-cover').addEventListener('click', () => toggleFavorite(key));
  const image = card.querySelector('.book-cover-image');
  if (image) image.addEventListener('error', () => {
    image.replaceWith(Object.assign(document.createElement('span'), {
      className: 'book-cover-placeholder', textContent: 'NO IMAGE'
    }));
  }, {once:true});
  return card;
}

function appendPage(){const fragment=document.createDocumentFragment();visible.slice(shown,shown+PAGE_SIZE).forEach(b=>fragment.appendChild(makeCard(b)));$('cards').appendChild(fragment);shown=Math.min(shown+PAGE_SIZE,visible.length);$('more').hidden=shown>=visible.length;}
const norm = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase();
let genreOptions = [];
function selectedGenres() {
  return [...document.querySelectorAll('#genre-checkboxes input[type="checkbox"]:checked')].map(el => el.value);
}
function matchesGenre(value, selected) {
  if (!selected.length) return true;
  const text = norm(value);
  return selected.some(genre => genre === 'その他'
    ? !genreOptions.filter(g => g !== 'その他').some(g => text.includes(norm(g)))
    : text.includes(norm(genre)));
}
function renderGenres(genres) {
  genreOptions = [...new Set(genres.map(v => String(v).trim()).filter(Boolean))];
  const root = $('genre-checkboxes');
  root.replaceChildren();
  genreOptions.forEach((genre, i) => {
    const label = document.createElement('label');
    label.className = 'genre-option';
    const input = document.createElement('input');
    input.type = 'checkbox'; input.name = 'genre'; input.value = genre;
    input.id = 'genre-check-' + i;
    input.addEventListener('change', update);
    const span = document.createElement('span'); span.textContent = genre;
    label.append(input, span); root.append(label);
  });
}
function markSelections() {
  ['year','month','status'].forEach(id => $(id).classList.toggle('is-selected', Boolean($(id).value)));
  $('sort').classList.toggle('is-selected', $('sort').value !== 'title');
  const active = ['year','month','status'].filter(id => Boolean($(id).value)).length + selectedGenres().length;
  const badge = $('filter-active-count');
  badge.textContent = `${active}件選択中`;
  badge.hidden = active === 0;
  const count = selectedGenres().length;
  $('genre-selected-count').textContent = count ? `（${count}件選択中）` : '';
  $('genre-checkboxes').classList.toggle('has-selection', count > 0);
}
function update() {
  const query = norm($('search').value.trim());
  const field = document.querySelector('input[name="field"]:checked').value;
  const year = $('year').value, month = $('month').value;
  const status = $('status').value, genre = selectedGenres(), sort = $('sort').value;
  visible = books.filter(b => {
    const date = String(b.date ?? '');
    if (year && date.slice(0,4) !== year) return false;
    if (month && Number(date.slice(5,7)) !== Number(month)) return false;
    if (status && b.status !== status) return false;
    if (!matchesGenre(b.genre, genre)) return false;
    if ($('favorites-only').checked && !favorites.has(bookKey(b))) return false;
    if ($('new-only').checked && !b.isNew) return false;
    if (!query) return true;
    const fields = field === 'all' ? ['title','author','illustrator','label'] : [field];
    return fields.some(k => norm(b[k]).includes(query));
  });
  visible.sort((a,b) => sort === 'date-desc'
    ? String(b.date ?? '').localeCompare(String(a.date ?? '')) || collator.compare(a.title,b.title)
    : sort === 'date-asc'
    ? String(a.date ?? '').localeCompare(String(b.date ?? '')) || collator.compare(a.title,b.title)
    : collator.compare(a[sort] ?? '', b[sort] ?? ''));
  $('count').textContent = visible.length.toLocaleString('ja-JP');
  $('hint').textContent = `全${books.length.toLocaleString('ja-JP')}作品から検索`;
  $('loading').hidden = true;
  $('cards').replaceChildren(); $('empty').hidden = visible.length !== 0;
  shown = 0; markSelections(); appendPage();
}
// Apps Script のデプロイURL（/exec）を貼り付けます。
// 未設定なら同梱の books.json を読み込みます。
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxiekEJjHkTgGnJb-mmjplYS26NHgEMdB5CtU1dwDaq3HmfaRXrWSCeDSBou-S6o3TL/exec';
function loadJsonp(url) {
  return new Promise((resolve, reject) => {
    const callback = 'portalCallback_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
    const script = document.createElement('script');
    const timeout = setTimeout(() => finish(new Error('API応答がタイムアウトしました')), 15000);
    function finish(error, data) {
      clearTimeout(timeout);
      delete window[callback];
      script.remove();
      if (error) reject(error); else resolve(data);
    }
    window[callback] = data => finish(null, data);
    script.onerror = () => finish(new Error('APIを読み込めませんでした'));
    script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + encodeURIComponent(callback);
    document.head.appendChild(script);
  });
}
async function init(){
  try {
    if (GAS_URL) {
      if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(GAS_URL)) throw Error('GAS_URL に /exec で終わるURLを設定してください');
      const response = await loadJsonp(GAS_URL);
      books = Array.isArray(response) ? response : response.books;
      if (Array.isArray(response.genres)) renderGenres(response.genres);
      else throw Error('ジャンル一覧がAPIにありません。Code.gsを更新して再デプロイしてください');
    } else {
      const res = await fetch('./books.json', {cache:'no-store'});
      if (!res.ok) throw Error('HTTP ' + res.status);
      const response = await res.json();
      books = Array.isArray(response) ? response : response.books;
      renderGenres(Array.isArray(response.genres) ? response.genres : []);
    }
    if (!Array.isArray(books)) throw Error('APIのデータ形式が不正です');
    const years = [...new Set(books.map(b => String(b.date ?? '').slice(0,4)).filter(y => /^\d{4}$/.test(y)))].sort((a,b) => b.localeCompare(a));
    const yearSelect = $('year');
    yearSelect.replaceChildren(new Option('すべての年', ''));
    years.forEach(y => yearSelect.add(new Option(`${y}年`, y)));
    const monthSelect = $('month');
    monthSelect.replaceChildren(new Option('すべての月', ''));
    for (let m=1; m<=12; m++) monthSelect.add(new Option(`${m}月`, String(m)));
    $('loading').hidden = true;
    update();
  } catch(e) {
    $('loading').hidden = true;
    $('hint').textContent = 'データの読み込みに失敗しました';
    $('empty').hidden = false;
    $('empty').textContent = 'データを読み込めませんでした。APIのデプロイ設定とURLをご確認ください。';
    console.error(e);
  }
}
$('search').addEventListener('input', update);
document.querySelectorAll('input[name="field"]').forEach(x => x.addEventListener('change', update));
['year','month','status','sort'].forEach(id => $(id).addEventListener('change', update));
$('clear').addEventListener('click', () => {
  $('search').value = '';
  document.querySelector('input[name="field"][value="all"]').checked = true;
  ['year','month','status'].forEach(id => $(id).value = '');
  $('favorites-only').checked = false;
  $('new-only').checked = false;
  document.querySelectorAll('#genre-checkboxes input').forEach(el => el.checked = false);
  $('sort').value = 'title'; update();
});
$('more').addEventListener('click', appendPage);
$('favorites-only').addEventListener('change', update);
$('new-only').addEventListener('change', update);
init();

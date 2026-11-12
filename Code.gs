// テスト環境用。スプレッドシートに紐づく Apps Script に貼り付けます。
const BOOK_SHEET = 'おすすめ一覧';
const GENRE_SHEET = 'ジャンル一覧';
const CONTRIBUTOR_SHEET = '協力者一覧';
const PUBLISH_SHEET = '公開管理';

function bookKey_(b) {
  return [b.title, b.author, b.label].map(v => String(v || '').trim().normalize('NFKC')).join('|釁|');
}
function getBooks_(ss) {
  const sheet = ss.getSheetByName(BOOK_SHEET);
  if (!sheet) throw new Error('おすすめ一覧 シートがありません');
  return sheet.getDataRange().getDisplayValues().slice(1)
    .filter(r => r[2] && r[2].trim())
    .map((r, i) => ({
      id: i + 1,
      date: toMonth(r[0], r[1]), title: r[2] || '', author: r[3] || '',
      illustrator: r[4] || '', label: r[5] || '', genre: r[6] || '',
      publication: r[7] || '',
      status: /打ち切り/.test(r[7]) ? '打ち切り' : /完結/.test(r[7]) ? '完結' : /継続/.test(r[7]) ? '継続' : 'その他',
      bookwalker: r[8] || '', amazon: r[9] || '', cover: r[11] || ''
    }));
}
function doGet(e) {
  const callback = String((e && e.parameter && e.parameter.callback) || '');
  if (!/^portalCallback_[A-Za-z0-9_]+$/.test(callback)) {
    return ContentService.createTextOutput('Invalid callback').setMimeType(ContentService.MimeType.TEXT);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const books = getBooks_(ss);
  const genreSheet = ss.getSheetByName(GENRE_SHEET);
  const genres = genreSheet && genreSheet.getLastRow() > 1
    ? [...new Set(genreSheet.getRange(2, 1, genreSheet.getLastRow() - 1, 1)
        .getDisplayValues().flat().map(v => v.trim()).filter(Boolean))] : [];
  const contributorSheet = ss.getSheetByName(CONTRIBUTOR_SHEET);
  const contributors = contributorSheet && contributorSheet.getLastRow() > 1
    ? contributorSheet.getRange(2, 1, contributorSheet.getLastRow() - 1, 6)
      .getDisplayValues().filter(r => r[0] && r[0].trim())
      .map(r => ({name:r[0],xName:r[1],genres:r[2],icon:r[3],achievements:r[4],message:r[5]})) : [];
  const publish = ss.getSheetByName(PUBLISH_SHEET);
  const newKeys = new Set();
  if (publish && publish.getLastRow() > 1) {
    publish.getRange(2, 1, publish.getLastRow()-1, 2).getDisplayValues()
      .forEach(r => {if(r[1] === 'NEW') newKeys.add(r[0]);});
  }
  books.forEach(b => b.isNew = newKeys.has(bookKey_(b)));
  const output = callback + '(' + JSON.stringify({books, genres, contributors}).replace(/</g, '\\u003c') + ');';
  return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
function toMonth(year, month) {
  const y = parseInt(String(year).replace(/[^0-9]/g, ''), 10);
  const m = parseInt(String(month).replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return '';
  return (y < 100 ? 2000 + y : y) + '-' + String(m).padStart(2, '0');
}
// 初回は既存作品を基準として登録（NEWなし）。以後は「本番公開時」に手動実行。
// 新規作品があれば NEW を入れ替え、なければ以前の NEW を維持します。
function updateNewOnPublish() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const books = getBooks_(ss);
  const keys = [...new Set(books.map(bookKey_))];
  const sheet = ss.getSheetByName(PUBLISH_SHEET) || ss.insertSheet(PUBLISH_SHEET);
  const rows = sheet.getLastRow() > 1
    ? sheet.getRange(2,1,sheet.getLastRow()-1,2).getDisplayValues() : [];
  const old = new Set(rows.map(r=>r[0]).filter(Boolean));
  const added = rows.length ? keys.filter(k=>!old.has(k)) : [];
  const previousNew = new Set(rows.filter(r=>r[1]==='NEW').map(r=>r[0]));
  const currentNew = added.length ? new Set(added) : previousNew;
  sheet.clearContents();
  sheet.getRange(1,1,1,2).setValues([['作品キー','NEW状態']]);
  if(keys.length) sheet.getRange(2,1,keys.length,2).setValues(keys.map(k=>[k,currentNew.has(k)?'NEW':'']));
  SpreadsheetApp.getUi().alert(rows.length === 0
    ? '初期登録が完了しました。既存作品にはNEWを付けません。'
    : added.length ? `新規${added.length}作品をNEWにしました。` : '新規作品なし：NEW表示はそのまま維持しました。');
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('サイト公開管理')
    .addItem('本番公開時にNEWを更新','updateNewOnPublish').addToUi();
}

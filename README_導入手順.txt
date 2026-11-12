GitHub Pages キャッシュ対策（テスト環境用）

1. このZIP内の index.html, contributors.html, app.js, contributors.js, style.css を
   novel-portal-test の同名ファイルに上書きしてください。
2. .github/workflows/deploy.yml も同じ階層構造で novel-portal-test にコピーしてください。
3. GitHubのリポジトリ Settings → Pages → Build and deployment → Source を
   「GitHub Actions」に変更してください（従来の Deploy from a branch から切り替え）。
4. VS Codeの novel-portal-test フォルダで次を実行します。
   git add .
   git commit -m "Enable automatic asset cache busting"
   git push origin main
5. GitHubの Actions タブでデプロイ成功を確認します。

仕組み：GitHub Actionsが公開用HTMLのCSS/JS URLにコミットIDを付けます。
HTMLのソースファイル自体は書き換えません。以後は push のたびに自動更新します。
注意：ブラウザに古いHTMLが残る間は更新が遅れることがあります。
その場合は Ctrl+F5 またはURLに ?v=2 などを付けて確認してください。
お気に入り(localStorage)には変更を加えません。

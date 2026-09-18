/**
 * manual.md から、印刷用の manual.html を生成する。
 *
 *   node scripts/build-manual.js
 *
 * 外部パッケージは使わない。変換には、サイト本体と同じ js/lib/markdown-it.min.js を用いる。
 * この処理はマニュアルを紙で配るためのものであり、動かなくなってもサイトの公開と更新には
 * 影響しない。manual.md はそのままでも読める（段階的縮退）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'manual.md');
const OUT = path.join(ROOT, 'manual.html');

const markdownit = require(path.join(ROOT, 'js', 'lib', 'markdown-it.min.js'));
const md = markdownit({ html: true, linkify: false, typographer: false });

const source = fs.readFileSync(SRC, 'utf-8');
const body = md.render(source);

const CSS = `
@page { size: A4; margin: 18mm 16mm 20mm 16mm; }

:root { --ink:#111; --sub:#444; --rule:#bbb; --hair:#e0e0e0; --mark:#f2f4f3; }

body {
  font-family: "Hiragino Mincho ProN", "Yu Mincho", serif;
  font-size: 10.5pt; line-height: 1.85; color: var(--ink);
  margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;
}

h1 { font-size: 20pt; line-height:1.4; margin: 0 0 1.2em; padding-bottom:.5em; border-bottom: 2px solid var(--ink); }

/* 章は必ず改ページして始める。章末には書き込みの余白が残る（PL-23） */
h2 {
  font-size: 15pt; margin: 0 0 1em; padding: .4em 0 .4em .6em;
  border-left: 5px solid var(--ink); background: var(--mark);
  break-before: page; page-break-before: always;
}
h2:first-of-type { break-before: auto; page-break-before: auto; }

h3 { font-size: 12.5pt; margin: 2.2em 0 .7em; padding-bottom:.3em; border-bottom: 1px solid var(--rule); }
h4 { font-size: 11pt; margin: 1.8em 0 .5em; }
h2, h3, h4 { break-after: avoid; page-break-after: avoid; font-family: "Hiragino Sans", sans-serif; }

p, li { orphans: 3; widows: 3; }
ul, ol { padding-left: 1.6em; }
li { margin: .35em 0; }

/* ファイル名・入力する文字。印刷しても枠が残るようにする（PL-21） */
code {
  font-family: "SF Mono", Menlo, Consolas, monospace; font-size: .88em;
  border: 1px solid #999; border-radius: 3px; padding: .08em .35em;
  background: #fff; white-space: nowrap;
}
pre { break-inside: avoid; page-break-inside: avoid; background: #fafafa;
      border: 1px solid var(--rule); border-radius: 4px; padding: .9em 1.1em; overflow-x: auto; }
pre code { border: none; padding: 0; background: none; white-space: pre; font-size: .85em; }

strong { font-weight: 700; }

table { border-collapse: collapse; width: 100%; margin: 1.1em 0;
        break-inside: avoid; page-break-inside: avoid; font-size: .94em; }
th, td { border: 1px solid var(--rule); padding: .5em .7em; text-align: left; vertical-align: top; }
th { background: var(--mark); font-family: "Hiragino Sans", sans-serif; font-weight: 600; }

blockquote { margin: 1.1em 0; padding: .7em 1.1em; border-left: 3px solid var(--rule);
             background: #fbfbfb; color: var(--sub); font-size: .95em; break-inside: avoid; }

hr { border: none; border-top: 1px solid var(--hair); margin: 2em 0; }

a { color: inherit; text-decoration: underline; }

.print-note { font-family:"Hiragino Sans",sans-serif; font-size:9pt; color:var(--sub);
              border:1px dashed var(--rule); border-radius:4px; padding:.7em 1em; margin: 0 0 2em; }
@media print { .print-note { display: none; } }
`;

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>ウェブサイト更新 操作マニュアル</title>
<style>${CSS}</style>
</head>
<body>
<div class="print-note">
  このページはそのまま印刷できます。ブラウザの印刷（Windows：〔Ctrl〕＋〔P〕／Mac：〔⌘〕＋〔P〕）から、
  用紙A4・余白「既定」で出力してください。「背景のグラフィック」を有効にすると、表の罫線と枠が紙にも出ます。
  章ごとに改ページされ、章の終わりには書き込みの余白が残ります。
</div>
${body}
</body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log(`Generated ${path.relative(ROOT, OUT)}  (${(html.length/1024).toFixed(1)} KB)`);

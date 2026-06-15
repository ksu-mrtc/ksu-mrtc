#!/usr/bin/env node
/**
 * content.json 自動生成スクリプト
 * 
 * md/ ディレクトリ配下のMarkdownファイルからYAML Front Matterを読み取り、
 * content.json を自動生成。
 * 
 * 使用方法:
 *   node scripts/generate-content.js
 */

const fs = require('fs');
const path = require('path');

// 設定
const MD_DIR = path.join(__dirname, '..', 'md');
const OUTPUT_FILE = path.join(__dirname, '..', 'content.json');


/**
 * YAML Front Matterをパースする
 */
function parseFrontMatter(content) {
  const pattern = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+([\s\S]*)$/;
  const match = content.match(pattern);
  
  if (!match) {
    return { attributes: {}, body: content };
  }
  
  const yaml = match[1];
  const body = match[2];
  const attributes = {};
  
  yaml.split(/[\r\n]+/).forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // クォートを除去
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      attributes[key] = value;
    }
  });
  
  return { attributes, body };
}

/**
 * ディレクトリを再帰的に走査してMarkdownファイルを取得
 */
function getMarkdownFiles(dir, baseDir = dir) {
  const files = [];
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // parts ディレクトリは除外
      if (item !== 'parts') {
        files.push(...getMarkdownFiles(fullPath, baseDir));
      }
    } else if (item.endsWith('.md')) {
      const relativePath = path.relative(path.join(baseDir, '..'), fullPath);
      files.push(relativePath.replace(/\\/g, '/')); // Windows対応
    }
  }
  
  return files;
}

/**
 * ファイルパスからURLを生成
 * md/index.md -> /
 * md/news/index.md -> /news/
 * md/news/2025-01-01-launch.md -> /news/2025-01-01-launch
 */
function generateUrl(filePath) {
  let url = '/' + filePath
    .replace(/^md\//, '')
    .replace(/\.md$/, '')
    .replace(/\/index$/, '/');

  // ルートの index -> /
  if (url === '/index') url = '/';

  return url;
}

/**
 * メイン処理
 */
function main() {
  console.log('Generating content.json...');
  
  const mdFiles = getMarkdownFiles(MD_DIR);
  console.log(`Found ${mdFiles.length} Markdown files`);
  
  const contentIndex = [];
  
  for (const filePath of mdFiles) {
    const fullPath = path.join(__dirname, '..', filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const { attributes } = parseFrontMatter(content);
    
    // 基本情報
    const entry = {
      url: generateUrl(filePath),
      path: filePath
    };

    // Front Matterの属性をマージ
    // layout は保存しない: 表示レイアウトはアーカイブデータではなく、閲覧時に規約から推論する（js/main.js の inferLayout を参照）
    const KNOWN_KEYS = ['title', 'date', 'category', 'description', 'image', 'collection', 'navTitle', 'navOrder'];
    for (const key of KNOWN_KEYS) {
      if (attributes[key]) entry[key] = attributes[key];
    }
    
    contentIndex.push(entry);
  }
  
  // ソート: index.md（セクションページ）を先に、次に日付順、最後にパス順
  contentIndex.sort((a, b) => {
    const aIsIndex = a.path.endsWith('/index.md') || a.path === 'md/index.md';
    const bIsIndex = b.path.endsWith('/index.md') || b.path === 'md/index.md';
    if (aIsIndex && !bIsIndex) return -1;
    if (!aIsIndex && bIsIndex) return 1;

    if (a.date && b.date) {
      return a.date.localeCompare(b.date);
    }

    return a.path.localeCompare(b.path);
  });
  
  // ファイル出力
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(contentIndex, null, 2) + '\n');
  
  console.log(`Generated ${OUTPUT_FILE}`);
  console.log(`Total entries: ${contentIndex.length}`);

  // --- md/parts/header.md の自動生成 ---
  console.log('Generating md/parts/header.md...');
  // md/直下フォルダのindex.mdのみをヘッダーメニュー対象とする（深階層のファイルは除外）
  const navItems = contentIndex.filter(item => 
    item.navTitle && /^md\/[^/]+\/index\.md$/.test(item.path)
  );
  
  // navOrderでソート
  navItems.sort((a, b) => {
    const orderA = parseInt(a.navOrder) || 9999;
    const orderB = parseInt(b.navOrder) || 9999;
    return orderA - orderB;
  });

  // ルートの index.md からロゴテキストを取得（デフォルトは '伝み'）
  const rootItem = contentIndex.find(item => item.path === 'md/index.md');
  const logoText = (rootItem && rootItem.navTitle) ? rootItem.navTitle : '伝み';

  // ルートの index.md 自体は箇条書きメニューのリストからは除外する
  const menuItems = navItems.filter(item => item.path !== 'md/index.md');

  const headerLines = [
    `[![${logoText}](images/favicon/favicon.jpg)](?p=md/index.md)`,
    ''
  ];

  for (const item of menuItems) {
    headerLines.push(`- [${item.navTitle}](?p=${item.path})`);
  }

  const HEADER_FILE = path.join(__dirname, '..', 'md', 'parts', 'header.md');
  fs.writeFileSync(HEADER_FILE, headerLines.join('\n') + '\n');
  console.log(`Generated ${HEADER_FILE}`);
}

main();

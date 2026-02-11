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

// 固定ページの定義（Front Matterで上書き可能）
const STATIC_PAGES = {
  'md/index.md': { url: '/', layout: 'top' },
  'md/news/index.md': { url: '/news/', layout: 'list', collection: 'news' },
  'md/research/index.md': { url: '/research/', layout: 'list', collection: 'research' },
  'md/kakiemon/index.md': { url: '/kakiemon/', layout: 'article' }
};

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
 */
function generateUrl(filePath, attributes) {
  // 固定ページの場合はその定義を使用
  if (STATIC_PAGES[filePath] && STATIC_PAGES[filePath].url) {
    return STATIC_PAGES[filePath].url;
  }
  
  // md/news/2025-01-01-launch.md -> /news/2025-01-01-launch
  let url = '/' + filePath
    .replace(/^md\//, '')
    .replace(/\.md$/, '')
    .replace(/\/index$/, '/');
  
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
      url: generateUrl(filePath, attributes),
      path: filePath
    };
    
    // 固定ページのデフォルト設定をマージ
    if (STATIC_PAGES[filePath]) {
      Object.assign(entry, STATIC_PAGES[filePath]);
    }
    
    // Front Matterの属性をマージ（上書き）
    if (attributes.title) entry.title = attributes.title;
    if (attributes.date) entry.date = attributes.date;
    if (attributes.category) entry.category = attributes.category;
    if (attributes.layout) entry.layout = attributes.layout;
    if (attributes.description) entry.description = attributes.description;
    if (attributes.image) entry.image = attributes.image;
    if (attributes.collection) entry.collection = attributes.collection;
    
    contentIndex.push(entry);
  }
  
  // 日付とパスでソート（日付があるものは新しい順、ないものはパス順）
  contentIndex.sort((a, b) => {
    // 固定ページを先に
    const aIsStatic = !!STATIC_PAGES[a.path];
    const bIsStatic = !!STATIC_PAGES[b.path];
    if (aIsStatic && !bIsStatic) return -1;
    if (!aIsStatic && bIsStatic) return 1;
    
    // 日付があるものは日付順
    if (a.date && b.date) {
      return a.date.localeCompare(b.date);
    }
    
    // パス順
    return a.path.localeCompare(b.path);
  });
  
  // ファイル出力
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(contentIndex, null, 2) + '\n');
  
  console.log(`Generated ${OUTPUT_FILE}`);
  console.log(`Total entries: ${contentIndex.length}`);
}

main();

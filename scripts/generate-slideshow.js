#!/usr/bin/env node
/**
 * slideshow.json 自動生成スクリプト
 * 
 * images/slideshow/ ディレクトリ配下の画像ファイルを走査し、
 * slideshow.json を自動生成します。
 * 
 * 使用方法:
 *   node scripts/generate-slideshow.js
 */

const fs = require('fs');
const path = require('path');

// 設定
const SLIDESHOW_DIR = path.join(__dirname, '..', 'images', 'slideshow');
const OUTPUT_FILE = path.join(__dirname, '..', 'slideshow.json');

// サポートする画像拡張子
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

function main() {
  console.log('Generating slideshow.json...');

  if (!fs.existsSync(SLIDESHOW_DIR)) {
    console.error(`Error: Directory ${SLIDESHOW_DIR} does not exist.`);
    process.exit(1);
  }

  const items = fs.readdirSync(SLIDESHOW_DIR);
  const slideshowList = [];

  for (const item of items) {
    const fullPath = path.join(SLIDESHOW_DIR, item);
    const stat = fs.statSync(fullPath);

    if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        const alt = path.basename(item, ext); // 拡張子なしのファイル名をデフォルトのaltとする
        const src = `images/slideshow/${item}`;
        
        slideshowList.push({
          src: src,
          alt: alt
        });
      }
    }
  }

  // ファイル名でソートして順序を安定させる
  slideshowList.sort((a, b) => a.src.localeCompare(b.src));

  // ファイル出力
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(slideshowList, null, 2) + '\n');

  console.log(`Generated ${OUTPUT_FILE}`);
  console.log(`Total slideshow images: ${slideshowList.length}`);
}

main();

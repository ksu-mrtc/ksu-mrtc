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

  // 既存の slideshow.json に書かれた説明文（alt）は、同じ画像であれば引き継ぐ。
  // 画像の追加・削除はディレクトリの中身で決まり、説明文だけを人が書き足せる。
  const existingAlt = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      for (const entry of JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'))) {
        if (entry && entry.src && entry.alt) existingAlt[entry.src] = entry.alt;
      }
    } catch (e) {
      console.warn(`Warning: ${OUTPUT_FILE} を読めなかったため、説明文は引き継ぎません。`);
    }
  }

  const items = fs.readdirSync(SLIDESHOW_DIR);
  const slideshowList = [];

  for (const item of items) {
    const fullPath = path.join(SLIDESHOW_DIR, item);
    const stat = fs.statSync(fullPath);

    if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        const src = `images/slideshow/${item}`;
        // 説明文が書かれていなければ、拡張子なしのファイル名を代わりに用いる
        const alt = existingAlt[src] || path.basename(item, ext);
        
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

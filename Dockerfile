FROM node:alpine

WORKDIR /app

# package.jsonが存在する場合は依存ライブラリをセットアップ
COPY package*.json ./
RUN if [ -f package.json ]; then npm install --only=production; fi

# ソースコード全体をコピー
COPY . .

# content.json と slideshow.json を自動生成
CMD ["sh", "-c", "node scripts/generate-content.js && node scripts/generate-slideshow.js"]

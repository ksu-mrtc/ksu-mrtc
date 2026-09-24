# 生成スクリプト（content.json・slideshow.json・md/parts/header.md）を手元で実行するための環境。
# 公開時の自動処理（.github/workflows/deploy.yml）は、このファイルを使わず同じイメージを直接呼ぶ。
#
#   docker build -t ksu-mrtc-gen . && docker run --rm -v "$PWD":/app ksu-mrtc-gen
#
# 生成スクリプトは外部パッケージに依存しないため、Node.js が手元にあれば
# `node scripts/generate-content.js && node scripts/generate-slideshow.js` でも同じ結果になる。
FROM node:24-alpine

WORKDIR /app

COPY . .

CMD ["sh", "-c", "node scripts/generate-content.js && node scripts/generate-slideshow.js"]

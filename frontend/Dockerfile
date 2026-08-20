# Local/CI dev image only - runs the Vite dev server directly instead of
# building a static bundle. Production is built and served by Netlify, not
# this image (see .github/workflows/_deploy-netlify.yml).
FROM node:24-alpine

WORKDIR /client

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

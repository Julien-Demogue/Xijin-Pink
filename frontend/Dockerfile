FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY src ./src
COPY tsconfig.node.json ./
COPY index.html ./
COPY tsconfig.json ./
COPY tsconfig.app.json ./
COPY postcss.config.js ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY public ./public
RUN npm install
RUN chmod -R 777 /app
USER node
EXPOSE 5173

# ---- build the React client ----
FROM node:20-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client ./
RUN npm run build

# ---- run the API (and serve the built client) ----
FROM node:20-bookworm-slim
WORKDIR /app/server
ENV NODE_ENV=production PORT=4000 DB_PATH=/data/leads.db
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server ./
COPY --from=client-build /app/client/dist /app/client/dist
VOLUME /data
EXPOSE 4000
CMD ["node", "src/server.js"]

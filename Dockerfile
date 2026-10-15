# syntax=docker/dockerfile:1
# One image: NestJS serves API, WebSocket and the Angular build.

FROM node:24-slim AS build
WORKDIR /workspace
COPY . .
RUN npm ci --ignore-scripts
RUN npx nx run-many -t build -p frontend backend --configuration=production
RUN npx nx run backend:prune

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 WEB_ROOT=/app/public
COPY --from=build /workspace/apps/backend/dist/ ./
COPY --from=build /workspace/dist/apps/frontend/browser ./public
RUN npm ci --omit=dev --ignore-scripts && mkdir /data && chown node /data
USER node
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "main.js"]

FROM node:20-alpine AS base

WORKDIR /app

FROM base AS sdk-builder

WORKDIR /sdk
COPY open-bank-sdk/package.json open-bank-sdk/tsconfig.json ./
COPY open-bank-sdk/src ./src
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install
RUN pnpm run build

FROM base AS dependencies

COPY bank-microservice/package.json bank-microservice/pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

FROM base AS build

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY bank-microservice/package.json bank-microservice/pnpm-lock.yaml ./
COPY --from=sdk-builder /sdk/dist ./node_modules/open-bank-sdk/dist
COPY --from=sdk-builder /sdk/package.json ./node_modules/open-bank-sdk/package.json
COPY bank-microservice/ .

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm run build

FROM base AS production

ENV NODE_ENV=production

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/main.js"]


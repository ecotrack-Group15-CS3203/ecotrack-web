# Production image.
#
# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so they are
# build arguments. Everything else (API_URL, ASGARDEO_*) is read at runtime and comes
# from --env-file, so one image works for any environment with the same public values.
#
#   docker build -t ecotrack-web \
#     --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx \
#     --build-arg NEXT_PUBLIC_MOBILE_APP_URL= .
#   docker run -d --env-file .env.production -p 127.0.0.1:3000:3000 ecotrack-web

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.16.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ARG NEXT_PUBLIC_MOBILE_APP_URL
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN \
    NEXT_PUBLIC_MOBILE_APP_URL=$NEXT_PUBLIC_MOBILE_APP_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# The standalone output deliberately leaves public/ out; without this the brand
# logos under /brand/* 404 in production.
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]

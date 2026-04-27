FROM euwestmeswebacr.azurecr.io/node:22.21.0-trixie-slim_mdsv20260128170413 AS base
ARG NPM_REGISTRY=https://nexus.awsinternal.mediaset.es/repository/npm-group/
ARG APP_LOCATION=/app
ARG NEXT_PUBLIC_VMS_PRE_SELECTOR_URL
ARG NEXT_PUBLIC_VMS_PRO_SELECTOR_URL
ENV NEXT_PUBLIC_VMS_PRE_SELECTOR_URL=$NEXT_PUBLIC_VMS_PRE_SELECTOR_URL
ENV NEXT_PUBLIC_VMS_PRO_SELECTOR_URL=$NEXT_PUBLIC_VMS_PRO_SELECTOR_URL
WORKDIR $APP_LOCATION

USER root
 
# Instalar dependencias necesarias
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --registry=$NPM_REGISTRY --ignore-scripts --no-optional
COPY . .

RUN npm run build

# ============================================
# Development Stage
# ============================================
FROM base AS development
ENV NODE_ENV=development
ENV APP_ENV=development

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ============================================
# Pre-production Stage
# ============================================
FROM base AS pre
# NODE_ENV must be "production" — Next.js only accepts development/test/production internally.
# Use APP_ENV to distinguish pre from production in application logic.
ENV NODE_ENV=production
ENV APP_ENV=pre

RUN npm prune --production

EXPOSE 3000

CMD ["npm", "run", "start"]

# ============================================
# Production Stage
# ============================================
FROM base AS production
ARG NEXT_PUBLIC_VMS_PRE_SELECTOR_URL
ARG NEXT_PUBLIC_VMS_PRO_SELECTOR_URL
ENV NEXT_PUBLIC_VMS_PRE_SELECTOR_URL=$NEXT_PUBLIC_VMS_PRE_SELECTOR_URL
ENV NEXT_PUBLIC_VMS_PRO_SELECTOR_URL=$NEXT_PUBLIC_VMS_PRO_SELECTOR_URL
ENV NODE_ENV=production
ENV APP_ENV=production

RUN npm prune --production

EXPOSE 3000
USER node

CMD ["npm", "run", "start"]

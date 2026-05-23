# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies based on package-lock.json
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

# Build the app
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Install libssl1.1 for Prisma runtime
RUN wget -q -O /tmp/libssl1.1.apk https://dl-cdn.alpinelinux.org/alpine/v3.16/main/x86_64/libssl1.1-1.1.1w-r1.apk && \
    wget -q -O /tmp/libcrypto1.1.apk https://dl-cdn.alpinelinux.org/alpine/v3.16/main/x86_64/libcrypto1.1-1.1.1w-r1.apk && \
    apk add --no-cache --force-overwrite /tmp/libssl1.1.apk /tmp/libcrypto1.1.apk && \
    rm /tmp/libssl1.1.apk /tmp/libcrypto1.1.apk

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN mkdir .next

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME 0.0.0.0

CMD ["node", "server.js"]

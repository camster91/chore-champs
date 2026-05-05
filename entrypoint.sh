#!/bin/sh
# Download and install libssl1.1 for Prisma
wget -q -O /tmp/libssl1.1.apk https://dl-cdn.alpinelinux.org/alpine/v3.16/main/x86_64/libssl1.1-1.1.1w-r1.apk 2>/dev/null || true
wget -q -O /tmp/libcrypto1.1.apk https://dl-cdn.alpinelinux.org/alpine/v3.16/main/x86_64/libcrypto1.1-1.1.1w-r1.apk 2>/dev/null || true

# Try to extract and install
(cd /tmp && apk add --no-cache --force-overwrite /tmp/libssl1.1.apk /tmp/libcrypto1.1.apk) 2>/dev/null || \
(mkdir -p /tmp/ssl && cd /tmp/ssl && tar -xzf /tmp/libssl1.1.apk 2>/dev/null && tar -xzf /tmp/libcrypto1.1.apk 2>/dev/null && cp lib/* /lib/) || true

# Execute the main command
exec "$@"

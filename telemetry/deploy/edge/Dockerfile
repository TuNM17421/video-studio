# Caddy + DuckDNS DNS-01: the shared VM's :80/:443 belong to another stack, so the HTTP/TLS-ALPN challenges
# cannot reach this edge; a DNS challenge gets a real certificate on a non-standard port.
FROM caddy:2.10-builder AS build
RUN xcaddy build --with github.com/caddy-dns/duckdns

FROM caddy:2.10-alpine
COPY --from=build /usr/bin/caddy /usr/bin/caddy

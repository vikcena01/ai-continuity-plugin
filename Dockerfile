# Build spec for Glama's deploy/security check, and usable standalone.
#
# There is no build stage on purpose: dist/ is committed and esbuild has already
# inlined every dependency (d13), so the server is one ~890KB file that runs on a
# bare node with no npm install. Verified by running it in an empty directory.
FROM node:22-alpine

# git is not required — the store degrades to "no history" without it (git.ts is
# best-effort) — but the event log IS the product, so a container without git
# would be a misleading demo.
RUN apk add --no-cache git

WORKDIR /app
COPY dist/ ./dist/

# A container has no project repo to sit in, so the server runs in central mode
# (d6). Mount a volume here to keep state across runs; without one it is ephemeral.
ENV CONTINUITY_HOME=/data/projects
RUN mkdir -p /data/projects && chown -R node:node /data

# git refuses to operate on a repo it thinks belongs to someone else.
RUN git config --system --add safe.directory '*'

USER node

# stdio transport: the server talks JSON-RPC on stdin/stdout, so no port is exposed.
ENTRYPOINT ["node", "/app/dist/mcp.js"]

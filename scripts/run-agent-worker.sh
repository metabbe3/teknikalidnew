#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/bin:/bin"
export DATABASE_URL="postgresql://teknikalid:5gaWHFzdeG7P3jG8SS0zhgNqytGPN0@localhost:5433/teknikalid"
cd /Users/nicholasandriansurjadi/Documents/teknikalidnew
exec /Users/nicholasandriansurjadi/Documents/teknikalidnew/node_modules/.bin/tsx src/worker/agent-worker.ts

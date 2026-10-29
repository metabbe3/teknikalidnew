// Mint a next-auth (authjs) session cookie for staging verify — self-hosted, own secret.
import { encode } from '../node_modules/@auth/core/jwt.js';
import { readFileSync, writeFileSync } from 'fs';

const envlines = readFileSync('/tmp/admin-staging-env.txt', 'utf8').split('\n');
const AUTH_SECRET = envlines.find(l => l.startsWith('AUTH_SECRET=')).slice('AUTH_SECRET='.length);

const token = {
  id: 'cmpsqidkb0000jtoki3t66fh1',
  username: 'admin',
  role: 'ADMIN',
  name: 'Admin',
  email: 'admin@teknikal.id',
  image: null,
  loginAt: Date.now(),
  checkedAt: Date.now(),
  sub: 'cmpsqidkb0000jtoki3t66fh1',
  aud: 'http://localhost:3210',
  iss: 'http://localhost:3210',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  jti: crypto.randomUUID(),
};

const jwe = await encode({ token, secret: AUTH_SECRET, salt: 'authjs.session-token', maxAge: 3600 });
writeFileSync('/tmp/admin-session-cookie.txt', jwe);
console.log('JWE_LEN=' + jwe.length);

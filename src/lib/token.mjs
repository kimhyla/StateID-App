import crypto from 'crypto';

function b64urlEncodeJson(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');
}
function hmacSha256(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('base64url');
}

/**
 * Create a versioned HMAC token: v1.<base64url(JSON)>.sig
 * @param {object} claims - includes urlOriginal, eventId?, attendee?, exp
 * @param {string} secret - HMAC secret
 * @param {string} kid - key id, defaults to 'v1'
 * @returns {string}
 */
export function createToken(claims, secret, kid = 'v1') {
  const payload = { ...claims, kid };
  const payloadB64 = b64urlEncodeJson(payload);
  const msg = `v1.${payloadB64}`;
  const sig = hmacSha256(secret, msg);
  return `${msg}.${sig}`;
}

/**
 * Verify a token and return status + payload if valid.
 * @param {string} token
 * @param {string} secret
 * @returns {{ok:boolean,status:'ok'|'invalid_token'|'expired',payload?:any}}
 */
export function verifyToken(token, secret) {
  try {
    if (typeof token !== 'string') return { ok: false, status: 'invalid_token' };
    const parts = token.split('.');
    if (parts.length !== 3) return { ok: false, status: 'invalid_token' };
    const [ver, payloadB64, sig] = parts;
    if (ver !== 'v1') return { ok: false, status: 'invalid_token' };
    const expected = hmacSha256(secret, `${ver}.${payloadB64}`);

    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, status: 'invalid_token' };
    }

    const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8').replace(/^\uFEFF/, '');
    const payload = JSON.parse(payloadJson);
    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && nowSec > payload.exp) {
      return { ok: false, status: 'expired', payload };
    }
    return { ok: true, status: 'ok', payload };
  } catch {
    return { ok: false, status: 'invalid_token' };
  }
}

export function defaultSecret() {
  return process.env.WRAP_SECRET || 'dev-secret';
}

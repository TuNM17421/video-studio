/**
 * AWS Signature V4 for Cloudflare R2's S3-compatible API — just enough of it to PUT and DELETE one object,
 * with no dependency to install. Verified against the official aws-sig-v4-test-suite vectors (see
 * tools/lib/r2.test.mjs), because a signing bug only ever shows up as an opaque 403 from the bucket.
 */
import crypto from 'node:crypto';

const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
export const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
export const EMPTY_SHA = sha256('');

/** RFC 3986 encoding of one path segment — the `/` between segments must stay literal. */
export const encodeSegment = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * Sign one request. Returns the headers to send, `authorization` included.
 * `uri` must already be RFC 3986 encoded; `payloadHash` is the hex SHA-256 of the body — S3 wants it as the
 * `x-amz-content-sha256` header too, which the caller passes in `headers` so it gets signed with the rest.
 */
export function signRequest({ method, host, uri, headers = {}, payloadHash, accessKey, secret, region = 'auto', service = 's3', now = new Date() }) {
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const stamp = amzDate.slice(0, 8);
  const all = { ...headers, host, 'x-amz-date': amzDate };

  const lower = Object.fromEntries(Object.entries(all).map(([n, v]) => [n.toLowerCase(), String(v).trim()]));
  const names = Object.keys(lower).sort();
  const signedHeaders = names.join(';');
  const canonical = [method, uri, '', ...names.map((n) => `${n}:${lower[n]}`), '', signedHeaders, payloadHash].join('\n');

  const scope = `${stamp}/${region}/${service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const signingKey = [region, service, 'aws4_request'].reduce(hmac, hmac(`AWS4${secret}`, stamp));
  const signature = hmac(signingKey, toSign).toString('hex');

  return { ...all, authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}` };
}

/** The S3 endpoint of one object in an R2 bucket. */
export const objectUrl = (account, bucket, key) => ({
  host: `${account}.r2.cloudflarestorage.com`,
  uri: `/${[bucket, ...key.split('/')].map(encodeSegment).join('/')}`,
});

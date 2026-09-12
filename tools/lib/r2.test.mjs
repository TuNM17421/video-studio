/** node --test tools/lib — the signer is checked against AWS's own published vector, not against itself. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_SHA, encodeSegment, objectUrl, signRequest } from './r2.mjs';

test('matches the aws-sig-v4-test-suite get-vanilla vector', () => {
  const headers = signRequest({
    method: 'GET', host: 'example.amazonaws.com', uri: '/', payloadHash: EMPTY_SHA,
    accessKey: 'AKIDEXAMPLE', secret: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1', service: 'service', now: new Date('2015-08-30T12:36:00Z'),
  });
  assert.equal(headers['x-amz-date'], '20150830T123600Z');
  assert.equal(
    headers.authorization,
    'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/service/aws4_request, '
    + 'SignedHeaders=host;x-amz-date, Signature=5fa00fa31553b73ebf1942676e86291e8372ff2a2260956d9b8aae1d763fbf31',
  );
});

test('signs every header it is given, content type and length included', () => {
  const sign = (headers) => signRequest({
    method: 'PUT', host: 'acc.r2.cloudflarestorage.com', uri: '/bucket/a.mp4', headers, payloadHash: EMPTY_SHA,
    accessKey: 'k', secret: 's', now: new Date('2026-09-12T00:00:00Z'),
  });
  const headers = sign({ 'content-type': 'video/mp4', 'x-amz-content-sha256': EMPTY_SHA });
  assert.match(headers.authorization, /SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date,/);
  // A different body must produce a different signature, or the payload is not covered at all.
  assert.notEqual(headers.authorization, sign({ 'content-type': 'video/webm', 'x-amz-content-sha256': EMPTY_SHA }).authorization);
});

test('encodes a key without swallowing its separators', () => {
  assert.equal(encodeSegment("cảnh mở (1).mp4"), 'c%E1%BA%A3nh%20m%E1%BB%9F%20%281%29.mp4');
  assert.deepEqual(objectUrl('acc', 'media', 'styles/lesson/sample.mp4'), {
    host: 'acc.r2.cloudflarestorage.com',
    uri: '/media/styles/lesson/sample.mp4',
  });
});

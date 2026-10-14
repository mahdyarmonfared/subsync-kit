const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createServer, isPathSafe } = require('../src/server/server');

test('isPathSafe: guards against directory traversal attacks', () => {
  const base = 'C:\\test\\subsync';
  assert.equal(isPathSafe(base, 'C:\\test\\subsync\\index.html'), true);
  assert.equal(isPathSafe(base, 'C:\\test\\subsync\\sub\\style.css'), true);
  assert.equal(isPathSafe(base, 'C:\\test\\other\\evil.txt'), false);
});

test('HTTP Server: POST /api/shift shifts subtitle timecodes properly', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const payload = JSON.stringify({
      srt: `1\n00:00:01,000 --> 00:00:04,000\nHello World`,
      offset: '+1.5s'
    });

    const res = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/api/shift',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, resolve);
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    assert.equal(res.statusCode, 200);

    const bodyStr = await new Promise((resolve) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    const parsed = JSON.parse(bodyStr);
    assert.equal(parsed.success, true);
    assert.equal(parsed.shiftedCount, 1);
    assert.ok(parsed.outputSrt.includes('00:00:02,500 --> 00:00:05,500'));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('HTTP Server: POST /api/fix-encoding repairs corrupted input', async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const payload = JSON.stringify({ srt: 'ÓáÇã' });
    const res = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path: '/api/fix-encoding',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, resolve);
      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    assert.equal(res.statusCode, 200);

    const bodyStr = await new Promise((resolve) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });

    const parsed = JSON.parse(bodyStr);
    assert.equal(parsed.success, true);
    assert.equal(parsed.fixedSrt, 'سلام');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

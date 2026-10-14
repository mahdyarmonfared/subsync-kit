/**
 * SubSyncKit - Web Studio HTTP Server
 * Pure Node.js HTTP server delivering:
 * - REST API endpoints (/api/shift, /api/fix-encoding, /api/parse)
 * - Safe static file serving with Path-Traversal protection
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const { parseSrt, getSrtInfo } = require('../core/parser');
const { shiftSrt } = require('../core/shifter');
const { autoRepairEncoding, isWindows1256Corrupted } = require('../core/encoding');
const ansi = require('../cli/ansi');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.srt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function isPathSafe(baseDir, targetPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(resolvedBase + path.sep);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit for subtitle files
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function createServer() {
  const uiDir = path.resolve(__dirname, '../ui');

  const server = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = reqUrl.pathname;
    const method = req.method;

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      res.end();
      return;
    }

    // 1. API: /api/parse (POST)
    if (pathname === '/api/parse' && method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const rawContent = body.srt || '';
        const wasCorrupted = isWindows1256Corrupted(rawContent);
        const cleanContent = autoRepairEncoding(rawContent);

        const cues = parseSrt(cleanContent);
        const info = getSrtInfo(cues);

        sendJson(res, 200, {
          success: true,
          cues,
          info,
          wasCorrupted,
          repairedSrt: cleanContent
        });
      } catch (err) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return;
    }

    // 2. API: /api/shift (POST)
    if (pathname === '/api/shift' && method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const rawContent = body.srt || '';
        const offset = body.offset || 0;
        const speedRatio = body.speedRatio || 1.0;

        const cleanContent = autoRepairEncoding(rawContent);
        const result = shiftSrt(cleanContent, offset, { speedRatio });
        const info = getSrtInfo(result.cues);

        sendJson(res, 200, {
          success: true,
          outputSrt: result.outputSrt,
          cues: result.cues,
          info,
          totalCues: result.totalCues,
          shiftedCount: result.shiftedCount,
          droppedCount: result.droppedCount,
          appliedOffsetMs: result.appliedOffsetMs,
          appliedSpeedRatio: result.appliedSpeedRatio
        });
      } catch (err) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return;
    }

    // 3. API: /api/fix-encoding (POST)
    if (pathname === '/api/fix-encoding' && method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const rawContent = body.srt || '';
        const wasCorrupted = isWindows1256Corrupted(rawContent);
        const fixedSrt = autoRepairEncoding(rawContent);

        sendJson(res, 200, {
          success: true,
          wasCorrupted,
          fixedSrt: fixedSrt === rawContent && wasCorrupted ? autoRepairEncoding(Buffer.from(rawContent, 'latin1')) : fixedSrt
        });
      } catch (err) {
        sendJson(res, 400, { success: false, error: err.message });
      }
      return;
    }

    // 4. Static UI Serving
    let safePath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.join(uiDir, safePath);

    if (!isPathSafe(uiDir, filePath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('403 Forbidden - Access Denied');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    });
  });

  return server;
}

function startServer({ port = 3023 } = {}) {
  const server = createServer();
  server.listen(port, () => {
    console.log(`\n${ansi.bold(ansi.cyan('╔════════════════════════════════════════════════════════════╗'))}`);
    console.log(`${ansi.bold(ansi.cyan('║'))}  ${ansi.bold(ansi.green('SubSyncKit Web Studio'))} is live!                              ${ansi.bold(ansi.cyan('║'))}`);
    console.log(`${ansi.bold(ansi.cyan('║'))}  ${ansi.yellow(`http://localhost:${port}`)}                                      ${ansi.bold(ansi.cyan('║'))}`);
    console.log(`${ansi.bold(ansi.cyan('╚════════════════════════════════════════════════════════════╝'))}\n`);
    console.log(ansi.gray('Press Ctrl+C to terminate the server.\n'));
  });
  return server;
}

module.exports = {
  createServer,
  startServer,
  isPathSafe
};

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  decodeWindows1256,
  repairMojibakeString,
  isWindows1256Corrupted,
  autoRepairEncoding
} = require('../src/core/encoding');

test('decodeWindows1256: decodes raw Windows-1256 bytes to Persian UTF-8', () => {
  // 'س' = 0xD3, 'ل' = 0xE1, 'ا' = 0xC7, 'م' = 0xE3  --> سلام
  const salamBuf = Buffer.from([0xD3, 0xE1, 0xC7, 0xE3]);
  assert.equal(decodeWindows1256(salamBuf), 'سلام');

  // Persian letters: پ (0x81), چ (0x8D), ژ (0x8E), گ (0x90)
  const persianLetters = Buffer.from([0x81, 0x8D, 0x8E, 0x90]);
  assert.equal(decodeWindows1256(persianLetters), 'پچژگ');
});

test('repairMojibakeString: repairs corrupted Latin-1 strings back to Persian', () => {
  // "ÓáÇã" is سلام decoded as Latin1
  assert.equal(repairMojibakeString('ÓáÇã'), 'سلام');
});

test('autoRepairEncoding: preserves clean UTF-8 with BOM and without BOM', () => {
  const cleanStr = 'این یک متن تمیز یونیکد است.';
  assert.equal(autoRepairEncoding(cleanStr), cleanStr);

  const bomBuf = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(cleanStr, 'utf8')]);
  assert.equal(autoRepairEncoding(bomBuf), cleanStr);
});

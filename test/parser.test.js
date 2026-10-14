const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseTimecode,
  formatTimecode,
  parseSrt,
  serializeSrt,
  getSrtInfo
} = require('../src/core/parser');

test('parseTimecode: accurately converts SRT timecodes to milliseconds', () => {
  assert.equal(parseTimecode('00:00:01,500'), 1500);
  assert.equal(parseTimecode('00:01:23,456'), 83456);
  assert.equal(parseTimecode('01:00:00,000'), 3600000);
  assert.equal(parseTimecode('00:00:02.125'), 2125); // handles dot separator
});

test('formatTimecode: converts milliseconds to standard SRT timecode format', () => {
  assert.equal(formatTimecode(1500), '00:00:01,500');
  assert.equal(formatTimecode(83456), '00:01:23,456');
  assert.equal(formatTimecode(3600000), '01:00:00,000');
  assert.equal(formatTimecode(-500), '00:00:00,000'); // clamps negative numbers
});

test('parseSrt & serializeSrt: parses and round-trips standard SRT content', () => {
  const sample = `1
00:00:01,000 --> 00:00:04,000
First subtitle line

2
00:00:05,500 --> 00:00:08,200
Second subtitle line
Line two`;

  const cues = parseSrt(sample);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].id, 1);
  assert.equal(cues[0].startMs, 1000);
  assert.equal(cues[0].endMs, 4000);
  assert.equal(cues[0].text, 'First subtitle line');

  assert.equal(cues[1].id, 2);
  assert.equal(cues[1].startMs, 5500);
  assert.equal(cues[1].endMs, 8200);

  const serialized = serializeSrt(cues);
  assert.ok(serialized.includes('00:00:01,000 --> 00:00:04,000'));
  assert.ok(serialized.includes('Second subtitle line\nLine two'));
});

test('getSrtInfo: calculates duration and cue statistics accurately', () => {
  const sample = `1
00:00:02,000 --> 00:00:05,000
Hello

2
00:00:10,000 --> 00:00:15,000
World`;

  const info = getSrtInfo(sample);
  assert.equal(info.totalCues, 2);
  assert.equal(info.firstStartMs, 2000);
  assert.equal(info.lastEndMs, 15000);
  assert.equal(info.durationMs, 13000);
  assert.equal(info.durationFormatted, '00:00:13,000');
});

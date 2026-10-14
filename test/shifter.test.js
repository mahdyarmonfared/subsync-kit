const test = require('node:test');
const assert = require('node:assert/strict');
const { parseOffset, shiftCues, shiftSrt } = require('../src/core/shifter');

test('parseOffset: parses various human offset string formats', () => {
  assert.equal(parseOffset('+1.5s'), 1500);
  assert.equal(parseOffset('-800ms'), -800);
  assert.equal(parseOffset('2.5s'), 2500);
  assert.equal(parseOffset('+3000'), 3000000); // default 's' without unit
  assert.equal(parseOffset(500), 500);
});

test('shiftCues: shifts cue timecodes forward and backward accurately', () => {
  const cues = [
    { id: 1, startMs: 2000, endMs: 5000, text: 'Hello' }
  ];

  // Shift +1.5s (+1500ms)
  const forward = shiftCues(cues, '+1.5s');
  assert.equal(forward.cues[0].startMs, 3500);
  assert.equal(forward.cues[0].endMs, 6500);
  assert.equal(forward.cues[0].startTimecode, '00:00:03,500');

  // Shift -1s (-1000ms)
  const backward = shiftCues(cues, '-1s');
  assert.equal(backward.cues[0].startMs, 1000);
  assert.equal(backward.cues[0].endMs, 4000);
});

test('shiftCues: handles negative clipping and drops cues before 0', () => {
  const cues = [
    { id: 1, startMs: 1000, endMs: 2000, text: 'Early' },
    { id: 2, startMs: 5000, endMs: 8000, text: 'Later' }
  ];

  // Shift by -3000ms: cue 1 will end at -1000ms (dropped), cue 2 starts at 2000ms
  const res = shiftCues(cues, '-3s');
  assert.equal(res.droppedCount, 1);
  assert.equal(res.shiftedCount, 1);
  assert.equal(res.cues[0].text, 'Later');
  assert.equal(res.cues[0].startMs, 2000);
});

test('shiftSrt: shifts complete SRT string and formats output properly', () => {
  const sample = `1
00:00:01,000 --> 00:00:03,000
Testing shift`;

  const res = shiftSrt(sample, '+2s');
  assert.ok(res.outputSrt.includes('00:00:03,000 --> 00:00:05,000'));
  assert.equal(res.shiftedCount, 1);
});

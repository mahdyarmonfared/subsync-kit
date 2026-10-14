/**
 * SubSyncKit - Core Time Shifter Engine
 * Precision millisecond audio/video synchronization for subtitle cues.
 */

const { parseSrt, serializeSrt, formatTimecode } = require('./parser');

/**
 * Parses human offset string (e.g. "+1.5s", "-800ms", "2s", "-3500") into milliseconds.
 */
function parseOffset(offsetInput) {
  if (typeof offsetInput === 'number') {
    return Math.round(offsetInput);
  }

  if (typeof offsetInput !== 'string') {
    throw new TypeError(`Offset must be a string or number, got ${typeof offsetInput}`);
  }

  const str = offsetInput.trim();
  const match = str.match(/^([+-]?\d+(?:\.\d+)?)\s*(ms|s|m)?$/i);
  if (!match) {
    throw new Error(`Invalid offset format: "${offsetInput}". Examples: "+1.5s", "-800ms", "+2000"`);
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || 's').toLowerCase();

  if (unit === 'ms') {
    return Math.round(value);
  } else if (unit === 'm') {
    return Math.round(value * 60 * 1000);
  } else {
    // Default unit is seconds
    return Math.round(value * 1000);
  }
}

/**
 * Shifts an array of cue objects by offset in milliseconds and optional speed ratio.
 */
function shiftCues(cues, offsetInput, options = {}) {
  const offsetMs = parseOffset(offsetInput);
  const speedRatio = typeof options.speedRatio === 'number' && options.speedRatio > 0 ? options.speedRatio : 1.0;
  const dropNegative = options.dropNegative !== false; // Default: drop completely negative cues

  const shiftedCues = [];
  let droppedCount = 0;

  for (const cue of cues) {
    // 1. Apply speed ratio if different from 1.0
    let start = cue.startMs;
    let end = cue.endMs;

    if (speedRatio !== 1.0) {
      start = Math.round(start * speedRatio);
      end = Math.round(end * speedRatio);
    }

    // 2. Apply millisecond offset
    start += offsetMs;
    end += offsetMs;

    // 3. Handle cues that fall before 00:00:00,000
    if (end <= 0) {
      if (dropNegative) {
        droppedCount++;
        continue;
      } else {
        start = 0;
        end = 0;
      }
    } else if (start < 0) {
      start = 0;
    }

    shiftedCues.push({
      id: shiftedCues.length + 1,
      startMs: start,
      endMs: end,
      startTimecode: formatTimecode(start),
      endTimecode: formatTimecode(end),
      durationMs: Math.max(0, end - start),
      text: cue.text
    });
  }

  return {
    cues: shiftedCues,
    appliedOffsetMs: offsetMs,
    appliedSpeedRatio: speedRatio,
    shiftedCount: shiftedCues.length,
    droppedCount
  };
}

/**
 * Convenience method: parses SRT, shifts, and returns serialized SRT string and metadata.
 */
function shiftSrt(srtContent, offsetInput, options = {}) {
  const originalCues = parseSrt(srtContent);
  const result = shiftCues(originalCues, offsetInput, options);
  const outputSrt = serializeSrt(result.cues);

  return {
    outputSrt,
    cues: result.cues,
    totalCues: originalCues.length,
    shiftedCount: result.shiftedCount,
    droppedCount: result.droppedCount,
    appliedOffsetMs: result.appliedOffsetMs,
    appliedSpeedRatio: result.appliedSpeedRatio
  };
}

module.exports = {
  parseOffset,
  shiftCues,
  shiftSrt
};

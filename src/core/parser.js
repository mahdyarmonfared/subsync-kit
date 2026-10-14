/**
 * SubSyncKit - Core SRT Parser & Serializer
 * Zero-dependency pure Node.js parser for standard SubRip (.srt) subtitle files.
 */

/**
 * Parses an SRT timecode (e.g. 00:01:23,456 or 00:01:23.456) into milliseconds.
 */
function parseTimecode(tcStr) {
  if (typeof tcStr !== 'string') {
    throw new TypeError(`Timecode must be a string, got ${typeof tcStr}`);
  }

  const match = tcStr.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (!match) {
    throw new Error(`Invalid SRT timecode format: "${tcStr}". Expected HH:MM:SS,mmm`);
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const millis = parseInt(match[4].padEnd(3, '0').slice(0, 3), 10);

  return ((hours * 3600 + minutes * 60 + seconds) * 1000) + millis;
}

/**
 * Formats milliseconds into standard SRT timecode (HH:MM:SS,mmm).
 */
function formatTimecode(ms) {
  const safeMs = Math.max(0, Math.round(Number(ms) || 0));

  const totalSec = Math.floor(safeMs / 1000);
  const millis = safeMs % 1000;

  const seconds = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const minutes = totalMin % 60;
  const hours = Math.floor(totalMin / 60);

  const pad = (n, len = 2) => String(n).padStart(len, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(millis, 3)}`;
}

/**
 * Parses raw SRT string content into structured subtitle cues.
 */
function parseSrt(srtContent) {
  if (typeof srtContent !== 'string') {
    srtContent = String(srtContent || '');
  }

  // Strip UTF-8 BOM if present
  if (srtContent.charCodeAt(0) === 0xFEFF) {
    srtContent = srtContent.slice(1);
  }

  // Normalize line endings to \n
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  // Blocks are separated by two or more newlines
  const rawBlocks = normalized.split(/\n\s*\n/);
  const cues = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const lines = rawBlocks[i].trim().split('\n');
    if (lines.length < 2) continue;

    // Line 0 is usually the index number
    // Line 1 is the timecode: 00:00:20,000 --> 00:00:24,400
    // Sometimes index is missing and Line 0 is the timecode
    let timeLineIdx = 1;
    let cueId = parseInt(lines[0], 10);

    if (lines[0].includes('-->')) {
      timeLineIdx = 0;
      cueId = cues.length + 1;
    }

    const timeLine = lines[timeLineIdx];
    if (!timeLine || !timeLine.includes('-->')) {
      continue;
    }

    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim().split(' ')[0]);

    try {
      const startMs = parseTimecode(startStr);
      const endMs = parseTimecode(endStr);
      const textLines = lines.slice(timeLineIdx + 1);
      const text = textLines.join('\n');

      cues.push({
        id: isNaN(cueId) ? cues.length + 1 : cueId,
        startMs,
        endMs,
        startTimecode: formatTimecode(startMs),
        endTimecode: formatTimecode(endMs),
        durationMs: Math.max(0, endMs - startMs),
        text
      });
    } catch {
      // Skip malformed cue
      continue;
    }
  }

  return cues;
}

/**
 * Serializes cue objects back into standard SubRip (.srt) format.
 */
function serializeSrt(cues) {
  if (!Array.isArray(cues)) {
    return '';
  }

  return cues
    .map((cue, idx) => {
      const id = idx + 1;
      const start = formatTimecode(cue.startMs);
      const end = formatTimecode(cue.endMs);
      const text = (cue.text || '').trim();
      return `${id}\n${start} --> ${end}\n${text}`;
    })
    .join('\n\n') + '\n';
}

/**
 * Calculates subtitle metadata (cue count, duration, start/end).
 */
function getSrtInfo(srtContent) {
  const cues = Array.isArray(srtContent) ? srtContent : parseSrt(srtContent);
  if (cues.length === 0) {
    return {
      totalCues: 0,
      firstStartMs: 0,
      lastEndMs: 0,
      durationMs: 0,
      durationFormatted: '00:00:00,000'
    };
  }

  const firstStartMs = cues[0].startMs;
  const lastEndMs = cues[cues.length - 1].endMs;
  const durationMs = Math.max(0, lastEndMs - firstStartMs);

  return {
    totalCues: cues.length,
    firstStartMs,
    lastEndMs,
    firstStartTimecode: cues[0].startTimecode,
    lastEndTimecode: cues[cues.length - 1].endTimecode,
    durationMs,
    durationFormatted: formatTimecode(durationMs)
  };
}

module.exports = {
  parseTimecode,
  formatTimecode,
  parseSrt,
  serializeSrt,
  getSrtInfo
};

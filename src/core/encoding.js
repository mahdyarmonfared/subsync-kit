/**
 * SubSyncKit - Core Encoding Repair Utility
 * Converts legacy Windows-1256 (CP1256 / ANSI) Persian subtitles into clean UTF-8.
 * Fixes notorious Persian mojibake (e.g. ÓáÇã -> سلام).
 * 100% pure Node.js with zero external dependencies.
 */

// Windows-1256 byte mapping table for code points 0x80 to 0xFF
const WIN1256_TABLE = {
  0x80: '\u20AC', // Euro Sign
  0x81: '\u067E', // پ (Pe)
  0x82: '\u201A', // Single Low-9 Quotation Mark
  0x83: '\u0192', // Latin Small Letter F With Hook
  0x84: '\u201E', // Double Low-9 Quotation Mark
  0x85: '\u2026', // Horizontal Ellipsis
  0x86: '\u2020', // Dagger
  0x87: '\u2021', // Double Dagger
  0x88: '\u02C6', // Modifier Letter Circumflex Accent
  0x89: '\u2030', // Per Mille Sign
  0x8A: '\u0679', // ٺ (Tcheh)
  0x8B: '\u2039', // Single Left-Pointing Angle Quotation Mark
  0x8C: '\u0152', // Latin Capital Ligature OE
  0x8D: '\u0686', // چ (Che)
  0x8E: '\u0698', // ژ (Zhe)
  0x8F: '\u06A1', // ڱ
  0x90: '\u06AF', // گ (Gaf)
  0x91: '\u2018', // Left Single Quotation Mark
  0x92: '\u2019', // Right Single Quotation Mark
  0x93: '\u201C', // Left Double Quotation Mark
  0x94: '\u201D', // Right Double Quotation Mark
  0x95: '\u2022', // Bullet
  0x96: '\u2013', // En Dash
  0x97: '\u2014', // Em Dash
  0x98: '\u06A9', // ک (Ke)
  0x99: '\u2122', // Trade Mark Sign
  0x9A: '\u06BC', // ڻ
  0x9B: '\u203A', // Single Right-Pointing Angle Quotation Mark
  0x9C: '\u0153', // Latin Small Ligature OE
  0x9D: '\u200C', // Zero Width Non-Joiner (نیم‌فاصله)
  0x9E: '\u200D', // Zero Width Joiner
  0x9F: '\u06D2', // ے
  0xA0: '\u00A0', // Non-Breaking Space
  0xA1: '\u060C', // ، (Arabic Comma)
  0xA2: '\u00A2', // Cent Sign
  0xA3: '\u00A3', // Pound Sign
  0xA4: '\u00A4', // Currency Sign
  0xA5: '\u00A5', // Yen Sign
  0xA6: '\u00A6', // Broken Bar
  0xA7: '\u00A7', // Section Sign
  0xA8: '\u00A8', // Diaeresis
  0xA9: '\u00A9', // Copyright Sign
  0xAA: '\u06BE', // ھ
  0xAB: '\u00AB', // Left-Pointing Double Angle Quotation Mark
  0xAC: '\u00AC', // Not Sign
  0xAD: '\u00AD', // Soft Hyphen
  0xAE: '\u00AE', // Registered Sign
  0xAF: '\u00AF', // Macron
  0xB0: '\u00B0', // Degree Sign
  0xB1: '\u00B1', // Plus-Minus Sign
  0xB2: '\u00B2', // Superscript Two
  0xB3: '\u00B3', // Superscript Three
  0xB4: '\u00B4', // Acute Accent
  0xB5: '\u00B5', // Micro Sign
  0xB6: '\u00B6', // Pilcrow Sign
  0xB7: '\u00B7', // Middle Dot
  0xB8: '\u00B8', // Cedilla
  0xB9: '\u00B9', // Superscript One
  0xBA: '\u061B', // ؛ (Arabic Semicolon)
  0xBB: '\u00BB', // Right-Pointing Double Angle Quotation Mark
  0xBC: '\u00BC', // Vulgar Fraction One Quarter
  0xBD: '\u00BD', // Vulgar Fraction One Half
  0xBE: '\u00BE', // Vulgar Fraction Three Quarters
  0xBF: '\u061F', // ؟ (Arabic Question Mark)
  0xC0: '\u06C1', // ه
  0xC1: '\u0621', // ء (Hamza)
  0xC2: '\u0622', // آ (Alef Madda)
  0xC3: '\u0623', // أ (Alef Hamza Above)
  0xC4: '\u0624', // ؤ (Waw Hamza)
  0xC5: '\u0625', // إ (Alef Hamza Below)
  0xC6: '\u0626', // ئ (Yeh Hamza)
  0xC7: '\u0627', // ا (Alef)
  0xC8: '\u0628', // ب (Beh)
  0xC9: '\u0629', // ة (Teh Marbuta)
  0xCA: '\u062A', // ت (Teh)
  0xCB: '\u062B', // ث (Theh)
  0xCC: '\u062C', // ج (Jeem)
  0xCD: '\u062D', // ح (Hah)
  0xCE: '\u062E', // خ (Khah)
  0xCF: '\u062F', // د (Dal)
  0xD0: '\u0630', // ذ (Thal)
  0xD1: '\u0631', // ر (Reh)
  0xD2: '\u0632', // ز (Zain)
  0xD3: '\u0633', // س (Seen)
  0xD4: '\u0634', // ش (Sheen)
  0xD5: '\u0635', // ص (Sad)
  0xD6: '\u0636', // ض (Dad)
  0xD7: '\u00D7', // Multiplication Sign
  0xD8: '\u0637', // ط (Tah)
  0xD9: '\u0638', // ظ (Zah)
  0xDA: '\u0639', // ع (Ain)
  0xDB: '\u063A', // غ (Ghain)
  0xDC: '\u0640', // ـ (Tatweel)
  0xDD: '\u0641', // ف (Feh)
  0xDE: '\u0642', // ق (Qaf)
  0xDF: '\u06A9', // ک (Persian Kaf)
  0xE0: '\u00E0', // à
  0xE1: '\u0644', // ل (Lam)
  0xE2: '\u00E2', // â
  0xE3: '\u0645', // م (Meem)
  0xE4: '\u0646', // ن (Noon)
  0xE5: '\u0647', // ه (Heh)
  0xE6: '\u0648', // و (Waw)
  0xE7: '\u00E7', // ç
  0xE8: '\u00E8', // è
  0xE9: '\u00E9', // é
  0xEA: '\u00EA', // ê
  0xEB: '\u00EB', // ë
  0xEC: '\u06CC', // ی (Persian Yeh)
  0xED: '\u06CC', // ی (Yeh)
  0xEE: '\u00EE', // î
  0xEF: '\u00EF', // ï
  0xF0: '\u064B', // ً (Fathatan)
  0xF1: '\u064C', // ٌ (Dammatan)
  0xF2: '\u064D', // ٍ (Kasratan)
  0xF3: '\u064E', // َ (Fatha)
  0xF4: '\u00F4', // ô
  0xF5: '\u064F', // ُ (Damma)
  0xF6: '\u0650', // ِ (Kasra)
  0xF7: '\u00F7', // Division Sign
  0xF8: '\u0651', // ّ (Shadda)
  0xF9: '\u00F9', // ù
  0xFA: '\u0652', // ْ (Sukun)
  0xFB: '\u00FB', // û
  0xFC: '\u00FC', // ü
  0xFD: '\u200E', // Left-to-Right Mark
  0xFE: '\u200F', // Right-to-Left Mark
  0xFF: '\u06D2'  // ے
};

/**
 * Decodes a raw Buffer containing Windows-1256 encoded bytes into clean UTF-8 string.
 */
function decodeWindows1256(buf) {
  if (!Buffer.isBuffer(buf)) {
    buf = Buffer.from(buf);
  }

  let result = '';
  const len = buf.length;

  for (let i = 0; i < len; i++) {
    const byte = buf[i];
    if (byte < 0x80) {
      // Standard ASCII
      result += String.fromCharCode(byte);
    } else {
      result += WIN1256_TABLE[byte] || String.fromCharCode(byte);
    }
  }

  return result;
}

/**
 * Repairs a string that was accidentally read or decoded as Latin-1 / ISO-8859-1.
 * e.g. "ÓáÇã" -> "سلام"
 */
function repairMojibakeString(str) {
  if (typeof str !== 'string') return '';

  let repaired = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0x80 && code <= 0xFF && WIN1256_TABLE[code]) {
      repaired += WIN1256_TABLE[code];
    } else {
      repaired += str[i];
    }
  }
  return repaired;
}

/**
 * Checks whether text or buffer appears to be Windows-1256 / corrupted mojibake.
 */
function isWindows1256Corrupted(input) {
  if (Buffer.isBuffer(input)) {
    try {
      const decodedUtf8 = input.toString('utf8');
      if (decodedUtf8.includes('\uFFFD')) {
        return true;
      }
    } catch {
      return true;
    }
    return false;
  }

  const str = String(input);
  const mojibakePatterns = /[ÓáÇãí˜ÊÓÇÔ]/;
  const highLatinCount = (str.match(/[\u0080-\u00FF]/g) || []).length;
  const persianCount = (str.match(/[\u0600-\u06FF]/g) || []).length;

  return (highLatinCount > 0 && persianCount === 0 && (mojibakePatterns.test(str) || highLatinCount >= 3));
}

/**
 * Auto-detects and converts input (Buffer or string) into clean UTF-8.
 */
function autoRepairEncoding(input) {
  if (Buffer.isBuffer(input)) {
    // Check for UTF-8 BOM: 0xEF, 0xBB, 0xBF
    if (input[0] === 0xEF && input[1] === 0xBB && input[2] === 0xBF) {
      return input.subarray(3).toString('utf8');
    }

    const utf8Str = input.toString('utf8');
    if (!utf8Str.includes('\uFFFD') && !isWindows1256Corrupted(utf8Str)) {
      return utf8Str;
    }

    return decodeWindows1256(input);
  }

  const str = String(input);
  if (isWindows1256Corrupted(str)) {
    return repairMojibakeString(str);
  }

  return str;
}

module.exports = {
  WIN1256_TABLE,
  decodeWindows1256,
  repairMojibakeString,
  isWindows1256Corrupted,
  autoRepairEncoding
};

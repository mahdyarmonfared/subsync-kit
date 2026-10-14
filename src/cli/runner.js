/**
 * SubSyncKit - CLI Command Runner
 */

const fs = require('fs');
const path = require('path');
const ansi = require('./ansi');
const { parseSrt, getSrtInfo } = require('../core/parser');
const { shiftSrt, parseOffset } = require('../core/shifter');
const { autoRepairEncoding, isWindows1256Corrupted } = require('../core/encoding');
const { startServer } = require('../server/server');

function printHelp() {
  console.log(`
${ansi.bold(ansi.cyan('SubSyncKit'))} - Zero-Dependency Subtitle Synchronizer & Encoding Repair CLI

${ansi.bold('USAGE:')}
  ${ansi.green('subsync')} ${ansi.yellow('<command>')} [options]

${ansi.bold('COMMANDS:')}
  ${ansi.yellow('shift')} <file.srt> <offset> [-o output.srt]    Shift all timecodes by offset (+1.5s, -800ms)
  ${ansi.yellow('fix-encoding')} <file.srt> [-o output.srt]     Repair Windows-1256/ANSI mojibake to clean UTF-8
  ${ansi.yellow('info')} <file.srt>                             Analyze subtitle duration, cues, and timecodes
  ${ansi.yellow('ui')} [--port <number>]                        Launch interactive Web Studio (default: 3023)
  ${ansi.yellow('help')}                                        Show this help manual

${ansi.bold('EXAMPLES:')}
  ${ansi.gray('# Shift subtitle forward by 1.5 seconds:')}
  subsync shift movie.srt +1.5s -o movie_synced.srt

  ${ansi.gray('# Shift subtitle backward by 800 milliseconds:')}
  subsync shift movie.srt -800ms

  ${ansi.gray('# Repair scrambled Persian subtitle font:')}
  subsync fix-encoding persian_sub.srt -o clean_sub.srt

  ${ansi.gray('# Inspect subtitle metadata:')}
  subsync info movie.srt

  ${ansi.gray('# Launch local Web Studio on port 3023:')}
  subsync ui
`);
}

function handleShift(args) {
  if (args.length < 2) {
    console.error(ansi.red('Error: Requires both <file.srt> and <offset>.'));
    console.log('Usage: subsync shift <file.srt> <offset> [-o output.srt]');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);
  const offsetStr = args[1];

  let outPath = null;
  const outIdx = args.indexOf('-o');
  if (outIdx !== -1 && args[outIdx + 1]) {
    outPath = path.resolve(args[outIdx + 1]);
  } else {
    const ext = path.extname(filePath);
    const base = filePath.slice(0, -ext.length);
    outPath = `${base}_synced${ext}`;
  }

  if (!fs.existsSync(filePath)) {
    console.error(ansi.red(`Error: File not found at "${filePath}"`));
    process.exit(1);
  }

  try {
    const rawBuffer = fs.readFileSync(filePath);
    const cleanContent = autoRepairEncoding(rawBuffer);

    const shiftRes = shiftSrt(cleanContent, offsetStr);

    fs.writeFileSync(outPath, shiftRes.outputSrt, 'utf8');

    console.log(`\n${ansi.bold(ansi.cyan('=== Subtitle Shift Complete ==='))}`);
    console.log(`${ansi.bold('Input File:')}    ${filePath}`);
    console.log(`${ansi.bold('Output File:')}   ${ansi.green(outPath)}`);
    console.log(`${ansi.bold('Offset Applied:')} ${ansi.yellow((shiftRes.appliedOffsetMs > 0 ? '+' : '') + shiftRes.appliedOffsetMs + 'ms')}`);
    console.log(`${ansi.bold('Total Cues:')}    ${shiftRes.totalCues}`);
    console.log(`${ansi.bold('Synced Cues:')}   ${ansi.green(shiftRes.shiftedCount)}`);
    if (shiftRes.droppedCount > 0) {
      console.log(`${ansi.bold('Dropped (<=0):')} ${ansi.red(shiftRes.droppedCount)}`);
    }
    console.log('');
  } catch (err) {
    console.error(ansi.red(`Shift Error: ${err.message}`));
    process.exit(1);
  }
}

function handleFixEncoding(args) {
  if (args.length === 0) {
    console.error(ansi.red('Error: Missing <file.srt> argument.'));
    console.log('Usage: subsync fix-encoding <file.srt> [-o output.srt]');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);
  let outPath = null;
  const outIdx = args.indexOf('-o');
  if (outIdx !== -1 && args[outIdx + 1]) {
    outPath = path.resolve(args[outIdx + 1]);
  } else {
    const ext = path.extname(filePath);
    const base = filePath.slice(0, -ext.length);
    outPath = `${base}_utf8${ext}`;
  }

  if (!fs.existsSync(filePath)) {
    console.error(ansi.red(`Error: File not found at "${filePath}"`));
    process.exit(1);
  }

  try {
    const rawBuffer = fs.readFileSync(filePath);
    const wasCorrupted = isWindows1256Corrupted(rawBuffer);
    const fixedContent = autoRepairEncoding(rawBuffer);

    fs.writeFileSync(outPath, fixedContent, 'utf8');

    console.log(`\n${ansi.bold(ansi.cyan('=== Encoding Repair Complete ==='))}`);
    console.log(`${ansi.bold('Input File:')}       ${filePath}`);
    console.log(`${ansi.bold('Output (UTF-8):')}   ${ansi.green(outPath)}`);
    console.log(`${ansi.bold('Original Encoding:')} ${wasCorrupted ? ansi.yellow('Windows-1256 / ANSI') : ansi.green('Already UTF-8')}`);
    console.log(`${ansi.bold('Status:')}           ${ansi.green('Successfully converted to Clean UTF-8')}\n`);
  } catch (err) {
    console.error(ansi.red(`Encoding Fix Error: ${err.message}`));
    process.exit(1);
  }
}

function handleInfo(args) {
  if (args.length === 0) {
    console.error(ansi.red('Error: Missing <file.srt> argument.'));
    console.log('Usage: subsync info <file.srt>');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);
  if (!fs.existsSync(filePath)) {
    console.error(ansi.red(`Error: File not found at "${filePath}"`));
    process.exit(1);
  }

  try {
    const rawBuffer = fs.readFileSync(filePath);
    const wasCorrupted = isWindows1256Corrupted(rawBuffer);
    const content = autoRepairEncoding(rawBuffer);
    const info = getSrtInfo(content);

    console.log(`\n${ansi.bold(ansi.cyan('╔════════════════════════════════════════════════════════════╗'))}`);
    console.log(`${ansi.bold(ansi.cyan('║'))}  ${ansi.bold(ansi.green('Subtitle File Info:'))} ${path.basename(filePath)}`);
    console.log(`${ansi.bold(ansi.cyan('║'))}  Total Cues:       ${ansi.yellow(info.totalCues)}`);
    console.log(`${ansi.bold(ansi.cyan('║'))}  First Cue Starts: ${ansi.gray(info.firstStartTimecode || 'N/A')}`);
    console.log(`${ansi.bold(ansi.cyan('║'))}  Last Cue Ends:    ${ansi.gray(info.lastEndTimecode || 'N/A')}`);
    console.log(`${ansi.bold(ansi.cyan('║'))}  Total Duration:   ${ansi.cyan(info.durationFormatted)}`);
    console.log(`${ansi.bold(ansi.cyan('║'))}  Detected Encoding: ${wasCorrupted ? ansi.yellow('Windows-1256 (Mojibake detected)') : ansi.green('UTF-8 Clean')}`);
    console.log(`${ansi.bold(ansi.cyan('╚════════════════════════════════════════════════════════════╝'))}\n`);
  } catch (err) {
    console.error(ansi.red(`Info Error: ${err.message}`));
    process.exit(1);
  }
}

function handleUi(args) {
  let port = 3023;
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    const p = parseInt(args[portIdx + 1], 10);
    if (!isNaN(p) && p > 0) port = p;
  }
  startServer({ port });
}

function run(argv) {
  const args = argv.slice(2);
  const command = args[0] || 'help';
  const commandArgs = args.slice(1);

  switch (command) {
    case 'shift':
    case 'sync':
      handleShift(commandArgs);
      break;
    case 'fix-encoding':
    case 'fix':
      handleFixEncoding(commandArgs);
      break;
    case 'info':
      handleInfo(commandArgs);
      break;
    case 'ui':
    case 'serve':
      handleUi(commandArgs);
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    case '--version':
    case '-v':
      console.log('subsync-kit v1.0.0');
      break;
    default:
      console.error(ansi.red(`Unknown command: "${command}"`));
      printHelp();
      process.exit(1);
  }
}

module.exports = {
  run
};

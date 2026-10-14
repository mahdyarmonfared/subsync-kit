/**
 * SubSyncKit - Core Index Module
 */

const parser = require('./parser');
const shifter = require('./shifter');
const encoding = require('./encoding');

module.exports = {
  ...parser,
  ...shifter,
  ...encoding
};

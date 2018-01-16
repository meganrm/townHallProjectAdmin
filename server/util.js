const utils = {};

utils.zeropadding = (num) => {
  let padding = '00';
  let tobepadded = num.toString();
  let padded = padding.slice(0, padding.length - tobepadded.length) + tobepadded;
  return padded;
};

module.exports = utils;

const crypto = require('crypto');

const generatePepper = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

const pepper = generatePepper();
console.log(`Generated Pepper: ${pepper}`);

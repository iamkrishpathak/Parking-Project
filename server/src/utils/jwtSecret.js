const MIN_SECRET_BYTES = 32;

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error(`JWT_SECRET must be configured with at least ${MIN_SECRET_BYTES} bytes`);
  }
  return secret;
};

module.exports = getJwtSecret;

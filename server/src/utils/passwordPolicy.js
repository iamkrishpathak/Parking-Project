const PASSWORD_POLICY_MESSAGE = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol. It can be at most 72 UTF-8 bytes.';

const validatePassword = (password) => {
  if (typeof password !== 'string') return PASSWORD_POLICY_MESSAGE;
  const meetsRules = password.length >= 8
    && Buffer.byteLength(password, 'utf8') <= 72
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9\s]/.test(password);
  return meetsRules ? null : PASSWORD_POLICY_MESSAGE;
};

module.exports = { PASSWORD_POLICY_MESSAGE, validatePassword };

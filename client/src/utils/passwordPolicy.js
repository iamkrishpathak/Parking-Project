export const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { key: 'lowercase', label: 'One lowercase letter (a–z)', test: (value) => /[a-z]/.test(value) },
  { key: 'uppercase', label: 'One uppercase letter (A–Z)', test: (value) => /[A-Z]/.test(value) },
  { key: 'number', label: 'One number (0–9)', test: (value) => /\d/.test(value) },
  { key: 'symbol', label: 'One symbol (for example ! or #)', test: (value) => /[^A-Za-z0-9\s]/.test(value) },
  { key: 'maxBytes', label: 'No more than 72 bytes', test: (value) => new TextEncoder().encode(value).length <= 72 },
];

export const isPasswordValid = (value) => PASSWORD_RULES.every((rule) => rule.test(value));

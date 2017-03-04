const OFF = 'off';
const WARN = 'warn';
const ERROR = 'error';

module.exports = {
  "extends": "airbnb-base",
  "plugins": [
    "import"
  ],
  "rules": {
    "no-unused-vars": [
      ERROR,
      {
        vars: 'all',
        args: 'none',
      },
    ],
    'semi': [
      ERROR,
      'always',
    ],
    'vars-on-top': OFF,
    'no-plusplus': OFF,
    'no-var': OFF,
    'prefer-template': OFF,
    'quote-props': [
      ERROR,
      'consistent',
    ],
    'no-console': [
      "error",
      { allow: ["warn", "error", "log"] }],
    'consistent-return': [
      OFF,
    ],
  },
}

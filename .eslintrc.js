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
    'prefer-arrow-callback': OFF,
    'no-undef': OFF,
    'vars-on-top': OFF,
    'no-plusplus': OFF,
    'no-var': OFF,
    'func-names': OFF,
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

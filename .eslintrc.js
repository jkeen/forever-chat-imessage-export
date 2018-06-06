module.exports = {
  "env": {
    "browser": false,
    "es6": true,
    "node": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 2017
  },
  "rules": {
    "indent": [
      "error",
      2
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],
    "quotes": 0,
    "no-extra-boolean-cast": 0,
    "no-console": 0,
    "no-var": 0,
    "semi": [
      "error",
      "always"
    ],
    "mocha/no-exclusive-tests": "error"
  },
  "plugins": [
    "mocha"
  ],
  "globals": {
    "before": true,
    "beforeEach": true,
    "afterEach": true,
    "spy": true,
    "describe": true,
    "it": true
  }
};

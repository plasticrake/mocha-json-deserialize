module.exports = {
  env: {
    browser: false,
    commonjs: true,
    node: false,
  },
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  overrides: [
    {
      env: {
        node: true,
        mocha: true,
      },
      files: ['examples/*.js'],
      rules: {
        'import/no-unresolved': 'off',
        'func-names': 'off',
        'no-console': 'off',
      },
    },
  ],
  parserOptions: {
    ecmaVersion: 2018,
  },
  reportUnusedDisableDirectives: true,
  rules: {},
};

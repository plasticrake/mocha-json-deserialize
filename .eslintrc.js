module.exports = {
  env: {
    browser: false,
    commonjs: true,
    node: false,
  },
  extends: ['airbnb-base', 'plugin:prettier/recommended'],
  overrides: [
    {
      files: ['examples/*.js'],
      rules: {
        'import/no-unresolved': 'off',
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

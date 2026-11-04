// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const { defaultConditionNames } = require('eslint-import-resolver-typescript');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    settings: {
      // @rakushifu/core を Metro・tsc と同じく "rakushifu-source" 条件で src から解決する
      // （既定の node resolver だと dist を探し、未ビルドだと import/no-unresolved になる）
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
          conditionNames: ['rakushifu-source', ...defaultConditionNames],
        },
      },
    },
  },
]);

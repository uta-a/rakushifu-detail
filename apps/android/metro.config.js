// monorepo の設定（watchFolders など）は SDK 52 以降 expo/metro-config が自動で行う。
// ここで足すのは @rakushifu/core を dist ではなく src の TS から読むための条件だけ。
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.unstable_conditionNames = [
  'source',
  ...(config.resolver.unstable_conditionNames ?? []),
];

module.exports = config;

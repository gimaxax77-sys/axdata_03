// Core 시스템은 .mjs(ESM)로 작성되어 있으므로 Metro가 해석하도록 확장자 추가.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('mjs');

// supabase-js가 선택적으로 동적 import 하는 @opentelemetry/api 를 빈 모듈로 대체.
//   Metro가 이 선택적 의존성을 정적으로 해석하려다 실패하는 것을 막는다
//   (런타임 텔레메트리는 게임에 불필요 → 없어도 무해).
const EMPTY = path.resolve(__dirname, 'app/backend/emptyModule.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@opentelemetry/api') {
    return { type: 'sourceFile', filePath: EMPTY };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

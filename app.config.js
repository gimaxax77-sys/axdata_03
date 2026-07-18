// 두 제품(판타지/SF)을 하나의 코드베이스로 빌드하기 위한 동적 설정.
//   기본:            판타지 "엘드리아 연대기"
//   APP_VARIANT=scifi: SF "오비탈 프로토콜"
// app.json을 베이스(config)로 받아 변형(이름·아이콘·번들ID·컨셉)을 덮어쓴다.
// 컨셉은 extra.concept로 네이티브에 전달되고, useGame이 이를 읽어 렌더한다.
const variant = process.env.APP_VARIANT === 'scifi' ? 'scifi' : 'fantasy';

const V = {
  fantasy: {
    name: '엘드리아 연대기', slug: 'eldria-idle',
    id: 'com.eldria.idle',
    icon: './assets/icon.png', adaptive: './assets/adaptive-icon.png', splash: './assets/splash-icon.png',
    bg: '#1b1430', primary: '#f5c542',
  },
  scifi: {
    name: '오비탈 프로토콜', slug: 'orbital-protocol',
    id: 'com.orbital.protocol',
    icon: './assets/icon-scifi.png', adaptive: './assets/adaptive-icon-scifi.png', splash: './assets/splash-icon-scifi.png',
    bg: '#0d1420', primary: '#43e0d0',
  },
}[variant];

export default ({ config }) => ({
  ...config,
  name: V.name,
  slug: V.slug,
  icon: V.icon,
  primaryColor: V.primary,
  splash: { image: V.splash, resizeMode: 'contain', backgroundColor: V.bg },
  ios: { ...(config.ios || {}), bundleIdentifier: V.id },
  android: {
    ...(config.android || {}),
    package: V.id,
    adaptiveIcon: { foregroundImage: V.adaptive, backgroundColor: V.bg },
  },
  extra: { ...(config.extra || {}), concept: variant },
});

import { createScreenRegistry } from '../../../shared/lib/screen-registry.js'

const definitions = [
  ['voiceSelect', 'select', '5-01', '목소리 고르기', 'my-page-voice'],
  ['voicePreview', 'preview', '5-02', '미리 듣기', 'my-page-voice'],
  ['replay', 'replay', '5-03', '다시 들려드릴까요'],
  ['ended', 'ended', '5-04', '음성 안내 종료'],
  ['resume', 'resume', '5-05', '이어서 하시겠어요'],
  ['expired', 'expired', '5-06', '시간이 지났어요'],
  ['billReading', 'bill-reading', '5-07', '고지서 읽어드리는 중'],
  ['enabled', 'enabled', '5-08', '음성 명령 켜짐'],
].map(([name, path, designId, title, routeName]) => ({
  name,
  key: `voice-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
  path,
  designId,
  title,
  ...(routeName ? { routeName } : {}),
}))

const registry = createScreenRegistry({
  service: 'voice',
  definitions,
})

export const {
  screenDefinitions,
  screens,
  screenByKey,
  screenByDesignId,
  getScreen,
  getScreenByDesignId,
  routeForScreen,
} = registry

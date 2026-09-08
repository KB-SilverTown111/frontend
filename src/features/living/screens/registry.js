import { createScreenRegistry } from '../../../shared/lib/screen-registry.js'

const definitions = [
  ['accounts', 'accounts', '4-02', '계좌 목록'],
  ['accountsEmpty', 'accounts/empty', '4-03', '연결 계좌 없음'],
  ['accountsError', 'accounts/error', '4-04', '계좌 조회 실패'],
  ['sessionExpired', 'session-expired', '4-05', '세션 만료'],
  ['reminders', 'reminders', '4-06', '납부 알림 목록'],
  ['reminderCreate', 'reminders/create', '4-07', '알림 만들기'],
  ['reminderEdit', 'reminders/edit', '4-08', '알림 편집·취소'],
  ['reminderArrived', 'reminders/arrived', '4-09', '알림 도착'],
  ['branches', 'branches', '4-10', '이동점포 목록'],
  ['branchDetail', 'branches/detail', '4-11', '이동점포 상세'],
  ['locationPermission', 'location-permission', '4-12', '위치 권한 없음'],
  ['voiceSettings', 'voice-settings', '4-13', '내 목소리 설정', 'my-page-voice'],
  ['profileEdit', 'profile/edit', '4-14', '내 정보 고치기'],
  ['emergencyContactEdit', 'emergency-contact/edit', '4-15', '비상 연락처 고치기'],
  ['consents', 'consents', '4-16', '동의 다시 보기'],
  ['remindersEmpty', 'reminders/empty', '4-17', '알림이 없어요'],
  ['remindersError', 'reminders/error', '4-18', '알림을 못 가져왔어요'],
  ['remindersDisabled', 'reminders/disabled', '4-19', '알림이 꺼져 있어요'],
  ['branchesEmpty', 'branches/empty', '4-20', '가까운 곳이 없어요'],
  ['branchesError', 'branches/error', '4-21', '못 찾아봤어요'],
  ['reminderSpeak', 'reminders/speak', '4-22', '소리로 알려드릴까요'],
  ['reminderNotice', 'reminders/notice', '4-23', '알려드릴 것이 있어요'],
  ['reminderReading', 'reminders/reading', '4-24', '읽어드리는 중'],
  ['reminderQuietHours', 'reminders/quiet-hours', '4-25', '밤에는 조용히'],
  ['reminderMissed', 'reminders/missed', '4-26', '못 들으신 알림'],
].map(([name, path, designId, title, routeName]) => ({
  name,
  key: `living-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
  path,
  designId,
  title,
  ...(routeName ? { routeName } : {}),
}))

const registry = createScreenRegistry({
  service: 'living',
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

import { createScreenRegistry } from '../../../shared/lib/screen-registry.js'

const definitions = [
  ['listening', 'listen', '2-02', '듣는 중'],
  ['processing', 'processing', '2-03', '처리 중'],
  ['speaking', 'speak', '2-04', '읽어드리는 중'],
  ['recipientSelect', 'recipient', '2-05', '받는 분 선택'],
  ['contactsPermission', 'contacts-permission', '2-06', '연락처 권한 없음'],
  ['amountConfirm', 'amount', '2-07', '금액 재확인'],
  ['confirm', 'confirm', '2-08', '최종 확인'],
  ['riskConfirm', 'risk-confirm', '2-09', '위험 확인 질문'],
  ['pending', 'pending', '2-10', '송금 보류'],
  ['guardianConfirm', 'guardian-confirm', '2-11', '보호자 확인'],
  ['guardianMessageFailed', 'guardian-message-failed', '2-12', '보호자 메시지 실패'],
  ['authenticationExpired', 'authentication-expired', '2-13', '인증 불일치·만료'],
  ['complete', 'complete', '2-14', '송금 완료'],
  ['voiceRecognitionFailed', 'voice-recognition-failed', '2-15', '음성 인식 실패'],
  ['recipientNotFound', 'recipient-not-found', '2-16', '그런 분이 없어요'],
  ['recipientConfirm', 'recipient-confirm', '2-17', '이분이 맞나요'],
  ['accountSelect', 'account', '2-18', '어느 계좌에서'],
  ['existingPlan', 'existing-plan', '2-19', '하시던 송금이 있어요'],
  ['notSent', 'not-sent', '2-20', '보내지 않았어요'],
  ['expired', 'expired', '2-21', '시간이 지났어요'],
  ['executing', 'executing', '2-22', '보내는 중'],
  ['failed', 'failed', '2-23', '보내지 못했어요'],
  ['replay', 'replay', '2-24', '다시 들려드릴게요'],
  ['misheard', 'misheard', '2-25', '잘못 들었나요'],
  ['conversationEnded', 'conversation-ended', '2-26', '음성 대화 끝'],
  ['scheduledList', 'scheduled', '2-27', '이번 달 보낼 돈'],
  ['scheduledCreate', 'scheduled/create', '2-28', '보낼 돈 정하기'],
  ['scheduledDue', 'scheduled/due', '2-29', '오늘 보내실 것이 있어요'],
  ['scheduledComplete', 'scheduled/complete', '2-30', '이미 보내셨어요'],
  ['scheduledEdit', 'scheduled/edit', '2-31', '보낼 돈 고치기'],
].map(([name, path, designId, title]) => ({
  name,
  key: `transfer-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
  path,
  designId,
  title,
}))

const registry = createScreenRegistry({
  service: 'transfer',
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

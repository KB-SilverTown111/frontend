import { createScreenRegistry } from '../../../shared/lib/screen-registry.js'

const definitions = [
  ['sourceSelect', 'scan', '3-02', '촬영 또는 앨범에서 선택'],
  ['camera', 'camera', '3-02A', '고지서를 비춰 주세요'],
  ['ocrProcessing', 'processing', '3-03', '업로드·OCR 처리'],
  ['review', 'review', '3-04', '인식 결과 확인'],
  ['lowConfidence', 'review/edit', '3-05', '낮은 신뢰도 수정'],
  ['confirm', 'confirm', '3-06', '납부 최종 확인'],
  ['complete', 'complete', '3-07', '납부 완료'],
  ['recognitionFailed', 'recognition-failed', '3-08', '인식 실패'],
  ['unsupportedFile', 'unsupported-file', '3-09', '지원하지 않는 파일'],
  ['cameraPermission', 'camera-permission', '3-10', '카메라 권한 없음'],
  ['expired', 'expired', '3-11', '확인 정보 만료'],
  ['cancelled', 'cancelled', '3-12', '사용자 취소'],
  ['duplicateRequest', 'duplicate-request', '3-13', '중복 요청 처리'],
  ['paymentNumber', 'payment-number', '3-14', '납부번호 확인'],
  ['readAccuracy', 'read-accuracy', '3-15', '읽은 정확도'],
  ['readAloud', 'read-aloud', '3-16', '읽어드릴게요'],
  ['retake', 'retake', '3-17', '다시 찍어볼까요'],
  ['unsupportedFormat', 'unsupported-format', '3-18', '못 읽는 형식이에요'],
  ['fileTooLarge', 'file-too-large', '3-19', '파일이 너무 커요'],
  ['overdue', 'overdue', '3-20', '지난 고지서'],
  ['paying', 'paying', '3-21', '납부하는 중'],
  ['paymentFailed', 'payment-failed', '3-22', '납부하지 못했어요'],
].map(([name, path, designId, title]) => ({
  name,
  key: `bill-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
  path,
  designId,
  title,
}))

const registry = createScreenRegistry({
  service: 'bills',
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

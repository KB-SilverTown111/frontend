import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { Camera } from '@capacitor/camera'
import { Geolocation } from '@capacitor/geolocation'
import { Contacts } from '@capacitor-community/contacts'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'

import { BANKS, getBank } from '@/features/onboarding/model/banks.js'
import {
  CONSENT_DEFINITIONS,
  formatPhoneNumber,
  resolvePostcodeSelection,
} from '@/features/onboarding/model/contract.js'
import {
  arePermissionsGranted,
  requestPermissionsInOrder,
} from '@/features/onboarding/services/permissions.js'
import { loadPostcodeApi } from '@/features/onboarding/services/postcode.js'
import {
  areConsentDetailsAgreed,
  CONSENT_FLOW_RETURN_SCREEN,
  getNextConsentScreen,
  SCREEN_COPY,
  isOnboardingScreen,
  resetRequiredConsents,
  setConsentDecision,
} from '@/features/onboarding/model/screens.js'
import { getAdjacentStep, getOnboardingDisplayProgress } from '@/features/onboarding/model/steps.js'
import { FONT_SCALE, applyFontScale, readFontScale } from '@/shared/services/fontScale.js'
import { goBackOrReplace } from '@/shared/lib/navigation.js'
import { useOnboardingStore } from '@/features/onboarding/stores/onboarding.js'

export function useOnboardingFlow() {
  const route = useRoute()
  const router = useRouter()
  const store = useOnboardingStore()
  const accountVerified = ref(false)
  const actionNotice = ref('')
  const detailAddressInput = ref(null)
  const optionalConsentSections = ref({ purpose: false, retention: false })
  const postcodeError = ref('')
  const postcodeLayer = ref(null)
  const postcodeLoading = ref(false)
  const postcodeOpen = ref(false)
  const residentKeypadOpen = ref(false)
  const permissionsRequesting = ref(false)
  const fontScale = ref(readFontScale())
  applyFontScale(fontScale.value)

  const APP_INTENT_ROUTES = Object.freeze({
    home: { name: 'transfer-home' },
    bills: { name: 'bills-home' },
    living: { name: 'living-home' },
    mypage: { name: 'my-page' },
  })

  const screenId = computed(() => String(route.params.stepId || 'start'))
  const screenCopy = computed(() => {
    if (screenId.value === 'bank-select') {
      return ['은행을 선택해주세요', '연결할 계좌의 은행을 하나만 선택할 수 있어요.']
    }
    return SCREEN_COPY[screenId.value] || SCREEN_COPY.start
  })
  const progress = computed(() => getOnboardingDisplayProgress(screenId.value))
  const selectedBank = computed(() => getBank(store.draft.bankCode))
  const requiredConsentsAgreed = computed(() =>
    CONSENT_DEFINITIONS.filter(({ required }) => required).every(
      ({ type }) => store.draft.consents[type],
    ),
  )
  const primaryLabel = computed(
    () =>
      ({
        start: '가입 시작하기',
        'consent-overview': '다음',
        'consent-optional': '선택하고 계속',
        'basic-info': '다음',
        'resident-number': '안전하게 확인',
        address: '주소 확인',
        'bank-account': '계좌 확인',
        'bank-select': selectedBank.value ? '선택 완료' : '은행을 선택해주세요',
        phone: '번호 저장',
        'emergency-contact': '연락처 저장',
        permissions: '이해했어요',
        complete: '홈으로 가기',
        login: '로그인',
        relogin: '본인 확인하기',
        'mydata-consent': '동의하고 계속',
        'ai-voice-consent': '동의하고 계속',
        'address-not-found': '다시 검색',
        'account-error': '다시 입력',
        'missing-fields': '마저 입력하기',
        'microphone-denied': '설정 열기',
        'notification-denied': '설정 열기',
      })[screenId.value] || '다음',
  )

  const secondaryLabel = computed(
    () =>
      ({
        'consent-optional': '건너뛰기',
        login: '처음 오셨나요?',
        relogin: '도움 받기',
        'address-not-found': '직접 입력하기',
        'account-error': '다른 계좌 쓰기',
        'missing-fields': '나중에 하기',
        'microphone-denied': '화면으로 계속하기',
        'notification-denied': '괜찮아요',
      })[screenId.value] || '',
  )

  watch(
    screenId,
    (value) => {
      actionNotice.value = ''
      if (value !== 'resident-number') residentKeypadOpen.value = false
      if (value === 'start') resetRequiredConsents(store.draft)
      if (!isOnboardingScreen(value)) {
        router.replace({ name: 'onboarding', params: { stepId: 'start' } })
      }
    },
    { immediate: true },
  )

  function go(target) {
    if (target) router.push({ name: 'onboarding', params: { stepId: target } })
  }

  function validateAndGo(validationId, target) {
    if (store.validate(validationId)) go(target)
  }

  function requestAppIntent(intent) {
    window.dispatchEvent(new CustomEvent(`gwipyeonhan:${intent}`))
    actionNotice.value = {
      home: '홈 화면을 여는 앱 이벤트를 보냈습니다.',
      bills: '고지서 화면을 여는 앱 이벤트를 보냈습니다.',
      living: '생활금융 화면을 여는 앱 이벤트를 보냈습니다.',
      mypage: '마이페이지 화면을 여는 앱 이벤트를 보냈습니다.',
      'open-settings': 'Capacitor 앱에서 기기 설정을 여는 이벤트를 보냈습니다.',
    }[intent]

    const target = APP_INTENT_ROUTES[intent]
    return target ? router.replace(target) : undefined
  }

  function openMyPage() {
    return requestAppIntent('mypage')
  }

  function decideConsent(agreed) {
    setConsentDecision(store.draft, screenId.value, agreed)
  }

  function openRequiredConsentDetails() {
    store.fieldErrors = {}
    go('mydata-consent')
  }

  function selectBank(code) {
    store.draft.bankCode = code
    accountVerified.value = false
  }

  function handlePhoneInput(value) {
    store.draft.phone = formatPhoneNumber(value)
  }

  function handleEmergencyPhoneInput(value) {
    store.draft.emergencyContact.phone = formatPhoneNumber(value)
  }

  async function requestPermissionIfNeeded(plugin, permission, options) {
    const status = await plugin.checkPermissions()
    if (status?.[permission] === 'granted' || status?.[permission] === 'limited') return
    await plugin.requestPermissions(options)
  }

  async function requestDevicePermissions() {
    if (!Capacitor.isNativePlatform()) return []

    return requestPermissionsInOrder({
      contacts: () => requestPermissionIfNeeded(Contacts, 'contacts'),
      camera: () => requestPermissionIfNeeded(Camera, 'camera', { permissions: ['camera'] }),
      location: () =>
        requestPermissionIfNeeded(Geolocation, 'location', { permissions: ['location'] }),
      microphone: () => requestPermissionIfNeeded(SpeechRecognition, 'speechRecognition'),
    })
  }

  async function areDevicePermissionsGranted() {
    if (!Capacitor.isNativePlatform()) return true

    try {
      const [contacts, camera, location, microphone] = await Promise.all([
        Contacts.checkPermissions(),
        Camera.checkPermissions(),
        Geolocation.checkPermissions(),
        SpeechRecognition.checkPermissions(),
      ])

      return arePermissionsGranted({
        contacts: contacts?.contacts,
        camera: camera?.camera,
        location: location?.location,
        microphone: microphone?.speechRecognition,
      })
    } catch {
      return false
    }
  }

  async function submitOnboarding() {
    if (permissionsRequesting.value) return
    permissionsRequesting.value = true
    try {
      await requestDevicePermissions()
      const result = await store.submit()
      if (!result.ok) return
      store.finishUiFlow()
      return requestAppIntent('home')
    } finally {
      permissionsRequesting.value = false
    }
  }

  function closePostcode() {
    postcodeOpen.value = false
    postcodeLayer.value?.replaceChildren()
  }

  async function openPostcode() {
    if (postcodeLoading.value) return

    postcodeError.value = ''
    postcodeLoading.value = true

    try {
      const Postcode = await loadPostcodeApi()
      postcodeOpen.value = true
      await nextTick()

      new Postcode({
        oncomplete(data) {
          Object.assign(store.draft, resolvePostcodeSelection(data))
          closePostcode()
          nextTick(() => detailAddressInput.value?.$el?.focus())
        },
        width: '100%',
        height: '100%',
      }).embed(postcodeLayer.value)
    } catch {
      postcodeError.value = '주소 검색을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'
    } finally {
      postcodeLoading.value = false
    }
  }

  function goBack() {
    store.submitError = null
    if (screenId.value === 'start') {
      return goBackOrReplace(router, { name: 'onboarding', params: { stepId: 'login' } })
    }

    const recovery = {
      'consent-optional': 'consent-overview',
      'mydata-consent': 'consent-overview',
      'ai-voice-consent': 'mydata-consent',
      'bank-select': 'bank-account',
      'address-not-found': 'address',
      'account-error': 'bank-account',
      'missing-fields': 'basic-info',
      'microphone-denied': 'permissions',
      'notification-denied': 'permissions',
    }
    const target = recovery[screenId.value] || getAdjacentStep(screenId.value, -1)
    return goBackOrReplace(router, {
      name: 'onboarding',
      params: { stepId: target || 'login' },
    })
  }

  async function handlePrimary() {
    const id = screenId.value
    if (id === 'start') return go('consent-overview')
    if (id === 'consent-overview') return validateAndGo(id, 'basic-info')
    if (id === 'consent-optional') {
      store.draft.consents.AI_FINANCIAL_DATA_OPTIONAL =
        optionalConsentSections.value.purpose || optionalConsentSections.value.retention
      return go('basic-info')
    }
    if (id === 'basic-info') return validateAndGo(id, 'resident-number')
    if (id === 'resident-number') return validateAndGo(id, 'address')
    if (id === 'address') return validateAndGo(id, 'bank-account')
    if (id === 'bank-account') {
      if (!accountVerified.value) {
        actionNotice.value = '예금주 확인을 먼저 눌러주세요.'
        return
      }
      return validateAndGo(id, 'phone')
    }
    if (id === 'bank-select') return selectedBank.value && go('bank-account')
    if (id === 'phone') return validateAndGo(id, 'emergency-contact')
    if (id === 'emergency-contact') {
      if (!store.validate(id)) return
      if (await areDevicePermissionsGranted()) return submitOnboarding()
      return go('permissions')
    }
    if (id === 'permissions') return submitOnboarding()
    if (id === 'complete') return requestAppIntent('home')
    if (id === 'login') {
      const result = await store.login()
      if (result.ok) return requestAppIntent('home')
      return
    }
    if (id === 'relogin') return go('login')
    if (['mydata-consent', 'ai-voice-consent'].includes(id)) {
      decideConsent(true)
      if (areConsentDetailsAgreed(store.draft)) {
        store.draft.consents.TERMS_OF_SERVICE = true
        store.draft.consents.PRIVACY_COLLECTION = true
      }
      return go(getNextConsentScreen(id) || CONSENT_FLOW_RETURN_SCREEN)
    }
    if (id === 'address-not-found') return go('address')
    if (id === 'account-error') return go('bank-account')
    if (id === 'missing-fields') return go('basic-info')
    if (['microphone-denied', 'notification-denied'].includes(id)) {
      return requestAppIntent('open-settings')
    }
  }

  function handleSecondary() {
    const id = screenId.value
    if (id === 'consent-optional') {
      store.draft.consents.AI_FINANCIAL_DATA_OPTIONAL = false
      return go('basic-info')
    }
    if (id === 'login') return go('start')
    if (id === 'relogin') return router.push({ name: 'onboarding-help' })
    if (id === 'address-not-found') return go('address')
    if (id === 'account-error') return go('bank-account')
    if (id === 'missing-fields') return go('permissions')
    if (['microphone-denied', 'notification-denied'].includes(id)) {
      store.finishUiFlow()
      return go('complete')
    }
  }

  return {
    accountVerified,
    actionNotice,
    BANKS,
    closePostcode,
    decideConsent,
    detailAddressInput,
    fontScale,
    FONT_SCALE,
    go,
    goBack,
    handleEmergencyPhoneInput,
    handlePhoneInput,
    handlePrimary,
    handleSecondary,
    openMyPage,
    openPostcode,
    openRequiredConsentDetails,
    optionalConsentSections,
    permissionsRequesting,
    postcodeError,
    postcodeLayer,
    postcodeLoading,
    postcodeOpen,
    primaryLabel,
    progress,
    requiredConsentsAgreed,
    requestAppIntent,
    residentKeypadOpen,
    screenCopy,
    screenId,
    secondaryLabel,
    selectBank,
    selectedBank,
    store,
  }
}

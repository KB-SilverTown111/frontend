<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { Camera } from '@capacitor/camera'
import { Geolocation } from '@capacitor/geolocation'
import { Contacts } from '@capacitor-community/contacts'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'

import OnboardingShell from '@/components/onboarding/OnboardingShell.vue'
import SecureNumberKeypad from '@/components/onboarding/SecureNumberKeypad.vue'
import { Input } from '@/components/ui/input'
import { BANKS, getBank } from '@/features/onboarding/banks.js'
import {
  CONSENT_DEFINITIONS,
  formatPhoneNumber,
  resolvePostcodeSelection,
} from '@/features/onboarding/contract.js'
import { requestPermissionsInOrder } from '@/features/onboarding/permissions.js'
import { loadPostcodeApi } from '@/features/onboarding/postcode.js'
import {
  areConsentDetailsAgreed,
  CONSENT_FLOW_RETURN_SCREEN,
  getNextConsentScreen,
  SCREEN_COPY,
  isOnboardingScreen,
  resetRequiredConsents,
  setConsentDecision,
} from '@/features/onboarding/screens.js'
import { getAdjacentStep } from '@/features/onboarding/steps.js'
import { useOnboardingStore } from '@/stores/onboarding.js'

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

const screenId = computed(() => String(route.params.stepId || 'start'))
const screenCopy = computed(() => {
  if (screenId.value === 'bank-select') {
    return ['은행을 선택해주세요', '연결할 계좌의 은행을 하나만 선택할 수 있어요.']
  }
  return SCREEN_COPY[screenId.value] || SCREEN_COPY.start
})
const selectedBank = computed(() => getBank(store.draft.bankCode))
const requiredConsentsAgreed = computed(() =>
  CONSENT_DEFINITIONS.filter(({ required }) => required).every(
    ({ type }) => store.draft.consents[type],
  ),
)
const optionalConsentGuide = computed(
  () =>
    ({
      'mydata-consent': '필수 동의 항목이에요. 동의해야 가입을 계속할 수 있어요.',
      'ai-voice-consent': '필수 동의 항목이에요. 동의해야 음성 명령을 사용할 수 있어요.',
    })[screenId.value] || '',
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
    'open-settings': 'Capacitor 앱에서 기기 설정을 여는 이벤트를 보냈습니다.',
  }[intent]
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
  const recovery = {
    'bank-select': 'bank-account',
    'address-not-found': 'address',
    'account-error': 'bank-account',
    'missing-fields': 'basic-info',
    'microphone-denied': 'permissions',
    'notification-denied': 'permissions',
  }
  const target = recovery[screenId.value] || getAdjacentStep(screenId.value, -1)
  if (target) go(target)
  else router.back()
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
  if (id === 'emergency-contact') return validateAndGo(id, 'permissions')
  if (id === 'permissions') {
    if (permissionsRequesting.value) return
    permissionsRequesting.value = true
    try {
      await requestDevicePermissions()
      const result = await store.submit()
      if (!result.ok) return
      store.finishUiFlow()
      return go('complete')
    } finally {
      permissionsRequesting.value = false
    }
  }
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
</script>

<template>
  <OnboardingShell
    :busy="permissionsRequesting || store.status === 'loading'"
    :description="screenCopy[1]"
    :hide-back="screenId === 'start'"
    :error-message="store.submitError?.message || ''"
    :primary-label="primaryLabel"
    :secondary-label="secondaryLabel"
    :bottom-nav="screenId === 'complete' ? 'service' : ''"
    :title="screenCopy[0]"
    @back="goBack"
    @bills="requestAppIntent('bills')"
    @home="requestAppIntent('home')"
    @living="requestAppIntent('living')"
    @primary="handlePrimary"
    @secondary="handleSecondary"
  >
    <section
      v-if="screenId === 'start'"
      class="figma-stack"
    >
      <div class="status-card status-success">
        <span class="status-icon">✓</span>
        <span><b>처음이어도 괜찮아요</b><small>천천히 한 단계씩 안내해 드립니다.</small></span>
      </div>
    </section>

    <section
      v-else-if="screenId === 'consent-overview'"
      class="figma-stack"
    >
      <div class="segment-grid">
        <button
          :aria-describedby="store.fieldErrors.consents ? 'consents-error' : undefined"
          :aria-pressed="requiredConsentsAgreed"
          class="segment-option"
          :class="{ selected: requiredConsentsAgreed }"
          type="button"
          @click="openRequiredConsentDetails"
        >
          필수 약관 요약 <b v-if="requiredConsentsAgreed">✓</b>
        </button>
        <button
          class="segment-option"
          type="button"
          @click="go('consent-optional')"
        >
          선택 동의 항목 보기
        </button>
      </div>
      <p
        v-if="store.fieldErrors.consents"
        id="consents-error"
        class="field-error"
        role="alert"
      >
        {{ store.fieldErrors.consents }}
      </p>
      <p class="guide-card"><b>안내</b> 선택하지 않아도 기본 서비스를 이용할 수 있어요.</p>
    </section>

    <section
      v-else-if="screenId === 'consent-optional'"
      class="figma-stack"
    >
      <div class="status-card status-success">
        <span class="status-icon">✓</span>
        <span><b>추가 금융 정보 활용</b><small>혜택 안내를 위한 선택 항목입니다.</small></span>
      </div>
      <div class="segment-grid">
        <button
          class="segment-option"
          :class="{ selected: optionalConsentSections.purpose }"
          :aria-pressed="optionalConsentSections.purpose"
          type="button"
          @click="optionalConsentSections.purpose = !optionalConsentSections.purpose"
        >
          수집 항목·목적 <b v-if="optionalConsentSections.purpose">✓</b>
        </button>
        <button
          class="segment-option"
          :class="{ selected: optionalConsentSections.retention }"
          :aria-pressed="optionalConsentSections.retention"
          type="button"
          @click="optionalConsentSections.retention = !optionalConsentSections.retention"
        >
          보유 및 이용 기간 <b v-if="optionalConsentSections.retention">✓</b>
        </button>
      </div>
    </section>

    <section
      v-else-if="screenId === 'basic-info'"
      class="figma-stack"
    >
      <label class="input-row">
        <Input
          v-model="store.draft.loginId"
          :aria-describedby="store.fieldErrors.loginId ? 'login-id-error' : undefined"
          aria-label="아이디"
          :aria-invalid="Boolean(store.fieldErrors.loginId)"
          autocomplete="username"
          autocapitalize="none"
          maxlength="100"
          placeholder="아이디"
          spellcheck="false"
        />
      </label>
      <p
        v-if="store.fieldErrors.loginId"
        id="login-id-error"
        class="field-error"
        role="alert"
      >
        {{ store.fieldErrors.loginId }}
      </p>
      <label class="input-row">
        <Input
          v-model="store.draft.password"
          :aria-describedby="store.fieldErrors.password ? 'password-error' : undefined"
          aria-label="비밀번호"
          :aria-invalid="Boolean(store.fieldErrors.password)"
          autocomplete="new-password"
          maxlength="100"
          placeholder="비밀번호"
          type="password"
        />
      </label>
      <p
        v-if="store.fieldErrors.password"
        id="password-error"
        class="field-error"
        role="alert"
      >
        {{ store.fieldErrors.password }}
      </p>
      <label class="input-row">
        <Input
          v-model="store.draft.name"
          :aria-describedby="store.fieldErrors.name ? 'name-error' : undefined"
          aria-label="이름"
          :aria-invalid="Boolean(store.fieldErrors.name)"
          autocomplete="name"
          placeholder="이름"
        />
      </label>
      <p
        v-if="store.fieldErrors.name"
        id="name-error"
        class="field-error"
        role="alert"
      >
        {{ store.fieldErrors.name }}
      </p>
      <div
        :aria-describedby="store.fieldErrors.gender ? 'gender-error' : undefined"
        class="segment-grid"
        role="group"
      >
        <button
          class="segment-option"
          :class="{ selected: store.draft.gender === 'MALE' }"
          :aria-pressed="store.draft.gender === 'MALE'"
          type="button"
          @click="store.draft.gender = 'MALE'"
        >
          남성 <b v-if="store.draft.gender === 'MALE'">✓</b>
        </button>
        <button
          class="segment-option"
          :class="{ selected: store.draft.gender === 'FEMALE' }"
          :aria-pressed="store.draft.gender === 'FEMALE'"
          type="button"
          @click="store.draft.gender = 'FEMALE'"
        >
          여성 <b v-if="store.draft.gender === 'FEMALE'">✓</b>
        </button>
      </div>
      <p
        v-if="store.fieldErrors.gender"
        id="gender-error"
        class="field-error"
        role="alert"
      >
        {{ store.fieldErrors.gender }}
      </p>
    </section>

    <section
      v-else-if="screenId === 'resident-number'"
      class="figma-stack"
    >
      <Input
        v-model="store.draft.residentNumberFront"
        :aria-describedby="
          store.fieldErrors.residentNumberFront || store.fieldErrors.residentNumberBack
            ? 'resident-number-error'
            : undefined
        "
        aria-label="주민등록번호 앞자리"
        :aria-invalid="Boolean(store.fieldErrors.residentNumberFront)"
        autocomplete="off"
        inputmode="numeric"
        maxlength="6"
        placeholder="주민등록번호 앞자리"
      />
      <button
        :aria-describedby="
          store.fieldErrors.residentNumberFront || store.fieldErrors.residentNumberBack
            ? 'resident-number-error'
            : undefined
        "
        :aria-label="'주민등록번호 뒷자리 ' + store.draft.residentNumberBack.length + '자리 입력됨'"
        :aria-invalid="Boolean(store.fieldErrors.residentNumberBack)"
        aria-haspopup="dialog"
        class="secure-resident-input"
        type="button"
        @click="residentKeypadOpen = true"
      >
        <span class="secure-resident-label">뒷자리</span>
        <span
          aria-hidden="true"
          class="secure-resident-mask"
        >
          <b v-if="store.draft.residentNumberBack">{{ store.draft.residentNumberBack[0] }}</b>
          <span v-if="store.draft.residentNumberBack.length > 1">{{
            '●'.repeat(store.draft.residentNumberBack.length - 1)
          }}</span>
          <span
            v-if="!store.draft.residentNumberBack"
            class="secure-resident-placeholder"
            >●●●●●●●</span
          >
        </span>
      </button>
      <p
        v-if="store.fieldErrors.residentNumberFront || store.fieldErrors.residentNumberBack"
        id="resident-number-error"
        class="field-error"
        role="alert"
      >
        {{ store.fieldErrors.residentNumberFront || store.fieldErrors.residentNumberBack }}
      </p>
      <p class="guide-card"><b>안내</b> 민감 정보는 화면에서 가려 보여드립니다.</p>
      <SecureNumberKeypad
        v-if="residentKeypadOpen"
        v-model="store.draft.residentNumberBack"
        @close="residentKeypadOpen = false"
      />
    </section>

    <section
      v-else-if="screenId === 'address'"
      class="figma-stack"
    >
      <button
        class="detail-row selected"
        type="button"
        @click="openPostcode"
      >
        <span>{{ postcodeLoading ? '주소 검색을 불러오는 중…' : '도로명·지번 검색' }}</span>
        <b>›</b>
      </button>
      <Input
        v-model="store.draft.postalCode"
        :aria-describedby="
          store.fieldErrors.postalCode || store.fieldErrors.address ? 'address-error' : undefined
        "
        aria-label="우편번호"
        :aria-invalid="Boolean(store.fieldErrors.postalCode)"
        autocomplete="postal-code"
        inputmode="numeric"
        placeholder="우편번호"
      />
      <Input
        v-model="store.draft.address"
        :aria-describedby="
          store.fieldErrors.postalCode || store.fieldErrors.address ? 'address-error' : undefined
        "
        aria-label="기본 주소"
        :aria-invalid="Boolean(store.fieldErrors.address)"
        autocomplete="street-address"
        placeholder="기본 주소"
      />
      <Input
        ref="detailAddressInput"
        v-model="store.draft.detailAddress"
        aria-label="상세 주소"
        placeholder="동·호수 등"
      />
      <p
        v-if="store.fieldErrors.postalCode || store.fieldErrors.address"
        id="address-error"
        class="field-error"
        role="alert"
      >
        {{ store.fieldErrors.postalCode || store.fieldErrors.address }}
      </p>
      <p
        v-if="postcodeError"
        class="field-error"
        role="alert"
      >
        {{ postcodeError }}
      </p>
      <p class="guide-card"><b>안내</b> 검색이 어려우면 직접 입력할 수 있어요.</p>

      <div
        v-if="postcodeOpen"
        aria-labelledby="postcode-title"
        aria-modal="true"
        class="postcode-overlay"
        role="dialog"
      >
        <header class="postcode-header">
          <h2 id="postcode-title">주소 검색</h2>
          <button
            aria-label="주소 검색 닫기"
            type="button"
            @click="closePostcode"
          >
            ×
          </button>
        </header>
        <div
          ref="postcodeLayer"
          class="postcode-layer"
        />
      </div>
    </section>

    <section
      v-else-if="screenId === 'bank-account'"
      class="figma-stack"
    >
      <div class="segment-grid">
        <button
          :aria-describedby="store.fieldErrors.bankCode ? 'bank-account-error' : undefined"
          :aria-invalid="Boolean(store.fieldErrors.bankCode)"
          class="segment-option"
          :class="{ selected: selectedBank }"
          type="button"
          @click="go('bank-select')"
        >
          {{ selectedBank?.name || '은행 선택' }} <b v-if="selectedBank">✓</b>
        </button>
        <label class="segment-option input-segment"
          ><input
            v-model="store.draft.accountNumber"
            :aria-describedby="
              store.fieldErrors.bankCode || store.fieldErrors.accountNumber
                ? 'bank-account-error'
                : undefined
            "
            aria-label="계좌번호"
            :aria-invalid="Boolean(store.fieldErrors.accountNumber)"
            inputmode="numeric"
            placeholder="계좌번호 입력"
            type="password"
            @input="accountVerified = false"
        /></label>
      </div>
      <button
        class="detail-row"
        :class="{ selected: accountVerified }"
        :aria-pressed="accountVerified"
        type="button"
        @click="accountVerified = true"
      >
        {{ accountVerified ? '예금주 확인 완료' : '예금주 확인' }}
        <span>{{ accountVerified ? '✓' : '›' }}</span>
      </button>
      <p
        v-if="store.fieldErrors.bankCode || store.fieldErrors.accountNumber"
        id="bank-account-error"
        class="field-error"
        role="alert"
      >
        {{ store.fieldErrors.bankCode || store.fieldErrors.accountNumber }}
      </p>
    </section>

    <section
      v-else-if="screenId === 'bank-select'"
      class="bank-picker-sheet"
    >
      <div class="bank-picker-handle" />
      <div class="bank-grid">
        <button
          v-for="bank in BANKS"
          :key="bank.code"
          :aria-label="bank.name"
          :aria-pressed="store.draft.bankCode === bank.code"
          class="bank-option"
          type="button"
          @click="selectBank(bank.code)"
        >
          <img
            :alt="bank.name"
            :src="store.draft.bankCode === bank.code ? bank.selectedIcon : bank.defaultIcon"
          />
        </button>
      </div>
    </section>

    <section
      v-else-if="screenId === 'phone'"
      class="figma-stack"
    >
      <Input
        :model-value="store.draft.phone"
        :aria-describedby="store.fieldErrors.phone ? 'phone-error' : 'phone-guide'"
        aria-label="휴대전화 번호"
        :aria-invalid="Boolean(store.fieldErrors.phone)"
        autocomplete="tel"
        inputmode="tel"
        maxlength="13"
        placeholder="010-0000-0000"
        type="tel"
        @update:model-value="handlePhoneInput"
      />
      <p
        v-if="store.fieldErrors.phone"
        id="phone-error"
        class="field-error"
        role="alert"
      >
        {{ store.fieldErrors.phone }}
      </p>
    </section>

    <section
      v-else-if="screenId === 'emergency-contact'"
      class="figma-stack"
    >
      <select
        v-model="store.draft.emergencyContact.relationship"
        :aria-describedby="
          store.fieldErrors.emergencyContactRelationship ? 'emergency-contact-error' : undefined
        "
        aria-label="비상 연락처 관계"
        :aria-invalid="Boolean(store.fieldErrors.emergencyContactRelationship)"
        class="native-select"
      >
        <option value="">관계 선택</option>
        <option value="배우자">배우자</option>
        <option value="아들">아들</option>
        <option value="딸">딸</option>
        <option value="보호자">보호자</option>
        <option value="기타">기타</option>
      </select>
      <Input
        v-model="store.draft.emergencyContact.name"
        :aria-describedby="
          store.fieldErrors.emergencyContactName ? 'emergency-contact-error' : undefined
        "
        aria-label="비상 연락처 이름"
        :aria-invalid="Boolean(store.fieldErrors.emergencyContactName)"
        placeholder="이름"
      />
      <Input
        :model-value="store.draft.emergencyContact.phone"
        :aria-describedby="
          store.fieldErrors.emergencyContactPhone ? 'emergency-contact-error' : undefined
        "
        aria-label="비상 연락처 휴대전화 번호"
        :aria-invalid="Boolean(store.fieldErrors.emergencyContactPhone)"
        inputmode="tel"
        maxlength="13"
        placeholder="휴대전화 번호"
        type="tel"
        @update:model-value="handleEmergencyPhoneInput"
      />
      <p
        v-if="Object.keys(store.fieldErrors).length"
        id="emergency-contact-error"
        class="field-error"
        role="alert"
      >
        비상 연락처 정보를 모두 확인해 주세요.
      </p>
    </section>

    <section
      v-else-if="screenId === 'permissions'"
      class="figma-stack"
    >
      <div class="status-card status-success">
        <span class="status-icon">✓</span>
        <span
          ><b>연락처 · 카메라 · 위치 · 마이크</b
          ><small>이해했어요를 누르면 필요한 OS 권한을 한 번에 요청합니다.</small></span
        >
      </div>
      <div class="segment-grid permission-grid">
        <div class="segment-option">연락처 — 송금 대상 찾기</div>
        <div class="segment-option">카메라 — 고지서 촬영</div>
        <div class="segment-option">위치 — 이동점포 찾기</div>
        <div class="segment-option">마이크 — 음성 명령</div>
      </div>
    </section>

    <section
      v-else-if="screenId === 'complete'"
      class="figma-stack"
    >
      <div class="status-card status-success">
        <span class="status-icon">✓</span
        ><span><b>준비가 끝났어요</b><small>이제 귀편한 금융을 이용할 수 있습니다.</small></span>
      </div>
    </section>

    <section
      v-else-if="screenId === 'login'"
      class="figma-stack"
    >
      <label class="input-row">
        <Input
          v-model="store.draft.loginId"
          :aria-describedby="store.fieldErrors.loginId ? 'login-id-error' : undefined"
          aria-label="아이디"
          :aria-invalid="Boolean(store.fieldErrors.loginId)"
          autocomplete="username"
          autocapitalize="none"
          maxlength="100"
          placeholder="아이디"
          spellcheck="false"
        />
      </label>
      <p
        v-if="store.fieldErrors.loginId"
        id="login-id-error"
        class="field-error"
        role="alert"
      >
        {{ store.fieldErrors.loginId }}
      </p>
      <label class="input-row">
        <Input
          v-model="store.draft.password"
          :aria-describedby="store.fieldErrors.password ? 'password-error' : undefined"
          aria-label="비밀번호"
          :aria-invalid="Boolean(store.fieldErrors.password)"
          autocomplete="current-password"
          maxlength="100"
          placeholder="비밀번호"
          type="password"
        />
      </label>
      <p
        v-if="store.fieldErrors.password"
        id="password-error"
        class="field-error"
        role="alert"
      >
        {{ store.fieldErrors.password }}
      </p>
      <p class="guide-card"><b>안내</b> 아이디와 비밀번호로 로그인해요.</p>
    </section>

    <section
      v-else-if="screenId === 'relogin'"
      class="figma-stack"
    >
      <div class="status-card status-warning">
        <span class="status-icon">!</span
        ><span
          ><b>새 휴대전화에서 들어오셨네요</b><small>본인 확인을 한 번 더 해주세요.</small></span
        >
      </div>
      <div class="detail-row"><span>마지막 접속</span><b>어제 오후 3:20</b></div>
    </section>

    <section
      v-else-if="['mydata-consent', 'ai-voice-consent'].includes(screenId)"
      class="figma-stack"
    >
      <div class="status-card status-success">
        <span class="status-icon">✓</span
        ><span
          ><b>{{
            screenId === 'mydata-consent' ? '내 금융정보 모아보기' : '목소리로 명령을 알아들어요'
          }}</b
          ><small>{{
            screenId === 'mydata-consent'
              ? '은행·카드 잔액을 한 화면에 보여드려요.'
              : '말씀하신 음성을 글자로 바꿔 처리해요.'
          }}</small></span
        >
      </div>
      <div class="detail-row">
        <span>{{ screenId === 'mydata-consent' ? '가져오는 정보' : '저장 여부' }}</span
        ><b>{{ screenId === 'mydata-consent' ? '계좌 잔액 · 거래내역' : '처리 후 즉시 삭제' }}</b>
      </div>
      <div class="detail-row">
        <span>보관 기간</span
        ><b>{{ screenId === 'mydata-consent' ? '동의 철회 시까지' : '저장하지 않음' }}</b>
      </div>
      <p class="guide-card"><b>안내</b> {{ optionalConsentGuide }}</p>
    </section>

    <section
      v-else
      class="figma-stack"
    >
      <div
        class="status-card"
        :class="
          ['microphone-denied', 'notification-denied'].includes(screenId)
            ? 'status-warning'
            : 'status-error'
        "
      >
        <span class="status-icon">!</span>
        <span
          ><b>{{
            screenId === 'address-not-found'
              ? '그런 주소가 없어요'
              : screenId === 'account-error'
                ? '계좌를 확인하지 못했어요'
                : screenId === 'missing-fields'
                  ? '두 곳을 더 적어주세요'
                  : screenId === 'microphone-denied'
                    ? '마이크 사용이 꺼져 있어요'
                    : '알림이 꺼져 있어요'
          }}</b
          ><small>{{
            screenId === 'address-not-found'
              ? '동 이름이나 도로명으로 다시 찾아보세요.'
              : screenId === 'account-error'
                ? '은행과 계좌번호를 다시 봐주세요.'
                : screenId === 'missing-fields'
                  ? '빨간 표시가 있는 곳만 채우면 돼요.'
                  : screenId === 'microphone-denied'
                    ? '말로 송금하려면 켜주셔야 해요.'
                    : '납부일과 송금 결과를 못 알려드려요.'
          }}</small></span
        >
      </div>
      <button
        v-if="screenId === 'address-not-found'"
        class="detail-row selected"
        type="button"
        @click="go('address')"
      >
        주소 다시 검색 <span>›</span>
      </button>
      <p
        v-if="screenId === 'address-not-found'"
        class="guide-card"
      >
        <b>안내</b> 찾기 어려우시면 직접 적으셔도 돼요.
      </p>
      <div
        v-if="screenId === 'account-error'"
        class="figma-stack"
      >
        <div class="detail-row">
          <span>입력한 은행</span><b>{{ selectedBank?.name || '국민은행' }}</b>
        </div>
        <div class="detail-row"><span>계좌번호</span><b>****-04-3391</b></div>
      </div>
      <div
        v-if="screenId === 'missing-fields'"
        class="figma-stack"
      >
        <button
          class="detail-row selected"
          type="button"
          @click="go('basic-info')"
        >
          이름 <span>›</span>
        </button>
        <button
          class="detail-row"
          type="button"
          @click="go('resident-number')"
        >
          생년월일 <span>›</span>
        </button>
      </div>
      <p
        v-if="screenId === 'microphone-denied'"
        class="guide-card"
      >
        <b>안내</b> 설정 › 귀편한 금융 › 마이크에서 켜실 수 있어요.
      </p>
      <p
        v-if="screenId === 'notification-denied'"
        class="guide-card"
      >
        <b>안내</b> 알림을 켜두시면 놓치는 일이 줄어요.
      </p>
    </section>

    <p
      v-if="actionNotice"
      class="guide-card action-notice"
      role="status"
    >
      {{ actionNotice }}
    </p>
  </OnboardingShell>
</template>

<script setup>
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import TransferFlowPanel from '@/features/transfer/components/TransferFlowPanel.vue'
import VoiceConversationPanel from '@/features/voice/components/VoiceConversationPanel.vue'
import {
  mobileBranchAddress,
  mobileBranchDistance,
  mobileBranchDocuments,
  mobileBranchId,
  mobileBranchName,
  mobileBranchSchedule,
  mobileBranchServices,
} from '@/features/living/mobile-branch/presentation.js'
import { useServiceScreen } from '@/features/service-screen/composables/useServiceScreen.js'
import { stripProductionSelectionIndicators } from '@/features/service-screen/services/screenContent.js'

const {
  serviceData,
  transferStore,
  service,
  screenKey,
  screen,
  loading,
  actionBusy,
  actionError,
  reminderTitle,
  reminderDate,
  reminderTime,
  showReminderCancelConfirm,
  reminderCancelDialog,
  billCameraVideo,
  billCameraReady,
  billCameraPreviewUrl,
  riskPurpose,
  transferPin,
  guardianCode,
  recipientSearch,
  recipientKeyword,
  transferAmountInput,
  planLabel,
  planAmount,
  planDay,
  planRepeat,
  isPlanFormScreen,
  backRoute,
  primaryRoute,
  showVoiceControl,
  isBillSourceSelection,
  isBillCameraScreen,
  isReminderListScreen,
  isReminderEditScreen,
  isReminderEmptyScreen,
  isReminderErrorScreen,
  isReminderFormScreen,
  isReminderScreen,
  selectedReminder,
  reminderMinDate,
  isMobileBranchListScreen,
  isMobileBranchDetailScreen,
  isMobileBranchScreen,
  mobileBranchLocationError,
  mobileBranchLocationLoading,
  hideScreenActions,
  showTransferFlow,
  showTransferPinHelp,
  guardianPending,
  showRecipientSearch,
  liveKind,
  liveTitle,
  liveLoading,
  liveError,
  liveRows,
  mobileBranchViewItems,
  mobileBranchPrimaryDisabled,
  transferSummaryRows,
  isBusy,
  unfinishedTransferRows,
  remainingBalanceRows,
  planRows,
  duePlanRows,
  sentPlanRows,
  billPaymentRows,
  billDuplicateRows,
  billDuplicateNote,
  billSpokenText,
  reminderIdentifier,
  formatReminderDateTime,
  reminderStatusLabel,
  isSelectedMobileBranch,
  selectMobileBranch,
  normalizeTransferAmount,
  loadMobileBranchData,
  go,
  uploadBill,
  selectRecipient,
  clearRecipientCandidates,
  reloadTransferAccounts,
  selectAccount,
  openReminder,
  reloadReminders,
  confirmReminderCancel,
  handlePrimary,
  handleSecondary,
  openVoice,
  goBack,
} = useServiceScreen()
</script>
<template>
  <div class="app-stage">
    <article class="mobile-app-shell service-route-device">
      <header class="app-header">
        <RouterLink
          aria-label="이전 화면"
          class="app-header-button service-route-back"
          :to="backRoute"
          @click.prevent="goBack"
        >
          ‹
        </RouterLink>
        <strong class="app-brand">귀편한 금융</strong>
        <Button
          aria-label="음성 도움"
          class="app-header-button service-mic-button"
          size="icon"
          variant="secondary"
          @click="openVoice"
        >
          <span
            aria-hidden="true"
            class="service-mic-icon"
          >
            <span class="service-mic-stem" />
          </span>
        </Button>
      </header>

      <main class="app-main service-route-main">
        <section class="screen-heading service-route-heading">
          <h1>{{ screen?.title || '서비스 화면' }}</h1>
          <p>{{ screen?.description || '화면을 불러오는 중입니다.' }}</p>
        </section>

        <div
          v-if="actionError"
          class="service-route-error"
          role="alert"
        >
          {{ actionError }}
        </div>

        <section
          v-if="screen && isBillSourceSelection"
          class="service-route-screen-content screen-content bill-source-selection"
          :data-variant="screen.variant"
        >
          <div class="content">
            <section class="hero">
              <div
                aria-hidden="true"
                class="hero-icon"
              >
                ✓
              </div>
              <div>
                <strong>고지서를 화면 안에 맞춰 주세요</strong>
                <p>빛 반사를 피하면 더 정확해요.</p>
              </div>
            </section>
            <div
              aria-label="고지서 사진 선택"
              class="choices"
              role="group"
            >
              <button
                class="choice"
                :disabled="isBusy"
                type="button"
                @click="go(primaryRoute)"
              >
                카메라 촬영
              </button>
              <button
                class="choice"
                :disabled="isBusy"
                type="button"
                @click="uploadBill('gallery')"
              >
                앨범에서 선택
              </button>
            </div>
          </div>
        </section>

        <section
          v-if="screen && isBillCameraScreen"
          class="service-route-screen-content screen-content bill-camera-capture"
          :data-variant="screen.variant"
        >
          <div class="content">
            <div class="viewfinder bill-camera-viewfinder">
              <video
                v-show="billCameraReady && !billCameraPreviewUrl"
                ref="billCameraVideo"
                aria-label="고지서 촬영 미리보기"
                autoplay
                muted
                playsinline
              ></video>
              <div
                v-if="billCameraPreviewUrl"
                aria-live="polite"
                class="bill-camera-preview"
              >
                <img
                  alt="촬영한 고지서 미리보기"
                  :src="billCameraPreviewUrl"
                />
                <p
                  v-if="actionBusy"
                  class="bill-camera-status"
                  role="status"
                >
                  사진을 확인하고 있어요.
                </p>
              </div>
              <div
                v-else-if="!billCameraReady"
                aria-live="polite"
                class="bill-camera-placeholder"
              >
                <span
                  aria-hidden="true"
                  class="bill-camera-placeholder-icon"
                ></span>
                <p
                  class="bill-camera-status"
                  role="status"
                >
                  카메라를 준비하고 있어요.
                </p>
              </div>
              <div
                aria-hidden="true"
                class="vf-corner tl"
              ></div>
              <div
                aria-hidden="true"
                class="vf-corner tr"
              ></div>
              <div
                aria-hidden="true"
                class="vf-corner bl"
              ></div>
              <div
                aria-hidden="true"
                class="vf-corner br"
              ></div>
            </div>
          </div>
        </section>

        <section
          v-if="
            screen?.contentHtml &&
            !(service === 'transfer' && screenKey === 'transfer-confirm') &&
            !hideScreenActions &&
            !isBillSourceSelection &&
            !isBillCameraScreen &&
            !isMobileBranchScreen &&
            !isReminderScreen &&
            !showVoiceControl &&
            !showTransferFlow
          "
          class="service-route-screen-content screen-content"
          :data-variant="screen.variant"
        >
          <!-- Content is loaded from the reviewed reference screen data. -->
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="content"
            v-html="stripProductionSelectionIndicators(screen.contentHtml)"
          />
          <!-- eslint-enable vue/no-v-html -->
          <p
            v-if="screen.variant === 'warning'"
            class="sr-only"
            role="status"
          >
            확인이 필요한 화면입니다.
          </p>
          <p
            v-if="screen.variant === 'destructive'"
            class="sr-only"
            role="alert"
          >
            오류 또는 주의가 필요한 화면입니다.
          </p>
        </section>

        <section
          v-if="screen && isMobileBranchScreen"
          aria-label="이동점포 정보"
          class="service-route-screen-content screen-content mobile-branch-content"
          :data-variant="screen.variant"
        >
          <div
            v-if="isMobileBranchListScreen && mobileBranchLocationError"
            class="mobile-branch-state mobile-branch-state-error"
            role="alert"
          >
            <strong>현재 위치를 확인할 수 없어요</strong>
            <p>{{ mobileBranchLocationError }}</p>
            <Button
              :disabled="isBusy"
              variant="secondary"
              @click="loadMobileBranchData"
            >
              다시 찾기
            </Button>
          </div>
          <div
            v-else-if="
              isMobileBranchListScreen &&
              (mobileBranchLocationLoading || serviceData.loading.mobileBranches)
            "
            aria-live="polite"
            class="mobile-branch-state"
            role="status"
          >
            <strong>현재 위치와 주변 이동점포를 확인하고 있어요</strong>
            <p>잠시만 기다려 주세요.</p>
          </div>
          <div
            v-else-if="isMobileBranchListScreen && serviceData.errors.mobileBranches"
            class="mobile-branch-state mobile-branch-state-error"
            role="alert"
          >
            <strong>이동점포 정보를 불러오지 못했어요</strong>
            <p>{{ serviceData.errors.mobileBranches.message }}</p>
            <Button
              :disabled="isBusy"
              variant="secondary"
              @click="loadMobileBranchData"
            >
              다시 찾기
            </Button>
          </div>
          <p
            v-else-if="!mobileBranchViewItems.length"
            class="mobile-branch-state"
          >
            {{
              isMobileBranchDetailScreen
                ? '목록에서 이동점포를 먼저 선택해 주세요.'
                : '주변에 예정된 이동점포가 없어요.'
            }}
          </p>
          <div
            v-else
            class="mobile-branch-list"
          >
            <article
              v-for="branch in mobileBranchViewItems"
              :key="mobileBranchId(branch)"
              class="mobile-branch-card"
              :class="{ 'is-selected': isSelectedMobileBranch(branch) }"
            >
              <button
                v-if="isMobileBranchListScreen"
                class="mobile-branch-select"
                :aria-label="`${mobileBranchName(branch)} ${isSelectedMobileBranch(branch) ? '선택됨' : '선택'}`"
                :aria-pressed="isSelectedMobileBranch(branch)"
                type="button"
                @click="selectMobileBranch(branch)"
              >
                <span
                  aria-hidden="true"
                  class="mobile-branch-select-indicator"
                >
                  {{ isSelectedMobileBranch(branch) ? '✓' : '' }}
                </span>
                <span>{{ isSelectedMobileBranch(branch) ? '선택됨' : '이동점포 선택' }}</span>
              </button>
              <div class="mobile-branch-card-body">
                <div class="mobile-branch-card-header">
                  <strong>{{ mobileBranchName(branch) }}</strong>
                  <span>{{ mobileBranchDistance(branch) }}</span>
                </div>
                <p class="mobile-branch-address">{{ mobileBranchAddress(branch) }}</p>
                <dl class="mobile-branch-details">
                  <div>
                    <dt>방문 시간</dt>
                    <dd>{{ mobileBranchSchedule(branch) }}</dd>
                  </div>
                  <div>
                    <dt>가능 업무</dt>
                    <dd>
                      <ul
                        v-if="mobileBranchServices(branch).length"
                        class="mobile-branch-tags"
                      >
                        <li
                          v-for="serviceName in mobileBranchServices(branch)"
                          :key="serviceName"
                        >
                          {{ serviceName }}
                        </li>
                      </ul>
                      <span v-else>안내 없음</span>
                    </dd>
                  </div>
                  <div>
                    <dt>준비물</dt>
                    <dd>
                      <ul
                        v-if="mobileBranchDocuments(branch).length"
                        class="mobile-branch-tags"
                      >
                        <li
                          v-for="document in mobileBranchDocuments(branch)"
                          :key="document"
                        >
                          {{ document }}
                        </li>
                      </ul>
                      <span v-else>안내 없음</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          </div>
        </section>

        <section
          v-if="screen && isReminderListScreen"
          aria-label="리마인더 목록"
          class="service-route-screen-content screen-content reminder-list-content"
          :data-variant="screen.variant"
        >
          <div class="content">
            <div
              v-if="serviceData.loading.reminders"
              aria-live="polite"
              class="reminder-state"
              role="status"
            >
              <strong>리마인더를 불러오고 있어요</strong>
              <p>잠시만 기다려 주세요.</p>
            </div>
            <div
              v-else-if="serviceData.errors.reminders"
              class="reminder-state reminder-state-error"
              role="alert"
            >
              <strong>리마인더를 불러오지 못했어요</strong>
              <p>잠시 후 다시 시도해 주세요.</p>
              <Button
                :disabled="isBusy"
                variant="secondary"
                @click="reloadReminders"
              >
                다시 불러오기
              </Button>
            </div>
            <p
              v-else-if="!serviceData.reminders.length"
              class="reminder-state"
            >
              등록된 리마인더가 없어요. 아래 버튼으로 새 알림을 만들어 보세요.
            </p>
            <div
              v-else
              class="reminder-list"
            >
              <Button
                v-for="reminder in serviceData.reminders"
                :key="reminderIdentifier(reminder)"
                :aria-label="`${reminder.title || '리마인더'} ${formatReminderDateTime(reminder.scheduledAt)} ${reminderStatusLabel(reminder.status)} 수정 또는 취소`"
                :disabled="isBusy || !reminderIdentifier(reminder)"
                class="reminder-list-item"
                variant="secondary"
                @click="openReminder(reminder)"
              >
                <span class="reminder-list-copy">
                  <strong>{{ reminder.title || '제목 없는 리마인더' }}</strong>
                  <span>{{ formatReminderDateTime(reminder.scheduledAt) }}</span>
                </span>
                <span class="reminder-list-status">
                  {{ reminderStatusLabel(reminder.status) }}
                </span>
              </Button>
            </div>
          </div>
        </section>

        <section
          v-if="screen && isReminderEmptyScreen"
          aria-label="리마인더 없음"
          class="service-route-screen-content screen-content reminder-state-content"
          :data-variant="screen.variant"
        >
          <div class="content">
            <div
              v-if="serviceData.loading.reminders"
              aria-live="polite"
              class="reminder-state"
              role="status"
            >
              <strong>리마인더를 확인하고 있어요</strong>
              <p>잠시만 기다려 주세요.</p>
            </div>
            <div
              v-else-if="serviceData.errors.reminders"
              class="reminder-state reminder-state-error"
              role="alert"
            >
              <strong>리마인더를 불러오지 못했어요</strong>
              <p>잠시 후 다시 시도해 주세요.</p>
              <Button
                :disabled="isBusy"
                variant="secondary"
                @click="reloadReminders"
              >
                다시 불러오기
              </Button>
            </div>
            <div
              v-else
              class="reminder-state"
            >
              <strong>등록된 리마인더가 없어요</strong>
              <p>납부일이나 중요한 일정을 놓치지 않도록 알림을 만들어 보세요.</p>
            </div>
          </div>
        </section>

        <section
          v-if="screen && isReminderErrorScreen"
          aria-label="리마인더 조회 오류"
          class="service-route-screen-content screen-content reminder-state-content"
          :data-variant="screen.variant"
        >
          <div class="content">
            <div
              v-if="serviceData.loading.reminders"
              aria-live="polite"
              class="reminder-state"
              role="status"
            >
              <strong>리마인더를 다시 확인하고 있어요</strong>
              <p>잠시만 기다려 주세요.</p>
            </div>
            <div
              v-else
              class="reminder-state reminder-state-error"
              role="alert"
            >
              <strong>리마인더를 불러오지 못했어요</strong>
              <p>통신 상태를 확인한 뒤 다시 시도해 주세요.</p>
              <Button
                :disabled="isBusy"
                variant="secondary"
                @click="reloadReminders"
              >
                다시 불러오기
              </Button>
            </div>
          </div>
        </section>

        <section
          v-if="screen && isReminderFormScreen"
          aria-label="리마인더 입력"
          class="service-route-screen-content screen-content reminder-form-content"
          :data-variant="screen.variant"
        >
          <form
            class="content reminder-form"
            @submit.prevent="handlePrimary"
          >
            <label class="service-route-input-field">
              <span>알림 제목</span>
              <input
                v-model="reminderTitle"
                autocomplete="off"
                maxlength="100"
                placeholder="예: 병원 예약"
                required
                type="text"
                @input="actionError = ''"
              />
            </label>
            <label class="service-route-input-field">
              <span>날짜</span>
              <input
                v-model="reminderDate"
                :min="reminderMinDate"
                required
                type="date"
                @input="actionError = ''"
              />
            </label>
            <label class="service-route-input-field">
              <span>시간</span>
              <input
                v-model="reminderTime"
                required
                step="60"
                type="time"
                @input="actionError = ''"
              />
            </label>
            <p
              aria-live="polite"
              class="reminder-form-hint"
            >
              현재보다 이후인 날짜와 시간을 선택해 주세요.
            </p>
          </form>
        </section>

        <div
          v-if="showReminderCancelConfirm && isReminderEditScreen"
          ref="reminderCancelDialog"
          aria-describedby="reminder-cancel-description"
          aria-labelledby="reminder-cancel-title"
          aria-modal="true"
          class="reminder-cancel-dialog"
          role="dialog"
          tabindex="-1"
          @keydown.esc.stop="showReminderCancelConfirm = false"
        >
          <div class="reminder-cancel-dialog-card">
            <h2 id="reminder-cancel-title">알림을 취소할까요?</h2>
            <p id="reminder-cancel-description">
              {{ selectedReminder?.title || '이 알림' }}을 취소하면 목록에서 사라져요.
            </p>
            <div class="reminder-cancel-actions">
              <Button
                ref="reminderCancelButton"
                variant="secondary"
                @click="showReminderCancelConfirm = false"
              >
                취소하지 않기
              </Button>
              <Button
                variant="destructive"
                @click="confirmReminderCancel"
              >
                알림 취소
              </Button>
            </div>
          </div>
        </div>

        <label
          v-if="showRecipientSearch"
          class="service-route-input-field"
        >
          <span>받는 분 이름</span>
          <input
            v-model="recipientSearch"
            autocomplete="name"
            maxlength="50"
            placeholder="예: 김영희"
            type="text"
            @input="clearRecipientCandidates"
          />
        </label>

        <label
          v-if="
            service === 'transfer' && screenKey === 'transfer-guardian-confirm' && guardianPending
          "
          class="service-route-input-field"
        >
          <span>보호자에게 온 인증번호</span>
          <input
            v-model="guardianCode"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="12"
            placeholder="받으신 번호를 그대로 적어주세요"
            type="text"
          />
        </label>

        <label
          v-if="
            service === 'transfer' && screenKey === 'transfer-guardian-confirm' && !guardianPending
          "
          class="service-route-input-field"
        >
          <span>거래 승인 비밀번호</span>
          <input
            v-model="transferPin"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="6"
            placeholder="PIN 6자리"
            type="password"
          />
        </label>

        <RouterLink
          v-if="showTransferPinHelp"
          class="service-route-pin-link"
          :to="{ name: 'transfer-pin', query: { from: 'transfer' } }"
        >
          비밀번호를 아직 정하지 않으셨나요? 비밀번호 만들기
        </RouterLink>

        <section
          v-if="service === 'transfer' && screenKey === 'transfer-pending' && guardianPending"
          aria-label="보호자 확인 안내"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>보호자에게 확인 요청을 보냈어요</strong>
          </div>
          <p class="service-route-live-row">
            보호자가 알려주는 번호를 아래에서 입력하시면 계속 보낼 수 있어요.
          </p>
          <RouterLink
            class="service-route-pin-link"
            :to="{ name: 'transfer-screen', params: { screenKey: 'transfer-guardian-confirm' } }"
          >
            인증번호 입력하기
          </RouterLink>
        </section>

        <TransferFlowPanel
          v-if="showTransferFlow"
          :screen-key="screenKey"
        />

        <label
          v-if="service === 'transfer' && screenKey === 'transfer-risk-confirm'"
          class="service-route-input-field"
        >
          <span>송금 목적을 알려주세요 (선택)</span>
          <input
            v-model="riskPurpose"
            maxlength="500"
            placeholder="예: 생활비"
            type="text"
          />
        </label>

        <label
          v-if="service === 'transfer' && screenKey === 'transfer-amount-confirm'"
          v-show="!showTransferFlow"
          class="service-route-input-field"
        >
          <span>보낼 금액</span>
          <input
            v-model="transferAmountInput"
            inputmode="numeric"
            maxlength="12"
            placeholder="예: 50000"
            type="text"
            @input="normalizeTransferAmount"
          />
        </label>

        <section
          v-if="
            service === 'transfer' &&
            screenKey === 'transfer-recipient-select' &&
            !showTransferFlow &&
            transferStore.recipientCandidates.length
          "
          aria-label="받는 분 선택"
          class="service-route-live-panel"
        >
          <div class="service-route-live-heading">
            <strong>받는 분을 선택해 주세요</strong>
          </div>
          <Button
            v-for="candidate in transferStore.recipientCandidates"
            :key="candidate.recipientId || candidate.id"
            :aria-pressed="transferStore.recipient === candidate"
            class="service-route-live-row"
            variant="secondary"
            @click="selectRecipient(candidate)"
          >
            {{ candidate.name || candidate.displayName || '받는 분' }}
            {{ candidate.bankName || candidate.bankCode || '' }}
            {{ candidate.accountNumberMasked || candidate.accountMasked || '' }}
          </Button>
        </section>

        <label
          v-if="
            service === 'transfer' && screenKey === 'transfer-recipient-select' && !showTransferFlow
          "
          class="service-route-input-field"
        >
          <span>받는 분 이름</span>
          <input
            v-model="recipientKeyword"
            autocomplete="name"
            maxlength="50"
            placeholder="예: 김영희"
            type="text"
            @input="clearRecipientCandidates"
          />
        </label>

        <section
          v-if="service === 'transfer' && screenKey === 'transfer-account-select'"
          v-show="!showTransferFlow"
          aria-label="출금 계좌 선택"
          class="service-route-live-panel"
        >
          <div class="service-route-live-heading">
            <strong>출금할 계좌를 선택해 주세요</strong>
            <span v-if="serviceData.loading.accounts">불러오는 중…</span>
          </div>
          <p
            v-if="serviceData.errors.accounts"
            class="service-route-live-error"
            role="status"
          >
            계좌를 불러오지 못했어요. 다시 시도해 주세요.
          </p>
          <Button
            v-if="serviceData.errors.accounts"
            class="service-route-live-retry"
            :disabled="serviceData.loading.accounts"
            variant="secondary"
            @click="reloadTransferAccounts"
          >
            다시 불러오기
          </Button>
          <p
            v-else-if="!serviceData.loading.accounts && !serviceData.accounts.length"
            class="service-route-live-empty"
          >
            등록된 계좌가 없어요. 출금할 계좌를 먼저 등록해 주세요.
          </p>
          <div
            v-if="!serviceData.errors.accounts && serviceData.accounts.length"
            class="service-route-live-rows"
          >
            <Button
              v-for="account in serviceData.accounts"
              :key="account.accountId || account.id"
              :aria-pressed="transferStore.selectedAccount === account"
              class="service-route-live-row"
              variant="secondary"
              @click="selectAccount(account)"
            >
              {{ account.accountName || account.accountType || '내 계좌' }}
              {{ account.accountNumberMasked || '' }}
            </Button>
          </div>
        </section>

        <label
          v-if="service === 'transfer' && screenKey === 'transfer-confirm' && !showTransferFlow"
          class="service-route-input-field"
        >
          <span>송금 PIN 6자리</span>
          <input
            v-model="transferPin"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="6"
            placeholder="PIN 6자리"
            type="password"
          />
        </label>

        <section
          v-if="transferSummaryRows.length && !showTransferFlow"
          aria-label="실제 송금 내용"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>송금 내용을 확인해 주세요</strong>
          </div>
          <div class="service-route-live-rows">
            <div
              v-for="row in transferSummaryRows"
              :key="row.label"
              class="service-route-live-row"
            >
              <span>{{ row.label }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
        </section>
        <section
          v-if="unfinishedTransferRows.length"
          aria-label="하시던 송금"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>여기까지 하셨어요</strong>
          </div>
          <div class="service-route-live-rows">
            <div
              v-for="row in unfinishedTransferRows"
              :key="row.label"
              class="service-route-live-row"
            >
              <span>{{ row.label }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
        </section>

        <section
          v-if="remainingBalanceRows.length"
          aria-label="남은 잔액"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>계좌에서 빠져나간 금액이 없어요</strong>
          </div>
          <div class="service-route-live-rows">
            <div
              v-for="row in remainingBalanceRows"
              :key="row.label"
              class="service-route-live-row"
            >
              <span>{{ row.label }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
        </section>

        <section
          v-if="service === 'transfer' && screenKey === 'transfer-scheduled-list'"
          aria-label="정해둔 보낼 돈"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>정해두신 보낼 돈</strong>
          </div>
          <p
            v-if="!planRows.length"
            class="service-route-live-empty"
          >
            아직 정해두신 것이 없어요. 아래에서 추가하실 수 있어요.
          </p>
          <div
            v-else
            class="service-route-live-rows"
          >
            <RouterLink
              v-for="row in planRows"
              :key="row.id"
              class="service-route-live-row"
              :to="{
                name: 'transfer-screen',
                params: { screenKey: 'transfer-scheduled-edit' },
                query: { planId: row.id },
              }"
            >
              <span>{{ row.label }}{{ row.sent ? ' · 이번 달 보냄' : '' }}</span>
              <b>{{ row.value }}</b>
            </RouterLink>
          </div>
        </section>

        <section
          v-if="duePlanRows.length"
          aria-label="오늘 보낼 돈"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>오늘 보내실 것</strong>
          </div>
          <div class="service-route-live-rows">
            <div
              v-for="row in duePlanRows"
              :key="row.id"
              class="service-route-live-row"
            >
              <span>{{ row.label }}{{ row.sent ? ' · 이번 달 보냄' : '' }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
        </section>

        <section
          v-if="sentPlanRows.length"
          aria-label="이미 보낸 약속"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>이번 달에 이미 보내셨어요</strong>
          </div>
          <div class="service-route-live-rows">
            <div
              v-for="row in sentPlanRows"
              :key="row.label"
              class="service-route-live-row"
            >
              <span>{{ row.label }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
        </section>

        <template v-if="isPlanFormScreen">
          <label class="service-route-input-field">
            <span>무엇을 보내는 돈인가요</span>
            <input
              v-model="planLabel"
              maxlength="30"
              placeholder="예: 월세, 손주 용돈"
              type="text"
            />
          </label>
          <label class="service-route-input-field">
            <span>보낼 금액</span>
            <input
              v-model="planAmount"
              inputmode="numeric"
              maxlength="12"
              placeholder="예: 400000"
              type="text"
            />
          </label>
          <label class="service-route-input-field">
            <span>보낼 날짜 (1~31일)</span>
            <input
              v-model="planDay"
              inputmode="numeric"
              maxlength="2"
              placeholder="예: 25"
              type="text"
            />
          </label>
          <fieldset class="service-route-input-field">
            <legend>얼마나 자주 보낼까요</legend>
            <Button
              class="w-full"
              :variant="planRepeat === 'MONTHLY' ? 'default' : 'secondary'"
              @click="planRepeat = 'MONTHLY'"
            >
              매달 반복
            </Button>
            <Button
              class="w-full"
              :variant="planRepeat === 'ONCE' ? 'default' : 'secondary'"
              @click="planRepeat = 'ONCE'"
            >
              이번 한 번만
            </Button>
          </fieldset>
        </template>

        <section
          v-if="billPaymentRows.length || billDuplicateRows.length"
          :aria-label="billDuplicateRows.length ? '이미 처리된 납부' : '납부 진행'"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>
              {{ billDuplicateRows.length ? '처음 완료된 결과예요' : '은행에 보내고 있어요' }}
            </strong>
          </div>
          <div class="service-route-live-rows">
            <div
              v-for="row in billDuplicateRows.length ? billDuplicateRows : billPaymentRows"
              :key="row.label"
              class="service-route-live-row"
            >
              <span>{{ row.label }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
          <p
            v-if="billDuplicateRows.length"
            class="service-route-live-empty"
          >
            {{ billDuplicateNote }}
          </p>
        </section>

        <section
          v-if="service === 'bills' && screenKey === 'bill-read-aloud' && billSpokenText"
          aria-label="읽고 있는 내용"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>읽고 있는 내용</strong>
          </div>
          <p class="service-route-live-row">{{ billSpokenText }}</p>
        </section>

        <VoiceConversationPanel
          v-if="showVoiceControl"
          :entry-point="service === 'transfer' ? 'TRANSFER' : 'GENERAL_FINANCE'"
          :screen-key="screenKey"
        />

        <section
          v-if="liveKind"
          class="service-route-live-panel"
          aria-live="polite"
        >
          <div class="service-route-live-heading">
            <strong>{{ liveTitle }}</strong>
            <span v-if="liveLoading">불러오는 중…</span>
          </div>
          <p
            v-if="liveError"
            class="service-route-live-error"
            role="status"
          >
            {{ liveError }}
          </p>
          <p
            v-else-if="!liveLoading && !liveRows.length"
            class="service-route-live-empty"
          >
            아직 서버에 저장된 정보가 없어요. 화면의 안내를 따라 등록해 주세요.
          </p>
          <div
            v-else
            class="service-route-live-rows"
          >
            <div
              v-for="row in liveRows"
              :key="`${row.label}-${row.value}`"
              class="service-route-live-row"
            >
              <span>{{ row.label }}</span>
              <b>{{ row.value }}</b>
            </div>
          </div>
        </section>

        <Card
          v-if="!screen"
          class="service-route-card"
        >
          <CardContent>
            <strong v-if="loading">화면을 불러오는 중입니다.</strong>
            <strong v-else>연결된 화면을 찾을 수 없습니다.</strong>
            <p>잠시 후 다시 시도하거나 서비스 홈으로 이동해 주세요.</p>
          </CardContent>
        </Card>
        <footer
          v-if="
            screen &&
            !hideScreenActions &&
            !isBillSourceSelection &&
            (screen.primaryLabel || screen.secondaryLabel)
          "
          class="app-actions service-route-actions"
        >
          <Button
            v-if="screen.primaryLabel"
            class="service-route-primary"
            :disabled="isBusy || mobileBranchPrimaryDisabled"
            @click="handlePrimary"
          >
            {{ isBusy ? '처리하고 있어요…' : screen.primaryLabel }}
          </Button>
          <Button
            v-if="screen.secondaryLabel"
            class="service-route-secondary"
            :disabled="isBusy"
            variant="secondary"
            @click="handleSecondary"
          >
            {{ screen.secondaryLabel }}
          </Button>
        </footer>
      </main>

      <nav
        aria-label="주요 메뉴"
        class="app-bottom-nav four-items service-route-bottom-nav"
      >
        <RouterLink
          replace
          :to="{ name: 'transfer-home' }"
          >홈</RouterLink
        >
        <RouterLink
          replace
          :to="{ name: 'bills-home' }"
          >고지서</RouterLink
        >
        <RouterLink
          replace
          :to="{ name: 'living-home' }"
          >생활금융</RouterLink
        >
        <RouterLink
          replace
          :to="{ name: 'my-page' }"
          >마이페이지</RouterLink
        >
      </nav>
    </article>
  </div>
</template>

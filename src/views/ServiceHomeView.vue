<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { withAppLoading } from '@/services/appLoading.js'
import { useServiceDataStore } from '@/stores/serviceData.js'

const route = useRoute()
const router = useRouter()
const serviceData = useServiceDataStore()

const serviceScreens = {
  bills: {
    title: '고지서 목록',
    description: '등록된 고지서 상태와 납부기한을 봅니다.',
    groups: [
      [
        {
          label: '전기요금 · 48,200원',
          to: { name: 'bills-screen', params: { screenId: '3-04' } },
        },
        {
          label: '통신요금 · 납부 완료',
          to: { name: 'bills-screen', params: { screenId: '3-07' } },
        },
      ],
    ],
    primaryLabel: '고지서 등록',
    primaryTo: { name: 'bills-screen', params: { screenId: '3-02' } },
  },
  living: {
    title: '내 정보',
    description: '계좌·알림·이동점포로 이동합니다.',
    groups: [
      [
        {
          label: '내 계좌',
          to: { name: 'living-screen', params: { screenId: '4-02' } },
        },
        {
          label: '납부 알림',
          to: { name: 'living-screen', params: { screenId: '4-06' } },
        },
      ],
      [
        {
          label: '이동점포 정보',
          to: { name: 'living-screen', params: { screenId: '4-10' } },
        },
      ],
    ],
    primaryLabel: '',
    primaryTo: null,
  },
}

const service = computed(() => (route.name === 'living-home' ? 'living' : 'bills'))
const screen = computed(() => serviceScreens[service.value])
const visibleGroups = computed(() => {
  if (service.value !== 'bills' || !serviceData.bills.length) return screen.value.groups

  return [
    serviceData.bills.slice(0, 4).map((bill) => ({
      label: `${bill.payee || '고지서'} · ${formatCurrency(bill.amount)}`,
      to: {
        name: 'bills-screen',
        params: { screenId: '3-04' },
        query: { billId: bill.billId || bill.id },
      },
    })),
  ]
})
const dataSummary = computed(() => {
  if (service.value === 'bills' && serviceData.monthlySummary) {
    const monthlySummary = serviceData.monthlySummary
    const count = Number(
      monthlySummary.totalCount ?? monthlySummary.billCount ?? monthlySummary.count,
    )
    const total = formatCurrency(monthlySummary.totalAmount ?? monthlySummary.amount)
    return `${Number.isFinite(count) ? count : serviceData.bills.length}건, 이번 달 ${total}입니다.`
  }
  if (service.value === 'bills' && serviceData.bills.length) {
    return `등록된 고지서 ${serviceData.bills.length}건을 불러왔어요.`
  }
  if (service.value === 'living' && serviceData.reminders.length) {
    return `예정된 알림 ${serviceData.reminders.length}건을 불러왔어요.`
  }
  return ''
})

function formatCurrency(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? `${amount.toLocaleString('ko-KR')}원` : '금액 확인 중'
}

onMounted(() => {
  withAppLoading(async () => {
    if (service.value === 'bills') {
      await Promise.all([
        serviceData.loadBills().catch(() => {}),
        serviceData.loadMonthlySummary().catch(() => {}),
      ])
    }
    if (service.value === 'living') {
      await serviceData.loadReminders({ status: 'SCHEDULED' }).catch(() => {})
    }
  })
})

function startVoiceAssist() {
  window.dispatchEvent(new CustomEvent('gwipyeonhan:voice-transfer'))
  router.push({ name: 'voice-screen', params: { screenId: '5-08' } })
}
</script>

<template>
  <div class="app-stage">
    <article class="mobile-app-shell service-home-device">
      <header class="app-header">
        <span
          aria-hidden="true"
          class="app-header-spacer"
        />
        <strong class="app-brand">귀편한 금융</strong>
        <Button
          aria-label="음성 도움"
          class="app-header-button service-mic-button"
          size="icon"
          variant="secondary"
          @click="startVoiceAssist"
        >
          <span
            aria-hidden="true"
            class="service-mic-icon"
          >
            <span class="service-mic-stem" />
          </span>
        </Button>
      </header>

      <main class="app-main service-home-main">
        <section class="screen-heading service-home-heading">
          <span class="service-home-kicker">{{
            service === 'bills' ? '고지서 · 홈' : '생활금융 · 홈'
          }}</span>
          <h1>{{ screen.title }}</h1>
          <p>{{ screen.description }}</p>
        </section>

        <div class="service-home-content">
          <Card class="service-list-card">
            <CardContent class="service-list-content">
              <div
                v-for="(group, groupIndex) in visibleGroups"
                :key="groupIndex"
                class="service-choice-grid"
              >
                <RouterLink
                  v-for="choice in group"
                  :key="choice.label"
                  :to="choice.to"
                  class="service-choice"
                >
                  <span>{{ choice.label }}</span>
                </RouterLink>
              </div>
            </CardContent>
          </Card>
          <p
            v-if="dataSummary"
            class="service-home-data-summary"
            aria-live="polite"
          >
            {{ dataSummary }}
          </p>
          <p
            v-if="
              serviceData.errors[service === 'bills' ? 'bills' : 'reminders'] ||
              (service === 'bills' && serviceData.errors.monthlySummary)
            "
            class="service-home-data-error"
            role="status"
          >
            서버 정보를 불러오지 못했어요. 화면의 기본 안내는 계속 이용할 수 있어요.
          </p>
        </div>
        <footer
          v-if="screen.primaryLabel"
          class="app-actions service-home-actions"
        >
          <RouterLink
            class="service-home-primary"
            :to="screen.primaryTo"
          >
            {{ screen.primaryLabel }}
          </RouterLink>
        </footer>
      </main>

      <nav
        aria-label="주요 메뉴"
        class="app-bottom-nav four-items service-bottom-nav"
      >
        <RouterLink
          replace
          :aria-current="route.name === 'transfer-home' ? 'page' : undefined"
          :to="{ name: 'transfer-home' }"
        >
          홈
        </RouterLink>
        <RouterLink
          replace
          :aria-current="route.name === 'bills-home' ? 'page' : undefined"
          :to="{ name: 'bills-home' }"
        >
          고지서
        </RouterLink>
        <RouterLink
          replace
          :aria-current="route.name === 'living-home' ? 'page' : undefined"
          :to="{ name: 'living-home' }"
        >
          생활금융
        </RouterLink>
        <RouterLink
          replace
          :aria-current="route.name === 'my-page' ? 'page' : undefined"
          :to="{ name: 'my-page' }"
        >
          마이페이지
        </RouterLink>
      </nav>
    </article>
  </div>
</template>

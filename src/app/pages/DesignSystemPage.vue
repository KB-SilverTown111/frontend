<script setup>
import { ref } from 'vue'

import VoiceAssistPanel from '@/features/voice/components/VoiceAssistPanel.vue'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { Progress } from '@/shared/components/ui/progress'

const name = ref('')

const colors = [
  ['Nile Blue', '#173F52', '기본 글자·헤더'],
  ['Summer Green', '#8EBD9D', '주요 행동·완료'],
  ['Barley White', '#FFF5D0', '앱 배경'],
  ['Goldenrod', '#F4D564', '주의·선택'],
  ['Tall Poppy', '#C84F47', '오류·위험'],
]

const typeScale = [
  { label: '화면 제목', token: '--font-size-title', size: '30px', sample: '약관 한눈에 보기' },
  {
    label: '본문·입력',
    token: '--font-size-body',
    size: '19px',
    sample: '필수와 선택 동의를 구분해 보여줍니다.',
  },
  { label: '주요 버튼', token: '--font-size-action', size: '24px', sample: '다음으로' },
  { label: '금액 강조', token: '--font-size-display', size: '36px', sample: '50,000원' },
]

const interactionTokens = [
  ['카드 테두리', '2px', '영역을 또렷하게 구분합니다.'],
  ['선택 카드 높이', '72px', '한 줄씩 넓게 배치해 누르기 쉽습니다.'],
  ['주요 터치 영역', '64px 이상', '버튼과 입력을 손가락으로 쉽게 조작합니다.'],
  ['진행 표시', '1 / 7', '현재 가입 단계를 숫자와 막대로 함께 안내합니다.'],
]
</script>

<template>
  <main class="min-h-screen bg-background px-4 py-6 text-foreground sm:px-8 sm:py-10 lg:px-12">
    <div class="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <header
        class="rounded-[28px] border-2 border-foreground bg-foreground p-6 text-white shadow-xl sm:p-10"
      >
        <Badge
          variant="outline"
          class="border-white/50 bg-white/10 text-white"
        >
          DESIGN SYSTEM · SENIOR UI
        </Badge>
        <h1 class="mt-6 text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl">
          크고 명확하게, 안심되는 금융 경험
        </h1>
        <p
          class="mt-4 max-w-3xl text-[length:var(--font-size-body)] leading-relaxed text-[#d9e5e8]"
        >
          Pretendard Variable과 shadcn-vue 컴포넌트를 바탕으로 귀편한 금융의 화면 기준을 관리합니다.
        </p>
      </header>

      <section class="rounded-[24px] border-2 border-border bg-card p-5 shadow-sm sm:p-8">
        <p class="text-sm font-extrabold tracking-[0.12em] text-[#315a49]">FOUNDATIONS</p>
        <h2 class="mt-2 text-3xl font-extrabold">Color</h2>
        <p class="mt-2 text-[length:var(--font-size-body)] text-muted-foreground">
          상태를 색상 하나에만 의존하지 않고 문구와 아이콘으로 함께 전달합니다.
        </p>
        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <article
            v-for="[label, value, usage] in colors"
            :key="label"
            class="overflow-hidden rounded-2xl border-2 border-border bg-card"
          >
            <div
              class="h-24"
              :style="{ background: value }"
            />
            <div class="p-4">
              <strong class="text-[length:var(--font-size-body)] font-extrabold">{{
                label
              }}</strong>
              <code class="mt-1 block text-base text-muted-foreground">{{ value }}</code>
              <p class="mt-2 text-base text-muted-foreground">{{ usage }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>
              화면 제목 30px, 본문 19px, 주요 버튼 24px, 금액 강조 36px을 사용합니다.
            </CardDescription>
          </CardHeader>
          <CardContent class="grid gap-3">
            <article
              v-for="scale in typeScale"
              :key="scale.token"
              class="rounded-2xl border-2 border-border bg-card p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <strong class="text-[length:var(--font-size-body)] font-extrabold">{{
                  scale.label
                }}</strong>
                <code class="text-base font-bold text-muted-foreground">{{ scale.token }}</code>
              </div>
              <p
                class="mt-3 font-extrabold leading-tight"
                :style="{ fontSize: `var(${scale.token})` }"
              >
                {{ scale.sample }}
              </p>
              <span class="mt-2 block text-base text-muted-foreground">{{ scale.size }}</span>
            </article>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interaction</CardTitle>
            <CardDescription>
              손가락으로 누르기 쉽고 현재 상태를 바로 이해할 수 있게 설계합니다.
            </CardDescription>
          </CardHeader>
          <CardContent class="grid gap-3">
            <article
              v-for="[label, value, description] in interactionTokens"
              :key="label"
              class="rounded-2xl border-2 border-border bg-card p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <strong class="text-[length:var(--font-size-body)] font-extrabold">{{
                  label
                }}</strong>
                <span class="text-xl font-extrabold text-[#315a49]">{{ value }}</span>
              </div>
              <p class="mt-2 text-[length:var(--font-size-body)] text-muted-foreground">
                {{ description }}
              </p>
            </article>
          </CardContent>
        </Card>
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              주요 버튼은 24px 글씨와 64px 이상 터치 영역을 사용합니다.
            </CardDescription>
          </CardHeader>
          <CardContent class="grid gap-3">
            <Button>다음으로</Button>
            <Button variant="secondary">이전으로</Button>
            <Button variant="destructive">삭제하기</Button>
            <Button disabled>사용할 수 없음</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>
              입력칸도 큰 글씨와 굵은 테두리로 현재 위치를 분명하게 보여줍니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              class="mb-2 block text-[length:var(--font-size-body)] font-extrabold"
              for="customer-name"
            >
              이름
            </label>
            <Input
              id="customer-name"
              v-model="name"
              autocomplete="name"
              placeholder="이름을 입력해 주세요"
            />
            <p class="mt-3 text-[length:var(--font-size-body)] text-muted-foreground">
              본인 확인에 사용할 이름입니다.
            </p>
          </CardContent>
        </Card>
      </section>

      <section class="rounded-[24px] border-2 border-border bg-card p-5 shadow-sm sm:p-8">
        <p class="text-sm font-extrabold tracking-[0.12em] text-[#315a49]">FEEDBACK</p>
        <h2 class="mt-2 text-3xl font-extrabold">Alert · Badge · Progress</h2>
        <div class="mt-6 grid gap-3">
          <Alert variant="success">
            <AlertTitle>완료</AlertTitle>
            <AlertDescription>요청한 작업을 안전하게 마쳤습니다.</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <AlertTitle>확인 필요</AlertTitle>
            <AlertDescription>받는 분과 금액을 한 번 더 확인해 주세요.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>처리하지 못했어요</AlertTitle>
            <AlertDescription>입력 정보를 확인하고 다시 시도해 주세요.</AlertDescription>
          </Alert>
        </div>
        <div class="mt-5 flex flex-wrap gap-3">
          <Badge>확인 필요</Badge>
          <Badge variant="success">완료</Badge>
          <Badge variant="destructive">오류</Badge>
          <Badge variant="outline">선택 항목</Badge>
        </div>
        <div class="mt-8">
          <div class="mb-3 flex justify-between text-[length:var(--font-size-body)] font-extrabold">
            <span>가입 진행 단계</span><span>1 / 7</span>
          </div>
          <Progress
            :max="7"
            :value="1"
          />
        </div>
      </section>

      <VoiceAssistPanel class="border-2 border-primary" />
    </div>
  </main>
</template>

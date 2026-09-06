<script setup>
import { ref } from 'vue'

import VoiceAssistPanel from '@/components/patterns/VoiceAssistPanel.vue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'

const name = ref('')
const colors = [
  ['Nile Blue', '#173F52'],
  ['Summer Green', '#8EBD9D'],
  ['Barley White', '#FFF5D0'],
  ['Goldenrod', '#F4D564'],
  ['Tall Poppy', '#C84F47'],
]
</script>

<template>
  <main class="min-h-screen bg-[#f2f5f4] px-5 py-10 sm:px-8 lg:px-12">
    <div class="mx-auto max-w-6xl space-y-8">
      <header class="rounded-[32px] bg-foreground p-8 text-white shadow-xl sm:p-12">
        <Badge class="bg-white/10 text-white"> DESIGN SYSTEM V1 </Badge>
        <h1 class="mt-6 text-4xl font-bold leading-tight tracking-[-0.04em] sm:text-5xl">
          쉽고, 크고, 안심되는 금융 경험
        </h1>
        <p class="mt-4 max-w-2xl text-lg leading-relaxed text-[#d9e5e8]">
          귀편한 금융 109개 화면의 공통 패턴을 shadcn-vue 방식으로 구성했습니다.
        </p>
      </header>

      <section class="rounded-[28px] bg-card p-6 shadow-sm sm:p-8">
        <p class="text-sm font-bold tracking-[0.12em] text-[#315a49]">FOUNDATIONS</p>
        <h2 class="mt-2 text-3xl font-bold">Color</h2>
        <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <article
            v-for="[label, value] in colors"
            :key="label"
            class="overflow-hidden rounded-xl border bg-card"
          >
            <div
              class="h-28"
              :style="{ background: value }"
            />
            <div class="p-4">
              <strong>{{ label }}</strong
              ><code class="mt-1 block text-sm text-muted-foreground">{{ value }}</code>
            </div>
          </article>
        </div>
      </section>

      <section class="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle
            ><CardDescription> 최소 44px 터치 영역과 명확한 상태를 유지합니다. </CardDescription>
          </CardHeader>
          <CardContent class="grid gap-3">
            <Button>다음으로</Button>
            <Button variant="secondary"> 이전으로 </Button>
            <Button variant="destructive"> 삭제하기 </Button>
            <Button disabled> 사용할 수 없음 </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle
            ><CardDescription> 라벨과 도움말을 항상 입력칸 가까이에 둡니다. </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              class="mb-2 block text-sm font-bold"
              for="customer-name"
              >이름</label
            >
            <Input
              id="customer-name"
              v-model="name"
              autocomplete="name"
              placeholder="이름을 입력해 주세요"
            />
            <p class="mt-2 text-sm text-muted-foreground">본인 확인에 사용할 이름입니다.</p>
          </CardContent>
        </Card>
      </section>

      <section class="rounded-[28px] bg-card p-6 shadow-sm sm:p-8">
        <p class="text-sm font-bold tracking-[0.12em] text-[#315a49]">FEEDBACK</p>
        <h2 class="mt-2 text-3xl font-bold">Alert · Badge · Progress</h2>
        <div class="mt-6 grid gap-4 lg:grid-cols-3">
          <Alert variant="success">
            <AlertTitle>완료</AlertTitle
            ><AlertDescription>요청한 작업을 안전하게 마쳤습니다.</AlertDescription>
          </Alert>
          <Alert variant="warning">
            <AlertTitle>확인 필요</AlertTitle
            ><AlertDescription>받는 분과 금액을 한 번 더 확인해 주세요.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>처리하지 못했어요</AlertTitle
            ><AlertDescription>입력 정보를 확인하고 다시 시도해 주세요.</AlertDescription>
          </Alert>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          <Badge>확인 필요</Badge><Badge variant="success"> 완료 </Badge
          ><Badge variant="destructive"> 오류 </Badge>
        </div>
        <div class="mt-8">
          <div class="mb-3 flex justify-between text-sm font-semibold">
            <span>송금 확인 단계</span><span>2 / 4</span>
          </div>
          <Progress :value="50" />
        </div>
      </section>

      <VoiceAssistPanel />
    </div>
  </main>
</template>

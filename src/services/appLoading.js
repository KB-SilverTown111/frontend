import { computed, ref } from 'vue'

const pendingLoads = ref(0)

export const isAppLoading = computed(() => pendingLoads.value > 0)

export function beginAppLoading() {
  pendingLoads.value += 1
}

export function endAppLoading() {
  pendingLoads.value = Math.max(0, pendingLoads.value - 1)
}

export async function withAppLoading(task) {
  beginAppLoading()
  try {
    return await task()
  } finally {
    endAppLoading()
  }
}

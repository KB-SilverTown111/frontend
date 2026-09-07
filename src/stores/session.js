import { useBillStore } from './bill.js'
import { useServiceDataStore } from './serviceData.js'
import { useTransferStore } from './transfer.js'
import { useVoiceStore } from './voice.js'

export function resetAuthenticatedStores(pinia) {
  useServiceDataStore(pinia).reset()
  useTransferStore(pinia).reset()
  useBillStore(pinia).reset()
  useVoiceStore(pinia).reset()
}

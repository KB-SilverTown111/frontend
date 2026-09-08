import { useBillStore } from '../../bills/stores/bill.js'
import { useServiceDataStore } from '../../living/stores/serviceData.js'
import { useTransferPlanStore } from '../../transfer/stores/transferPlan.js'
import { useTransferStore } from '../../transfer/stores/transfer.js'
import { useVoiceStore } from '../../voice/stores/voice.js'

export function resetAuthenticatedStores(pinia) {
  useServiceDataStore(pinia).reset()
  useTransferStore(pinia).reset()
  useTransferPlanStore(pinia).reset()
  useBillStore(pinia).reset()
  useVoiceStore(pinia).reset()
}

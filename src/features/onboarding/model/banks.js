const icon = (slug, state) => `/assets/banks/${slug}-${state}.png`

export const BANKS = Object.freeze(
  [
    ['004', '국민은행', 'kb'],
    ['003', '기업은행', 'ibk'],
    ['081', '하나은행', 'hana'],
    ['088', '신한은행', 'shinhan'],
    ['035', '제주은행', 'jeju'],
    ['020', '우리은행', 'woori'],
    ['071', '우체국', 'woochekook'],
    ['031', 'iM뱅크', 'im'],
    ['034', '광주은행', 'gwangju'],
    ['037', '전북은행', 'jeonbuk'],
    ['032', '부산은행', 'busan'],
    ['039', '경남은행', 'gyeongnam'],
    ['011', '농협은행', 'nh'],
    ['007', '수협은행', 'sh'],
    ['045', '새마을금고', 'mg'],
    ['089', '케이뱅크', 'kbank'],
    ['023', 'SC제일은행', 'sc'],
    ['012', '지역농축협', 'nhlocal'],
  ].map(([code, name, slug]) => ({
    code,
    name,
    defaultIcon: icon(slug, 'default'),
    selectedIcon: icon(slug, 'selected'),
  })),
)

export function getBank(code) {
  return BANKS.find((bank) => bank.code === code) ?? null
}

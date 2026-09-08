const POSTCODE_SCRIPT_URL = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

let postcodeApiPromise

export function loadPostcodeApi() {
  if (window.kakao?.Postcode) return Promise.resolve(window.kakao.Postcode)
  if (postcodeApiPromise) return postcodeApiPromise

  postcodeApiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = POSTCODE_SCRIPT_URL
    script.async = true
    script.onload = () => {
      if (window.kakao?.Postcode) resolve(window.kakao.Postcode)
      else reject(new Error('Kakao Postcode API is unavailable.'))
    }
    script.onerror = () => {
      postcodeApiPromise = undefined
      reject(new Error('Failed to load Kakao Postcode API.'))
    }
    document.head.append(script)
  })

  return postcodeApiPromise
}

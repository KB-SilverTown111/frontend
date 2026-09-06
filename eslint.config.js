import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  {
    ignores: ['dist/', 'node_modules/', 'android/', '.gradle/'],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-indent': 'off',
      'vue/html-self-closing': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
      'vue/singleline-html-element-content-newline': 'off',
    },
  },
  {
    // 오디오 스레드에서 실행되는 파일이라 브라우저 전역이 아닌 AudioWorkletGlobalScope를 쓴다.
    files: ['src/services/pcmWorkletProcessor.js'],
    languageOptions: {
      globals: {
        ...globals.audioWorklet,
      },
    },
  },
]

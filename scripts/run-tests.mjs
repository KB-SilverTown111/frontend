import { spawn } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Windows 셸은 package.json 스크립트의 와일드카드를 확장하지 않고,
 * node --test의 글롭 지원은 Node 22부터라 낮은 버전에서는 실행 자체가 안 된다.
 * 여기에서 파일 목록을 직접 만들어 넘기면 셸과 Node 버전에 상관없이 동작한다.
 */
const scriptsDirectory = dirname(fileURLToPath(import.meta.url))
const testsDirectory = join(scriptsDirectory, '..', 'tests')
const prefix = process.argv[2] ?? ''

function collectTestFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name)
    return entry.isDirectory() ? collectTestFiles(entryPath) : [entryPath]
  })
}

const testFiles = collectTestFiles(testsDirectory)
  .filter((filePath) => {
    const name = basename(filePath)
    return name.startsWith(prefix) && name.endsWith('.test.mjs')
  })
  .sort()

if (testFiles.length === 0) {
  console.error(`실행할 테스트를 찾지 못했습니다: tests/**/${prefix}*.test.mjs`)
  process.exit(1)
}

const child = spawn(process.execPath, ['--test', ...testFiles], { stdio: 'inherit' })

child.on('error', (error) => {
  console.error(error.message)
  process.exit(1)
})

child.on('close', (code, signal) => {
  process.exit(signal ? 1 : (code ?? 1))
})

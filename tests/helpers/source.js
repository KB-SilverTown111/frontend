import { readFileSync } from 'node:fs'

export function readSource(relativePath, baseUrl) {
  return readFileSync(new URL(relativePath, baseUrl), 'utf8')
}

export function createSourceReader(baseUrl) {
  return (relativePath) => readSource(relativePath, baseUrl)
}

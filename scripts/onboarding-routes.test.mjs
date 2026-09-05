import assert from 'node:assert/strict'
import test from 'node:test'

import { routes } from '../src/router/routes.js'

test('root entry opens the real onboarding start step', () => {
  const root = routes.find(({ path }) => path === '/')
  assert.deepEqual(root.redirect, {
    name: 'onboarding',
    params: { stepId: 'start' },
  })
})

test('onboarding route keeps the current step in a readable URL', () => {
  const onboarding = routes.find(({ name }) => name === 'onboarding')
  assert.equal(onboarding.path, '/onboarding/:stepId')
})

test('the Figma help screen has a production route outside the prototype', () => {
  const help = routes.find(({ name }) => name === 'onboarding-help')
  assert.equal(help.path, '/onboarding/help')
})

test('prototype and design-system routes remain available', () => {
  assert.equal(
    routes.some(({ name }) => name === 'prototype-index'),
    true,
  )
  assert.equal(
    routes.some(({ name }) => name === 'prototype-screen'),
    true,
  )
  assert.equal(
    routes.some(({ name }) => name === 'design-system'),
    true,
  )
})

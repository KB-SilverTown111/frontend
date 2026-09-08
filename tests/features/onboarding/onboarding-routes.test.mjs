import assert from 'node:assert/strict'
import test from 'node:test'

import { routes } from '../../../src/app/router/routes.js'

test('root entry opens the login screen', () => {
  const root = routes.find(({ path }) => path === '/')
  assert.deepEqual(root.redirect, {
    name: 'onboarding',
    params: { stepId: 'login' },
  })
})

test('onboarding entry opens the login screen while the signup start route remains available', () => {
  const onboarding = routes.find(({ path }) => path === '/onboarding')
  assert.deepEqual(onboarding.redirect, {
    name: 'onboarding',
    params: { stepId: 'login' },
  })

  const onboardingStep = routes.find(({ path }) => path === '/onboarding/:stepId')
  assert.equal(onboardingStep.path, '/onboarding/:stepId')
})

test('onboarding route keeps the current step in a readable URL', () => {
  const onboarding = routes.find(({ name }) => name === 'onboarding')
  assert.equal(onboarding.path, '/onboarding/:stepId')
})

test('the Figma help screen has a production route outside the prototype', () => {
  const help = routes.find(({ name }) => name === 'onboarding-help')
  assert.equal(help.path, '/onboarding/help')
})

test('font size settings are available from the unauthenticated login flow', () => {
  const fontSize = routes.find(({ name }) => name === 'font-size')

  assert.equal(fontSize?.path, '/font-size')
  assert.equal(typeof fontSize?.component, 'function')
})

test('design-system route remains available', () => {
  assert.equal(
    routes.some(({ name }) => name === 'design-system'),
    true,
  )
})

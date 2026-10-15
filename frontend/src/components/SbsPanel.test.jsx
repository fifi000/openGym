// @vitest-environment happy-dom
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SbsPanel from './SbsPanel.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
const mocks = vi.hoisted(() => ({
  sent: [],
  state: null,
  update: vi.fn(mut => mut(mocks.state)),
  api: vi.fn(async (path, options) => {
    if (path === '/api/sbs/status') return { connected: true }
    if (path === '/api/sbs/usage') return { primary: { usedPercent: 25 }, secondary: { usedPercent: 10 } }
    const body = JSON.parse(options.body)
    mocks.sent.push(body)
    return { reason: `Reply ${mocks.sent.length}`, sources: [], memory: [] }
  }),
}))
vi.mock('../store/useStore.js', () => ({ useStore: () => ({ S: mocks.state, update: mocks.update }) }))
vi.mock('../lib/api.js', () => ({ api: (...args) => mocks.api(...args) }))

let host, root
beforeEach(() => {
  mocks.state = { unit: 'kg', routines: [], workouts: [], customEx: [], active: null,
    sbs: { enabled: true, week: 2, cycle: 3, maxes: { bench: 100, squat: 150, accessory: 60, deadlift: 180 },
      rounding: 2.5, autoCoach: true, memory: [], audit: [] } }
  mocks.sent.length = 0
  mocks.api.mockClear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

const render = () => act(() => root.render(<SbsPanel />))
const enter = async text => {
  const input = host.querySelector('#sbs-chat-input')
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set
    setter.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => host.querySelector('.sbs-chat-compose').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
}

describe('SBS Coach dashboard', () => {
  it('shows subscription, chat and collapsible settings, history, and memory', async () => {
    render()
    await act(async () => { await Promise.resolve(); await Promise.resolve() })
    expect(host.textContent).toContain('Week 2 of 4')
    expect(host.textContent).toContain('Codex connected')
    expect(host.textContent).toContain('5-hour window')
    expect(host.querySelectorAll('.sbs-disclosure')).toHaveLength(3)
    expect(host.querySelector('#sbs-chat-input')).not.toBeNull()
  })

  it('sends the conversation window and retains replies for follow-up questions', async () => {
    render()
    await enter('How was my last bench session?')
    await enter('And what should I change next time?')
    expect(mocks.sent).toHaveLength(2)
    expect(mocks.sent[1].conversation).toEqual([
      { role: 'user', text: 'How was my last bench session?' },
      { role: 'assistant', text: 'Reply 1' },
    ])
    expect(host.textContent).toContain('Reply 2')
  })
})

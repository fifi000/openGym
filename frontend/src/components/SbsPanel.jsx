import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore.js'
import { api } from '../lib/api.js'

const formatReset = value => value ? new Date(value * 1000).toLocaleString() : null

function UsageWindow({ label, window }) {
  if (!window) return null
  const remaining = Math.max(0, Math.min(100, 100 - window.usedPercent))
  return <div className="sbs-usage-window">
    <div className="sbs-usage-label"><span>{label}</span><b>{Math.round(remaining)}% left</b></div>
    <progress max="100" value={window.usedPercent} aria-label={`${label}: ${Math.round(remaining)}% remaining`} />
    {window.resetsAt && <small>Resets {formatReset(window.resetsAt)}</small>}
  </div>
}

function SourceList({ sources = [] }) {
  if (!sources.length) return null
  return <div className="sbs-sources" aria-label="Sources">{sources.map(source => {
    const label = `${source.title}${source.page ? ` · p. ${source.page}` : ''}`
    return source.url
      ? <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{label}</a>
      : <span key={source.id}>{label}</span>
  })}</div>
}

export default function SbsPanel() {
  const { S, update } = useStore()
  const [status, setStatus] = useState(null)
  const [usage, setUsage] = useState(null)
  const [usageBusy, setUsageBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [thread, setThread] = useState([])
  const [busy, setBusy] = useState(false)
  const logEnd = useRef(null)

  const refreshUsage = async () => {
    setUsageBusy(true)
    try { setUsage(await api('/api/sbs/usage')) }
    catch (error) { setUsage({ error: error.message }) }
    finally { setUsageBusy(false) }
  }

  useEffect(() => {
    if (!S.sbs?.enabled) return
    api('/api/sbs/status').then(setStatus).catch(() => setStatus({ connected: false }))
    refreshUsage()
  }, [S.sbs?.enabled])

  useEffect(() => { logEnd.current?.scrollIntoView({ block: 'end' }) }, [thread, busy])

  if (!S.sbs?.enabled) return null

  const change = (key, value) => update(state => {
    state.sbs[key] = value
    state.routines.forEach(routine => delete routine.sbsPrepared)
  })

  const ask = async event => {
    event?.preventDefault()
    const prompt = message.trim()
    if (!prompt || busy) return
    const previous = thread.slice(-12).map(({ role, text }) => ({ role, text }))
    setThread(items => [...items, { role: 'user', text: prompt }])
    setMessage('')
    setBusy(true)
    try {
      const answer = await api('/api/sbs/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: prompt,
          conversation: previous,
          state: { sbs: S.sbs, routines: S.routines, workouts: S.workouts.slice(-60), customEx: S.customEx },
        }),
        timeout: 180000,
      })
      setThread(items => [...items, { role: 'assistant', text: answer.reason, sources: answer.sources || [] }])
      if (answer.memory?.length) update(state => { state.sbs.memory = [...(state.sbs.memory || []), ...answer.memory].slice(-60) })
    } catch (error) {
      setThread(items => [...items, { role: 'error', text: error.message }])
    } finally { setBusy(false) }
  }

  const clearThread = () => setThread([])
  const connected = status?.connected
  const windows = usage?.primary || usage?.secondary

  return <section className="sbs-panel" aria-labelledby="sbs-title">
    <header className="sbs-head">
      <div className="sbs-head-copy">
        <div className="sbs-eyebrow">STRONGER BY SCIENCE</div>
        <h2 id="sbs-title">Your training coach</h2>
        <p>Cycle {S.sbs.cycle} <span aria-hidden="true">·</span> Week {S.sbs.week} of 4</p>
      </div>
      <span className={`sbs-connection ${connected ? 'is-connected' : connected === false ? 'is-disconnected' : ''}`}>
        <i aria-hidden="true" />
        {connected == null ? 'Checking Codex' : connected ? 'Codex connected' : 'Baseline mode'}
      </span>
      <div className="sbs-week-track" role="img" aria-label={`Week ${S.sbs.week} of 4`}>
        {[1, 2, 3, 4].map(week => <span key={week} className={week <= S.sbs.week ? 'is-current' : ''} />)}
      </div>
      <p className="sbs-cycle-note">The cycle advances after you complete Upper A, Upper B, and Lower.</p>
    </header>

    <section className="sbs-usage" aria-labelledby="sbs-usage-title">
      <div className="sbs-section-heading">
        <div><h3 id="sbs-usage-title">Codex usage</h3><p>From your active subscription</p></div>
        <button className="record-link" disabled={usageBusy} onClick={refreshUsage}>{usageBusy ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      {windows ? <div className="sbs-usage-grid">
        <UsageWindow label="5-hour window" window={usage.primary} />
        <UsageWindow label="Weekly window" window={usage.secondary} />
      </div> : <p className={`sbs-usage-empty ${usage?.error ? 'has-error' : ''}`} role={usage?.error ? 'status' : undefined}>
        {usage?.error || 'Checking your subscription limits…'}
      </p>}
      {usage?.readAt && <small className="sbs-usage-time">Updated {new Date(usage.readAt).toLocaleTimeString()}</small>}
    </section>

    <section className="sbs-chat" aria-labelledby="sbs-chat-title">
      <div className="sbs-chat-head">
        <div className="sbs-chat-avatar" aria-hidden="true">S</div>
        <div><h3 id="sbs-chat-title">Coach chat</h3><p>Ask about your plan, training, or next session.</p></div>
        {thread.length > 0 && <button className="record-link sbs-new-chat" onClick={clearThread}>New chat</button>}
      </div>
      <div className="sbs-chat-log" role="log" aria-live="polite" aria-relevant="additions text">
        {thread.length === 0 && <div className="sbs-chat-empty">
          <span className="sbs-chat-spark" aria-hidden="true">✦</span>
          <b>What would you like to work on?</b>
          <p>Your coach uses your training history and the SBS references you supplied.</p>
        </div>}
        {thread.map((item, index) => <article key={`${index}-${item.role}`} className={`sbs-message is-${item.role}`}>
          <div className="sbs-message-name">{item.role === 'user' ? 'You' : item.role === 'error' ? 'Couldn’t reach Coach' : 'Coach'}</div>
          <p>{item.text}</p>
          {item.sources?.length > 0 && <SourceList sources={item.sources} />}
        </article>)}
        {busy && <article className="sbs-message is-thinking" aria-label="Coach is thinking">
          <div className="sbs-message-name">Coach</div><p><span className="sbs-thinking-dots">Thinking…</span></p>
        </article>}
        <div ref={logEnd} />
      </div>
      <form className="sbs-chat-compose" onSubmit={ask}>
        <label className="sr-only" htmlFor="sbs-chat-input">Message your coach</label>
        <textarea id="sbs-chat-input" value={message} onChange={event => setMessage(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); ask(event) } }}
          placeholder="Message your coach…" maxLength={4000} rows={2} />
        <button className="btn sbs-send" disabled={busy || !message.trim()} aria-label="Send message">
          {busy ? 'Sending…' : 'Send'}
        </button>
      </form>
      <p className="sbs-chat-hint">Enter to send · Shift + Enter for a new line</p>
    </section>

    <details className="sbs-disclosure">
      <summary><span>Training maxes & preferences</span><small>Plan inputs and Coach behavior</small></summary>
      <div className="sbs-disclosure-body">
        <div className="sbs-max-grid">{Object.entries(S.sbs.maxes).map(([key, value]) => <label className="sbs-field" key={key}>
          <span>{key === 'accessory' ? 'Flintstone Press' : key === 'deadlift' ? 'Deadlift' : key.charAt(0).toUpperCase() + key.slice(1)} <small>({S.unit})</small></span>
          <input type="number" step="0.5" min="1" max="600" value={value} onChange={event => {
            const number = Number(event.target.value)
            if (number > 0 && number <= 600) update(state => {
              state.sbs.maxes[key] = number
              state.routines.forEach(routine => delete routine.sbsPrepared)
            })
          }} />
        </label>)}</div>
        <label className="sbs-field"><span>Codex model</span>
          <select aria-label="Codex model" value={S.sbs.model || 'gpt-6.1-sol'} onChange={event => change('model', event.target.value)}>
            <option value="gpt-6.1-sol">GPT-6.1 Sol · recommended</option><option value="gpt-6-luna">GPT-6 Luna</option>
            <option value="gpt-6-astra">GPT-6 Astra</option><option value="gpt-6-sol">GPT-6 Sol</option>
          </select>
        </label>
        <label className="sbs-field"><span>Rounding <small>({S.unit})</small></span><input type="number" min="0.25" step="0.25" value={S.sbs.rounding} onChange={event => {
          const number = Number(event.target.value)
          if (number >= 0.25) change('rounding', number)
        }} /></label>
        <label className="sbs-field"><span>Current week</span><input type="number" min="1" max="4" value={S.sbs.week} onChange={event => {
          const number = Number(event.target.value)
          if (number >= 1 && number <= 4) { change('week', number); change('completed', []) }
        }} /></label>
        <label className="sbs-toggle"><input type="checkbox" checked={S.sbs.autoCoach !== false} onChange={event => change('autoCoach', event.target.checked)} />
          <span><b>Apply Coach decisions automatically</b><small>Coach adjusts the next session using the plan and your training data.</small></span>
        </label>
        <label className="sbs-field sbs-goal"><span>Training goal</span><textarea value={S.sbs.goal || ''} onChange={event => change('goal', event.target.value)} /></label>
      </div>
    </details>

    <details className="sbs-disclosure">
      <summary><span>Decision history</span><small>{(S.sbs.audit || []).length} {S.sbs.audit?.length === 1 ? 'decision' : 'decisions'} · undo recent change</small></summary>
      <div className="sbs-disclosure-body sbs-history">
        {(S.sbs.audit || []).length ? S.sbs.audit.map((entry, index) => <article className="sbs-audit" key={entry.id}>
          <div className="sbs-audit-meta">{new Date(entry.date).toLocaleString()} <span>·</span> Cycle {entry.cycle}, Week {entry.week} <span>·</span> {entry.mode}</div>
          <p>{entry.reason}</p><SourceList sources={entry.sources} />
          {index === 0 && !S.active && entry.week === S.sbs.week && entry.cycle === S.sbs.cycle && <button className="btn ghost" onClick={() => update(state => {
            const at = state.routines.findIndex(routine => routine.id === entry.routineId)
            if (at >= 0) state.routines[at] = entry.before
            state.sbs.maxes = entry.beforeMaxes
            state.sbs.audit = state.sbs.audit.slice(1)
          })}>Undo decision</button>}
        </article>) : <p className="sbs-muted">Coach decisions will appear here after a session is prepared.</p>}
      </div>
    </details>

    <details className="sbs-disclosure">
      <summary><span>Coach memory</span><small>{(S.sbs.memory || []).length} saved notes</small></summary>
      <div className="sbs-disclosure-body sbs-memory">
        {(S.sbs.memory || []).length ? S.sbs.memory.map((item, index) => <article className="sbs-memory-item" key={index}>
          <p>{typeof item === 'string' ? item : item.text}</p>{item.status && <small>{item.status}</small>}
          <button className="record-link" onClick={() => update(state => { state.sbs.memory = state.sbs.memory.filter((_, at) => at !== index) })}>Remove</button>
        </article>) : <p className="sbs-muted">Useful facts and hypotheses saved by Coach will appear here.</p>}
      </div>
    </details>
  </section>
}

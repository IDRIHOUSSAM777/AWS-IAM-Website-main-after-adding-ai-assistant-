import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Lightbulb, Play, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react'
import './lab.css'

type Mode = 'missions' | 'sandbox'
type FlowPhase = 'idle' | 'identity' | 'iam' | 'result'
type Verdict = { decision: 'ALLOW' | 'DENY'; reason: string }

interface SimState {
  users: string[]
  mfaUsers: string[]
  groups: Record<string, string[]>
  policies: Record<string, { effect: 'Allow' | 'Deny'; action: string; resource: string }>
  attachedGroupPolicies: Record<string, string[]>
  roles: Record<string, { trust: string; policy: string | null }>
}

const INITIAL_STATE: SimState = {
  users: ['sara.dev'],
  mfaUsers: [],
  groups: { Developers: ['sara.dev'], Finance: [] },
  policies: {
    ReadOrdersBucket: {
      effect: 'Allow',
      action: 's3:GetObject',
      resource: 'arn:aws:s3:::student-demo-bucket/*',
    },
    DenyAllS3: {
      effect: 'Deny',
      action: 's3:*',
      resource: '*',
    },
  },
  attachedGroupPolicies: { Developers: [], Finance: [] },
  roles: {
    OrderFunctionRole: { trust: 'lambda.amazonaws.com', policy: null },
  },
}

const MISSIONS = [
  {
    id: 1,
    title: 'Create a user & MFA',
    goal: 'Create one more user and turn on MFA for someone.',
    hint: 'Type a name such as "karim.dev", click Create, then flip the MFA switch on.',
    check: (s: SimState) => s.users.length >= 2 && s.mfaUsers.length >= 1,
  },
  {
    id: 2,
    title: 'Group & policy',
    goal: 'Put a user in a group and attach ReadOrdersBucket to it.',
    hint: 'Pick a group and a user, click Add, then attach ReadOrdersBucket.',
    check: (s: SimState) =>
      Object.entries(s.attachedGroupPolicies).some(
        ([group, policies]) => policies.includes('ReadOrdersBucket') && (s.groups[group]?.length ?? 0) > 0,
      ),
  },
  {
    id: 3,
    title: 'Lambda role',
    goal: 'Attach ReadOrdersBucket to OrderFunctionRole.',
    hint: 'In the role card, choose ReadOrdersBucket in the select.',
    check: (s: SimState) => s.roles.OrderFunctionRole?.policy === 'ReadOrdersBucket',
  },
]

const RESOURCES = [
  { title: 'S3 bucket', detail: 'student-demo-bucket', y: 16 },
  { title: 'DynamoDB table', detail: 'orders', y: 92 },
  { title: 'Billing', detail: 'cost reports', y: 168 },
]

function initials(name: string) {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '')
  return (clean.slice(0, 2) || '?').toUpperCase()
}

export default function IamLab() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const mode: Mode = searchParams.get('mode') === 'sandbox' ? 'sandbox' : 'missions'
  const [state, setState] = useState<SimState>(INITIAL_STATE)
  const [newUser, setNewUser] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('Developers')
  const [selectedMember, setSelectedMember] = useState('sara.dev')
  const [selectedPolicy, setSelectedPolicy] = useState('ReadOrdersBucket')
  const [simPrincipal, setSimPrincipal] = useState('user:sara.dev')
  const [simAction, setSimAction] = useState('s3:GetObject')
  const [simResource, setSimResource] = useState('arn:aws:s3:::student-demo-bucket/notes.pdf')
  const [showHint, setShowHint] = useState<Record<number, boolean>>({})
  const [flowPhase, setFlowPhase] = useState<FlowPhase>('idle')
  const [tested, setTested] = useState<Verdict | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const flowTimers = useRef<number[]>([])
  const toastTimer = useRef(0)
  const celebrateTimer = useRef(0)
  const previousCompleted = useRef<number[]>([])
  const simRef = useRef<HTMLElement>(null)
  const [confetti] = useState(() =>
    Array.from({ length: 26 }, (_, index) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.6 + Math.random() * 1.1,
      color: ['#ffb020', '#38bdf8', '#34d399', '#f472b6', '#facc15'][index % 5],
      rotate: Math.random() * 360,
    })),
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const completedMissions = MISSIONS.filter((mission) => mission.check(state))
  const completedIds = completedMissions.map((mission) => mission.id)
  const completedKey = completedIds.join(',')
  const allDone = completedMissions.length === MISSIONS.length
  const activeMission = MISSIONS.find((mission) => !completedIds.includes(mission.id)) ?? null

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  useEffect(() => {
    const ids = completedKey ? completedKey.split(',').map(Number) : []
    const newly = ids.filter((id) => !previousCompleted.current.includes(id))
    previousCompleted.current = ids
    if (newly.length === 0) return

    window.clearTimeout(toastTimer.current)
    setToast(`Mission ${newly[0]} complete!`)
    toastTimer.current = window.setTimeout(() => setToast(null), 2200)

    if (ids.length === MISSIONS.length) {
      setCelebrate(true)
      window.clearTimeout(celebrateTimer.current)
      celebrateTimer.current = window.setTimeout(() => setCelebrate(false), 2600)
    }
  }, [completedKey])

  useEffect(() => () => {
    flowTimers.current.forEach((timer) => window.clearTimeout(timer))
    window.clearTimeout(toastTimer.current)
    window.clearTimeout(celebrateTimer.current)
  }, [])

  function resetFlow() {
    flowTimers.current.forEach((timer) => window.clearTimeout(timer))
    flowTimers.current = []
    setFlowPhase('idle')
    setTested(null)
  }

  function createUser() {
    const clean = newUser.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
    if (!clean || state.users.includes(clean)) return
    setState((prev) => ({
      ...prev,
      users: [...prev.users, clean],
      groups: {
        ...prev.groups,
        [selectedGroup]: [...(prev.groups[selectedGroup] ?? []), clean],
      },
    }))
    setSelectedMember(clean)
    setNewUser('')
  }

  function toggleMfa(user: string) {
    setState((prev) => ({
      ...prev,
      mfaUsers: prev.mfaUsers.includes(user)
        ? prev.mfaUsers.filter((item) => item !== user)
        : [...prev.mfaUsers, user],
    }))
  }

  function addUserToGroup() {
    if (!selectedMember) return
    setState((prev) => {
      const current = prev.groups[selectedGroup] ?? []
      if (current.includes(selectedMember)) return prev
      return {
        ...prev,
        groups: { ...prev.groups, [selectedGroup]: [...current, selectedMember] },
      }
    })
  }

  function attachPolicyToGroup() {
    setState((prev) => {
      const current = prev.attachedGroupPolicies[selectedGroup] ?? []
      if (current.includes(selectedPolicy)) return prev
      return {
        ...prev,
        attachedGroupPolicies: {
          ...prev.attachedGroupPolicies,
          [selectedGroup]: [...current, selectedPolicy],
        },
      }
    })
  }

  function attachPolicyToRole(roleName: string, policyName: string) {
    setState((prev) => ({
      ...prev,
      roles: {
        ...prev.roles,
        [roleName]: { ...prev.roles[roleName], policy: policyName || null },
      },
    }))
  }

  function evaluateAccess(): Verdict {
    const matchingPolicies: Array<{ name: string; effect: 'Allow' | 'Deny' }> = []

    if (simPrincipal.startsWith('user:')) {
      const user = simPrincipal.replace('user:', '')
      for (const [group, members] of Object.entries(state.groups)) {
        if (members.includes(user)) {
          for (const policyName of state.attachedGroupPolicies[group] ?? []) {
            const policy = state.policies[policyName]
            if (policy) matchingPolicies.push({ name: policyName, effect: policy.effect })
          }
        }
      }
    } else if (simPrincipal.startsWith('role:')) {
      const role = state.roles[simPrincipal.replace('role:', '')]
      if (role?.policy && state.policies[role.policy]) {
        matchingPolicies.push({ name: role.policy, effect: state.policies[role.policy].effect })
      }
    }

    const matchesActionAndResource = (policyName: string) => {
      const policy = state.policies[policyName]
      if (!policy) return false
      const actionOk = policy.action === '*' || policy.action === simAction || (policy.action.endsWith(':*') && simAction.startsWith(policy.action.slice(0, -1)))
      const resourceOk = policy.resource === '*' || policy.resource === simResource || (policy.resource.endsWith('/*') && simResource.startsWith(policy.resource.slice(0, -1)))
      return actionOk && resourceOk
    }

    const applicable = matchingPolicies.filter((policy) => matchesActionAndResource(policy.name))
    if (applicable.some((policy) => policy.effect === 'Deny')) {
      return { decision: 'DENY', reason: 'An explicit Deny matched this request and wins over every Allow.' }
    }
    if (applicable.some((policy) => policy.effect === 'Allow')) {
      return { decision: 'ALLOW', reason: 'A matching Allow policy was found, with no Deny to block it.' }
    }
    return { decision: 'DENY', reason: 'Implicit default deny: no attached policy allows this action on this resource.' }
  }

  function runTest() {
    resetFlow()
    setFlowPhase('identity')
    const result = evaluateAccess()
    flowTimers.current.push(window.setTimeout(() => setFlowPhase('iam'), 550))
    flowTimers.current.push(window.setTimeout(() => {
      setTested(result)
      setFlowPhase('result')
    }, 1200))
  }

  function startTest() {
    simRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    flowTimers.current.push(window.setTimeout(runTest, 420))
  }

  function resetAll() {
    resetFlow()
    window.clearTimeout(toastTimer.current)
    window.clearTimeout(celebrateTimer.current)
    setState(INITIAL_STATE)
    setNewUser('')
    setSelectedGroup('Developers')
    setSelectedMember('sara.dev')
    setSelectedPolicy('ReadOrdersBucket')
    setSimPrincipal('user:sara.dev')
    setSimAction('s3:GetObject')
    setSimResource('arn:aws:s3:::student-demo-bucket/notes.pdf')
    setShowHint({})
    setToast(null)
    setCelebrate(false)
    previousCompleted.current = []
  }

  function switchMode(next: Mode) {
    resetFlow()
    setSearchParams({ mode: next })
  }

  const doneCount = completedMissions.length
  const simName = simPrincipal.slice(5)
  const simLabel = simName.length > 16 ? `${simName.slice(0, 15)}…` : simName
  const targetIndex = simAction.startsWith('s3:') || simResource.includes('s3')
    ? 0
    : simAction.startsWith('dynamodb:') || simResource.includes('dynamodb')
      ? 1
      : 2
  const packetTransform = flowPhase === 'iam'
    ? 'translate(305px, 120px)'
    : flowPhase === 'result'
      ? `translate(440px, ${RESOURCES[targetIndex].y + 28}px)`
      : 'translate(110px, 120px)'
  const running = flowPhase === 'identity' || flowPhase === 'iam'
  const flowStatus = flowPhase === 'identity'
    ? 'Request received'
    : flowPhase === 'iam'
      ? 'Checking policy'
      : flowPhase === 'result'
        ? tested?.decision === 'ALLOW' ? 'Allowed' : 'Denied'
        : 'Ready'
  const verdict = tested

  return (
    <main className="lab-page" aria-label="IAM Lab simulation">
      <div className="lab-shell">
        <header className="lab-head">
          <div className="lab-brand">
            <span className="lab-logo" aria-hidden="true">&gt;_</span>
            <div>
              <p className="lab-eyebrow">Safe practice account</p>
              <h2 className="lab-title">IAM Lab</h2>
            </div>
          </div>
          <div className="lab-switch" role="group" aria-label="Lab mode">
            <button type="button" className={mode === 'missions' ? 'on' : ''} onClick={() => switchMode('missions')}>
              Guided missions
            </button>
            <button type="button" className={mode === 'sandbox' ? 'on' : ''} onClick={() => switchMode('sandbox')}>
              Free sandbox
            </button>
          </div>
          <div className="lab-actions">
            <button type="button" className="lab-icon-btn" onClick={resetAll} title="Reset simulation" aria-label="Reset simulation">
              <RotateCcw size={15} />
            </button>
            <button type="button" className="lab-icon-btn" onClick={() => navigate('/')} title="Back to site" aria-label="Back to site">
              <ArrowLeft size={17} />
            </button>
          </div>
        </header>

        {mode === 'missions' ? (
          <>
            <div className="lab-progress">
              <div className="lab-progress-text">
                <span>Mission progress</span>
                <b>{doneCount} / {MISSIONS.length}</b>
              </div>
              <div className="lab-progress-track"><i style={{ width: `${(doneCount / MISSIONS.length) * 100}%` }} /></div>
            </div>

            <div className="lab-missions">
              {MISSIONS.map((mission) => {
                const done = completedIds.includes(mission.id)
                const active = activeMission?.id === mission.id
                return (
                  <article key={mission.id} className={`lab-mission${done ? ' done' : ''}${active ? ' active' : ''}`}>
                    <span className="lab-mission-num" aria-hidden="true">
                      {done ? <CheckCircle2 size={17} /> : mission.id}
                    </span>
                    <div className="lab-mission-copy">
                      <div className="lab-mission-head">
                        <strong>{mission.title}</strong>
                        <span className="lab-mission-state">{done ? 'Done' : active ? 'Active' : 'Next'}</span>
                      </div>
                      <p>{mission.goal}</p>
                      {showHint[mission.id] && <p className="lab-hint-text">{mission.hint}</p>}
                    </div>
                    <button
                      type="button"
                      className="lab-hint-btn"
                      onClick={() => setShowHint((current) => ({ ...current, [mission.id]: !current[mission.id] }))}
                    >
                      <Lightbulb size={13} /> Hint
                    </button>
                  </article>
                )
              })}
            </div>

            {allDone && (
              <div className="lab-complete">
                <span className="lab-complete-icon" aria-hidden="true"><Sparkles size={18} /></span>
                <div>
                  <strong>Lab complete!</strong>
                  <p>You built a user, used a group policy, and trusted a role with a policy.</p>
                </div>
                <button type="button" className="btn lab-btn" onClick={startTest}>
                  <Play size={13} aria-hidden="true" /> Test a request
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="lab-sandbox-note">
            <Sparkles size={14} aria-hidden="true" /> Everything is unlocked. Create users, groups and roles, then test any request below.
          </p>
        )}

        <div className="lab-grid">
          <section className="lab-box">
            <div className="lab-box-head">
              <span className="lab-box-num">01</span>
              <div>
                <p className="lab-box-kicker">Identity</p>
                <h3>Users &amp; MFA</h3>
              </div>
            </div>
            <div className="lab-row">
              <input
                type="text"
                value={newUser}
                onChange={(event) => setNewUser(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') createUser() }}
                placeholder="e.g. karim.dev"
                aria-label="New IAM username"
              />
              <button type="button" className="btn lab-btn" onClick={createUser}>Create</button>
            </div>
            <ul className="lab-user-list">
              {state.users.map((user) => {
                const hasMfa = state.mfaUsers.includes(user)
                return (
                  <li key={user} className="lab-user">
                    <span className="lab-user-avatar" aria-hidden="true">{initials(user)}</span>
                    <span className="lab-user-name">
                      <code>{user}</code>
                      <small>{hasMfa ? 'MFA on' : 'MFA off'}</small>
                    </span>
                    <button
                      type="button"
                      className={`lab-mfa${hasMfa ? ' on' : ''}`}
                      onClick={() => toggleMfa(user)}
                      aria-pressed={hasMfa}
                      aria-label={`Turn MFA ${hasMfa ? 'off' : 'on'} for ${user}`}
                    />
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="lab-box">
            <div className="lab-box-head">
              <span className="lab-box-num">02</span>
              <div>
                <p className="lab-box-kicker">Permissions</p>
                <h3>Groups &amp; policies</h3>
              </div>
            </div>
            <div className="lab-row">
              <select value={selectedGroup} onChange={(event) => setSelectedGroup(event.target.value)} aria-label="Group">
                {Object.keys(state.groups).map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
              <select value={selectedMember} onChange={(event) => setSelectedMember(event.target.value)} aria-label="User to add">
                {state.users.map((user) => <option key={user} value={user}>{user}</option>)}
              </select>
              <button type="button" className="btn lab-btn alt" onClick={addUserToGroup}>Add</button>
            </div>
            <div className="lab-row">
              <select value={selectedPolicy} onChange={(event) => setSelectedPolicy(event.target.value)} aria-label="Policy">
                {Object.keys(state.policies).map((policy) => <option key={policy} value={policy}>{policy}</option>)}
              </select>
              <button type="button" className="btn lab-btn" onClick={attachPolicyToGroup}>Attach</button>
            </div>
            <div className="lab-groups">
              {Object.entries(state.groups).map(([group, members]) => (
                <div key={group} className="lab-group">
                  <div className="lab-group-head">
                    <strong>{group}</strong>
                    <span>{members.length} member{members.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="lab-chips">
                    {members.length
                      ? members.map((member) => <span key={member} className="lab-chip">{member}</span>)
                      : <span className="lab-empty">No members yet</span>}
                  </div>
                  <div className="lab-policy-row">
                    {(state.attachedGroupPolicies[group] ?? []).length
                      ? (state.attachedGroupPolicies[group] ?? []).map((policy) => (
                          <span key={policy} className="lab-policy"><ShieldCheck size={11} />{policy}</span>
                        ))
                      : <span className="lab-empty">No policy attached</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="lab-box">
            <div className="lab-box-head">
              <span className="lab-box-num">03</span>
              <div>
                <p className="lab-box-kicker">Temporary access</p>
                <h3>Lambda role</h3>
              </div>
            </div>
            {Object.entries(state.roles).map(([roleName, roleInfo]) => (
              <div key={roleName} className="lab-role">
                <div className="lab-role-head">
                  <span className="lab-role-icon" aria-hidden="true"><ShieldCheck size={15} /></span>
                  <div>
                    <strong>{roleName}</strong>
                    <small>Trusted by {roleInfo.trust}</small>
                  </div>
                </div>
                <div className="lab-role-flow" aria-hidden="true">
                  <span>Lambda</span><i>→</i><span>assumes role</span><i>→</i><span>policy</span>
                </div>
                <select
                  value={roleInfo.policy ?? ''}
                  onChange={(event) => attachPolicyToRole(roleName, event.target.value)}
                  aria-label={`Policy for ${roleName}`}
                >
                  <option value="">No policy</option>
                  {Object.keys(state.policies).map((policy) => <option key={policy} value={policy}>{policy}</option>)}
                </select>
                <div className="lab-policy-row">
                  {roleInfo.policy
                    ? <span className="lab-policy"><ShieldCheck size={11} />{roleInfo.policy}</span>
                    : <span className="lab-empty">No policy attached</span>}
                </div>
              </div>
            ))}
          </section>

          <section ref={simRef} className="lab-box lab-sim-box">
            <div className="lab-box-head">
              <span className="lab-box-num">04</span>
              <div>
                <p className="lab-box-kicker">Animated check</p>
                <h3>Request tester</h3>
              </div>
              <span className="lab-sim-state on">Live</span>
            </div>

            <div className="lab-sim">
                <div className="lab-sim-form">
                  <label>
                    Identity
                    <select
                      value={simPrincipal}
                      onChange={(event) => { setSimPrincipal(event.target.value); resetFlow() }}
                    >
                      {state.users.map((user) => <option key={user} value={`user:${user}`}>IAM user · {user}</option>)}
                      {Object.keys(state.roles).map((role) => <option key={role} value={`role:${role}`}>IAM role · {role}</option>)}
                    </select>
                  </label>
                  <label>
                    Action
                    <input
                      type="text"
                      value={simAction}
                      onChange={(event) => { setSimAction(event.target.value); resetFlow() }}
                    />
                  </label>
                  <label>
                    Resource ARN
                    <input
                      type="text"
                      value={simResource}
                      onChange={(event) => { setSimResource(event.target.value); resetFlow() }}
                    />
                  </label>
                  <button type="button" className="btn lab-btn lab-run" onClick={runTest} disabled={running}>
                    <Play size={13} aria-hidden="true" />
                    {running ? 'Checking…' : 'Run request'}
                  </button>
                </div>

                <div className="lab-flow-panel">
                  <div className="lab-flow-head">
                    <span>Request flow</span>
                    <span className={`lab-flow-status${tested ? tested.decision === 'ALLOW' ? ' ok' : ' no' : ''}`}>{flowStatus}</span>
                  </div>
                  <svg className="lab-flow-svg" viewBox="0 0 620 240" role="img" aria-label={`Request from ${simName} through IAM to the selected resource`}>
                    <g className={`lab-flow-node${flowPhase !== 'idle' ? ' on' : ''}`}>
                      <rect x="8" y="88" width="150" height="64" rx="9" />
                      <text className="lab-node-kicker" x="83" y="110" textAnchor="middle">IDENTITY</text>
                      <text className="lab-node-name" x="83" y="132" textAnchor="middle">{simLabel}</text>
                    </g>
                    <path className="lab-wire" d="M158 120 H240" />
                    <g className={`lab-flow-node${flowPhase === 'iam' || flowPhase === 'result' ? ' on' : ''}`}>
                      <rect x="240" y="78" width="130" height="84" rx="9" />
                      <text className="lab-node-title" x="305" y="112" textAnchor="middle">IAM</text>
                      <text className="lab-node-sub" x="305" y="130" textAnchor="middle">policy check</text>
                    </g>
                    {RESOURCES.map((resource) => (
                      <path key={`wire-${resource.title}`} className="lab-wire" d={`M370 120 L440 ${resource.y + 28}`} />
                    ))}
                    {RESOURCES.map((resource, index) => {
                      const isTarget = tested !== null && targetIndex === index
                      return (
                        <g key={resource.title} className={`lab-flow-node lab-resource${isTarget ? tested?.decision === 'ALLOW' ? ' ok' : ' no' : ''}`}>
                          <rect x="440" y={resource.y} width="170" height="56" rx="9" />
                          <text className="lab-node-res-title" x="525" y={resource.y + 23} textAnchor="middle">{resource.title}</text>
                          <text className="lab-node-res-sub" x="525" y={resource.y + 39} textAnchor="middle">{resource.detail}</text>
                          {isTarget && <text className={`lab-node-badge${tested?.decision === 'DENY' ? ' no' : ''}`} x="525" y={resource.y + 52} textAnchor="middle">{tested?.decision}</text>}
                        </g>
                      )
                    })}
                    <g
                      className={`lab-packet${tested?.decision === 'DENY' ? ' no' : ''}`}
                      style={{ transform: packetTransform, opacity: flowPhase === 'idle' ? 0 : 1 }}
                    >
                      <rect x="-60" y="-12" width="120" height="24" rx="6" />
                      <text y="4" textAnchor="middle">{simAction.slice(0, 18)}</text>
                    </g>
                  </svg>

                  {verdict ? (
                    <div className={`lab-verdict ${verdict.decision === 'ALLOW' ? 'allow' : 'deny'}`} aria-live="polite">
                      <ShieldCheck size={17} />
                      <div>
                        <strong>{verdict.decision}</strong>
                        <p>{verdict.reason}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="lab-verdict idle">
                      <Play size={15} />
                      <div>
                        <strong>Ready</strong>
                        <p>Run the request to watch it travel through IAM.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          </section>
        </div>
      </div>

      {toast && (
        <div className="lab-toast" role="status">
          <CheckCircle2 size={15} /> {toast}
        </div>
      )}

      {celebrate && (
        <div className="lab-confetti" aria-hidden="true">
          {confetti.map((piece, index) => (
            <i
              key={index}
              style={{
                '--x': `${piece.left}%`,
                '--d': `${piece.delay}s`,
                '--dur': `${piece.duration}s`,
                '--c': piece.color,
                '--r': `${piece.rotate}deg`,
              } as CSSProperties}
            />
          ))}
        </div>
      )}
    </main>
  )
}

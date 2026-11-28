import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Box, CheckCircle2, FlaskConical, KeyRound, Minus, Play, RotateCcw, ScrollText, ShieldCheck, Trash2, Users, UserRound, X } from 'lucide-react'
import './lab.css'

type View = 'users' | 'groups' | 'roles' | 'policies' | 'services' | 'test'
type ServiceType = 's3' | 'dynamodb' | 'lambda' | 'ec2'
type Effect = 'Allow' | 'Deny'
type FlowPhase = 'idle' | 'identity' | 'iam' | 'result'

interface User { name: string; mfa: boolean; mustReset: boolean; policies: string[] }
interface Group { name: string; members: string[]; policies: string[] }
interface Role { name: string; trust: string; policies: string[] }
interface Policy { name: string; effect: Effect; actions: string[]; resources: string[]; needsMfa: boolean }
interface Resource { type: ServiceType; name: string }
interface Sim { users: User[]; groups: Group[]; roles: Role[]; policies: Policy[]; resources: Resource[] }
interface TraceRow { policy: string; source: string; effect: Effect; matched: boolean; note: string }
interface StepRun { state: 'pass' | 'stop' | 'skip'; result: string }
interface Verdict { decision: 'ALLOW' | 'DENY'; reason: string; explicit: boolean; trace: TraceRow[]; steps: StepRun[] }

const REGION = 'eu-west-3'
const ACCOUNT = '123456789012'

const SERVICES: Record<ServiceType, { label: string; actions: string[]; arn: (n: string) => string }> = {
  s3: { label: 'S3 bucket', actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'], arn: (n) => `arn:aws:s3:::${n}` },
  dynamodb: { label: 'DynamoDB table', actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:DeleteItem', 'dynamodb:Query'], arn: (n) => `arn:aws:dynamodb:${REGION}:${ACCOUNT}:table/${n}` },
  lambda: { label: 'Lambda function', actions: ['lambda:InvokeFunction', 'lambda:GetFunction', 'lambda:DeleteFunction'], arn: (n) => `arn:aws:lambda:${REGION}:${ACCOUNT}:function:${n}` },
  ec2: { label: 'EC2 instance', actions: ['ec2:DescribeInstances', 'ec2:StartInstances', 'ec2:StopInstances', 'ec2:TerminateInstances'], arn: (n) => `arn:aws:ec2:${REGION}:${ACCOUNT}:instance/${n}` },
}
const TRUST = ['lambda.amazonaws.com', 'ec2.amazonaws.com', 's3.amazonaws.com']
const PASSWORD_RULES = [
  { label: '8 characters or more', test: (p: string) => p.length >= 8 },
  { label: 'Upper and lower case', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'A number', test: (p: string) => /\d/.test(p) },
  { label: 'A symbol', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
]

const WORKFLOW = [
  { title: 'Authenticate', info: 'IAM checks who is calling. A user signs in with a password, and with MFA if it is on. A role is assumed by a service that trusts it.' },
  { title: 'Build the request', info: 'The action and the resource ARN become the request IAM has to judge.' },
  { title: 'Collect the policies', info: 'IAM gathers every policy attached to the user, to its groups, or to the role.' },
  { title: 'Look for an explicit Deny', info: 'A matching Deny ends the check at once. It beats any Allow.' },
  { title: 'Look for an Allow', info: 'With no Deny, IAM needs one matching Allow whose conditions are met.' },
  { title: 'Decide', info: 'Access is allowed only if an Allow matched. Everything else is denied by default.' },
]
const STEP_MS = 520

const INITIAL: Sim = {
  users: [{ name: 'sara.dev', mfa: false, mustReset: false, policies: [] }],
  groups: [{ name: 'Developers', members: ['sara.dev'], policies: [] }, { name: 'Finance', members: [], policies: [] }],
  roles: [{ name: 'OrderFunctionRole', trust: 'lambda.amazonaws.com', policies: [] }],
  policies: [
    { name: 'ReadOrdersBucket', effect: 'Allow', actions: ['s3:GetObject'], resources: ['arn:aws:s3:::student-demo-bucket/*'], needsMfa: false },
    { name: 'DenyS3Delete', effect: 'Deny', actions: ['s3:Delete*'], resources: ['*'], needsMfa: false },
    { name: 'ManageOrdersTable', effect: 'Allow', actions: ['dynamodb:*'], resources: [SERVICES.dynamodb.arn('orders')], needsMfa: true },
  ],
  resources: [{ type: 's3', name: 'student-demo-bucket' }, { type: 'dynamodb', name: 'orders' }, { type: 'lambda', name: 'process-orders' }],
}

const NAV: { id: View; label: string; Icon: typeof Users }[] = [
  { id: 'users', label: 'Users', Icon: UserRound },
  { id: 'groups', label: 'Groups', Icon: Users },
  { id: 'roles', label: 'Roles', Icon: KeyRound },
  { id: 'policies', label: 'Policies', Icon: ScrollText },
  { id: 'services', label: 'Services', Icon: Box },
  { id: 'test', label: 'Request tester', Icon: FlaskConical },
]

const CHALLENGES: { id: number; title: string; view: View; check: (s: Sim, denied: boolean) => boolean }[] = [
  { id: 1, title: 'Create a user and turn on MFA', view: 'users', check: (s) => s.users.length >= 2 && s.users.some((u) => u.mfa) },
  {
    id: 2,
    title: 'Let a group read a bucket',
    view: 'groups',
    check: (s) => s.groups.some((g) => g.members.length > 0 && g.policies.some((n) => s.policies.find((p) => p.name === n)?.effect === 'Allow')),
  },
  { id: 3, title: 'Get blocked by an explicit Deny', view: 'test', check: (_s, denied) => denied },
]

const ROW_H = 64
const ROW_GAP = 14
const SCENARIOS = [
  { title: 'Sara reads orders', who: 'user:sara.dev', res: 's3:student-demo-bucket', action: 's3:GetObject' },
  { title: 'Lambda queries table', who: 'role:OrderFunctionRole', res: 'dynamodb:orders', action: 'dynamodb:Query' },
  { title: 'Sara deletes a file', who: 'user:sara.dev', res: 's3:student-demo-bucket', action: 's3:DeleteObject' },
  { title: 'Sara opens the table', who: 'user:sara.dev', res: 'dynamodb:orders', action: 'dynamodb:GetItem' },
]

const split = (v: string) => v.split(/[\n,]/).map((x) => x.trim()).filter(Boolean)
const initials = (n: string) => (n.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2) || '?').toUpperCase()
const arnOf = (r: Resource) => SERVICES[r.type].arn(r.name)
const keyOf = (r: Resource) => `${r.type}:${r.name}`
const glob = (pattern: string, value: string, ci: boolean) =>
  new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', ci ? 'i' : '').test(value)
const requestArn = (r: Resource, action: string) => (r.type === 's3' && action.endsWith('Object') ? `${arnOf(r)}/example.txt` : arnOf(r))

function evaluate(sim: Sim, principal: string, action: string, arn: string, mfa: boolean): Verdict {
  const sources: { name: string; source: string }[] = []
  const id = principal.slice(5)
  if (principal.startsWith('user:')) {
    sim.users.find((u) => u.name === id)?.policies.forEach((name) => sources.push({ name, source: 'the user' }))
    sim.groups.filter((g) => g.members.includes(id)).forEach((g) => g.policies.forEach((name) => sources.push({ name, source: `group ${g.name}` })))
  } else {
    sim.roles.find((r) => r.name === id)?.policies.forEach((name) => sources.push({ name, source: 'the role' }))
  }
  const trace: TraceRow[] = []
  for (const { name, source } of sources) {
    const p = sim.policies.find((x) => x.name === name)
    if (!p) continue
    const hit = p.actions.some((a) => glob(a, action, true)) && p.resources.some((r) => glob(r, arn, false))
    const noMfa = hit && p.needsMfa && !mfa
    trace.push({
      policy: name,
      source,
      effect: p.effect,
      matched: hit && !noMfa,
      note: !hit ? 'Action or resource does not match' : noMfa ? 'Condition not met: no MFA on this sign-in' : 'Matches',
    })
  }
  const hits = trace.filter((t) => t.matched)
  const deny = hits.find((t) => t.effect === 'Deny')
  const allow = hits.find((t) => t.effect === 'Allow')
  const decision = deny || !allow ? 'DENY' : 'ALLOW'
  const reason = deny
    ? 'An explicit Deny matched, and a Deny always wins over an Allow.'
    : allow
      ? 'An Allow matched and nothing denies it.'
      : trace.some((t) => t.effect === 'Allow' && t.note.startsWith('Condition'))
        ? 'Implicit deny: an Allow exists, but it only applies when the user signed in with MFA.'
        : trace.length
          ? 'Implicit deny: policies are attached, but none allows this action on this resource.'
          : 'Implicit deny: this identity has no policy at all.'
  const role = sim.roles.find((r) => r.name === id)
  const steps: StepRun[] = [
    { state: 'pass', result: principal.startsWith('user:') ? `${id} signed in ${mfa ? 'with' : 'without'} MFA` : `${id} assumed by ${role?.trust ?? 'a trusted service'}` },
    { state: 'pass', result: `${action} on ${arn}` },
    { state: 'pass', result: sources.length ? `${sources.length} attached: ${sources.map((x) => `${x.name} (${x.source})`).join(', ')}` : 'No policy attached' },
    deny ? { state: 'stop', result: `Matched Deny in ${deny.policy}` } : { state: 'pass', result: 'No Deny matched' },
    deny
      ? { state: 'skip', result: 'Skipped, the Deny already decided' }
      : allow
        ? { state: 'pass', result: `Matched Allow in ${allow.policy}` }
        : { state: 'stop', result: trace.some((t) => t.effect === 'Allow' && t.note.startsWith('Condition')) ? 'An Allow exists, but its MFA condition was not met' : 'No Allow matched' },
    { state: decision === 'ALLOW' ? 'pass' : 'stop', result: `${decision}. ${reason}` },
  ]
  return { decision, explicit: !!deny, reason, trace, steps }
}

function Chips({ items, onRemove, empty, kind = 'chip' }: { items: string[]; onRemove: (v: string) => void; empty: string; kind?: 'chip' | 'policy' }) {
  return (
    <div className="lab-chips">
      {items.length ? items.map((i) => (
        <span key={i} className={`lab-${kind}`}>
          {i}
          <button type="button" aria-label={`Remove ${i}`} onClick={() => onRemove(i)}><X size={11} /></button>
        </span>
      )) : <span className="lab-empty">{empty}</span>}
    </div>
  )
}

function AddSelect({ label, options, onPick }: { label: string; options: string[]; onPick: (v: string) => void }) {
  if (!options.length) return null
  return (
    <select className="lab-add" value="" aria-label={label} onChange={(e) => e.target.value && onPick(e.target.value)}>
      <option value="">{label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Attach({ all, value, onChange }: { all: string[]; value: string[]; onChange: (next: string[]) => void }) {
  return (
    <>
      <Chips kind="policy" items={value} empty="No policy attached" onRemove={(p) => onChange(value.filter((x) => x !== p))} />
      <AddSelect label="+ Attach policy" options={all.filter((p) => !value.includes(p))} onPick={(p) => onChange([...value, p])} />
    </>
  )
}

export default function IamLab() {
  const navigate = useNavigate()
  const [sim, setSim] = useState<Sim>(INITIAL)
  const [view, setView] = useState<View>('users')
  const [error, setError] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [uName, setUName] = useState('')
  const [uPass, setUPass] = useState('')
  const [uReset, setUReset] = useState(true)
  const [gName, setGName] = useState('')
  const [rName, setRName] = useState('')
  const [rTrust, setRTrust] = useState(TRUST[0])
  const [pf, setPf] = useState({ name: '', effect: 'Allow' as Effect, actions: '', resources: '', needsMfa: false })
  const [sType, setSType] = useState<ServiceType>('s3')
  const [sName, setSName] = useState('')
  const [principal, setPrincipal] = useState('user:sara.dev')
  const [simRes, setSimRes] = useState('')
  const [simAction, setSimAction] = useState('')
  const [revealed, setRevealed] = useState(0)
  const [run, setRun] = useState<Verdict | null>(null)
  const [denied, setDenied] = useState(false)
  const [autoRun, setAutoRun] = useState(0)
  const timers = useRef<number[]>([])
  const toastTimer = useRef(0)
  const done = useRef<number[]>([])

  const policyNames = sim.policies.map((p) => p.name)
  const completed = CHALLENGES.filter((c) => c.check(sim, denied)).map((c) => c.id)
  const completedKey = completed.join(',')
  const identities = [...sim.users.map((u) => `user:${u.name}`), ...sim.roles.map((r) => `role:${r.name}`)]
  const who = identities.includes(principal) ? principal : identities[0]
  const target = sim.resources.find((r) => keyOf(r) === simRes) ?? sim.resources[0]
  const actions = target ? SERVICES[target.type].actions : []
  const act = actions.includes(simAction) ? simAction : actions[0]
  const phase: FlowPhase = revealed === 0 ? 'idle' : revealed < 3 ? 'identity' : revealed < WORKFLOW.length ? 'iam' : 'result'
  const running = revealed > 0 && revealed < WORKFLOW.length
  const verdict = run && revealed >= WORKFLOW.length ? run : null
  const whoName = who ? who.slice(5) : ''
  const mfaOn = !!who?.startsWith('user:') && !!sim.users.find((u) => u.name === whoName)?.mfa

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !(e.target as HTMLElement).closest('input,select,textarea')) navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  useEffect(() => {
    const ids = completedKey ? completedKey.split(',').map(Number) : []
    const fresh = ids.filter((id) => !done.current.includes(id))
    done.current = ids
    if (fresh.length) notify(`Challenge ${fresh[0]} done`)
  }, [completedKey])

  useEffect(() => {
    if (autoRun > 0) runTest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun])

  useEffect(() => () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    window.clearTimeout(toastTimer.current)
  }, [])

  function notify(message: string) {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }

  function resetFlow() {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    setRevealed(0)
    setRun(null)
  }

  function mutate(fn: (s: Sim) => Sim) {
    setSim(fn)
    setError('')
    resetFlow()
  }

  function go(next: View) {
    setView(next)
    setError('')
  }

  const fail = (message: string) => setError(message)

  function createUser() {
    const name = uName.trim().toLowerCase()
    if (!/^[a-z0-9._-]{2,40}$/.test(name)) return fail('User names use 2 to 40 letters, digits, dots, dashes or underscores.')
    if (sim.users.some((u) => u.name === name)) return fail(`The user ${name} already exists.`)
    if (!PASSWORD_RULES.every((r) => r.test(uPass))) return fail('The password does not meet the policy yet.')
    mutate((s) => ({ ...s, users: [...s.users, { name, mfa: false, mustReset: uReset, policies: [] }] }))
    setUName('')
    setUPass('')
    notify(`User ${name} created. The password was not stored.`)
  }

  const patchUser = (name: string, patch: Partial<User>) =>
    mutate((s) => ({ ...s, users: s.users.map((u) => (u.name === name ? { ...u, ...patch } : u)) }))
  const deleteUser = (name: string) =>
    mutate((s) => ({ ...s, users: s.users.filter((u) => u.name !== name), groups: s.groups.map((g) => ({ ...g, members: g.members.filter((m) => m !== name) })) }))

  function createGroup() {
    const name = gName.trim()
    if (!/^[\w+=,.@-]{1,64}$/.test(name)) return fail('Group names use letters, digits and + = , . @ _ - (max 64).')
    if (sim.groups.some((g) => g.name === name)) return fail(`The group ${name} already exists.`)
    mutate((s) => ({ ...s, groups: [...s.groups, { name, members: [], policies: [] }] }))
    setGName('')
  }
  const patchGroup = (name: string, patch: Partial<Group>) =>
    mutate((s) => ({ ...s, groups: s.groups.map((g) => (g.name === name ? { ...g, ...patch } : g)) }))

  function createRole() {
    const name = rName.trim()
    if (!/^[\w+=,.@-]{1,64}$/.test(name)) return fail('Role names use letters, digits and + = , . @ _ - (max 64).')
    if (sim.roles.some((r) => r.name === name)) return fail(`The role ${name} already exists.`)
    mutate((s) => ({ ...s, roles: [...s.roles, { name, trust: rTrust, policies: [] }] }))
    setRName('')
  }
  const patchRole = (name: string, patch: Partial<Role>) =>
    mutate((s) => ({ ...s, roles: s.roles.map((r) => (r.name === name ? { ...r, ...patch } : r)) }))

  function savePolicy() {
    const name = pf.name.trim()
    const acts = split(pf.actions)
    const res = split(pf.resources)
    if (!/^[\w+=,.@-]{1,64}$/.test(name)) return fail('Policy names use letters, digits and + = , . @ _ - (max 64).')
    if (!acts.length || !acts.every((a) => /^(\*|[a-z0-9-]+:[A-Za-z0-9*?]+)$/.test(a))) return fail('Actions look like s3:GetObject, s3:Delete* or *.')
    if (!res.length || !res.every((r) => r === '*' || r.startsWith('arn:'))) return fail('Resources are * or ARNs that start with arn:.')
    const policy: Policy = { name, effect: pf.effect, actions: acts, resources: res, needsMfa: pf.needsMfa }
    const exists = sim.policies.some((p) => p.name === name)
    mutate((s) => ({ ...s, policies: exists ? s.policies.map((p) => (p.name === name ? policy : p)) : [...s.policies, policy] }))
    setPf({ name: '', effect: 'Allow', actions: '', resources: '', needsMfa: false })
    notify(exists ? `Policy ${name} updated` : `Policy ${name} created`)
  }
  const addTo = (key: 'actions' | 'resources', v: string) =>
    setPf((f) => ({ ...f, [key]: split(f[key]).includes(v) ? f[key] : [...split(f[key]), v].join(', ') }))
  const deletePolicy = (name: string) =>
    mutate((s) => {
      const strip = (list: string[]) => list.filter((p) => p !== name)
      return {
        ...s,
        policies: s.policies.filter((p) => p.name !== name),
        users: s.users.map((u) => ({ ...u, policies: strip(u.policies) })),
        groups: s.groups.map((g) => ({ ...g, policies: strip(g.policies) })),
        roles: s.roles.map((r) => ({ ...r, policies: strip(r.policies) })),
      }
    })

  function createResource() {
    const name = sName.trim().toLowerCase()
    if (!/^[a-z0-9-]{3,40}$/.test(name)) return fail('Service names use 3 to 40 lowercase letters, digits or dashes.')
    if (sim.resources.some((r) => r.type === sType && r.name === name)) return fail('That service already exists.')
    mutate((s) => ({ ...s, resources: [...s.resources, { type: sType, name }] }))
    setSName('')
  }

  function runTest() {
    if (!who || !target || !act) return
    resetFlow()
    const mfa = who.startsWith('user:') && !!sim.users.find((u) => u.name === whoName)?.mfa
    const result = evaluate(sim, who, act, requestArn(target, act), mfa)
    setRun(result)
    setRevealed(1)
    for (let i = 2; i <= WORKFLOW.length; i++) {
      timers.current.push(window.setTimeout(() => {
        setRevealed(i)
        if (i === WORKFLOW.length && result.explicit) setDenied(true)
      }, (i - 1) * STEP_MS))
    }
  }

  function playScenario(sc: (typeof SCENARIOS)[number]) {
    setPrincipal(sc.who)
    setSimRes(sc.res)
    setSimAction(sc.action)
    setAutoRun((n) => n + 1)
  }

  function resetAll() {
    resetFlow()
    setSim(INITIAL)
    setView('users')
    setError('')
    setUName(''); setUPass(''); setGName(''); setRName(''); setSName('')
    setPf({ name: '', effect: 'Allow', actions: '', resources: '', needsMfa: false })
    setPrincipal('user:sara.dev')
    setDenied(false)
    done.current = []
  }

  const counts: Partial<Record<View, number>> = { users: sim.users.length, groups: sim.groups.length, roles: sim.roles.length, policies: sim.policies.length, services: sim.resources.length }
  const verdictClass = verdict ? (verdict.decision === 'ALLOW' ? 'ok' : 'no') : ''
  const rows = sim.resources.length
  const fanH = rows * ROW_H + Math.max(0, rows - 1) * ROW_GAP
  const rowY = (i: number) => i * (ROW_H + ROW_GAP) + ROW_H / 2
  const targetIdx = target ? Math.max(0, sim.resources.indexOf(target)) : 0
  const scenarios = SCENARIOS.filter((sc) => identities.includes(sc.who) && sim.resources.some((r) => keyOf(r) === sc.res))
  const caption = !who
    ? ''
    : phase === 'idle'
      ? 'Pick who asks, the service and the action, or play an example above. Then follow the request through IAM.'
      : phase === 'result' && verdict
        ? `${verdict.decision}. ${verdict.reason}`
        : who.startsWith('user:')
          ? `${whoName} signed in ${mfaOn ? 'with' : 'without'} MFA, so IAM loads the policies attached to the user and to their groups.`
          : `${whoName} has no password. A service that trusts it assumed the role, so IAM loads the policies attached to that role.`
  const groupsOf = (name: string) => sim.groups.filter((g) => g.members.includes(name)).map((g) => g.name)
  const quickResources = sim.resources.flatMap((r) => (r.type === 's3' ? [arnOf(r), `${arnOf(r)}/*`] : [arnOf(r)]))

  return (
    <main className="lab-page" aria-label="IAM Lab simulation">
      <header className="lab-topbar">
        <div className="lab-brand">
          <span className="lab-logo" aria-hidden="true">&gt;_&lt;</span>
          <div>
            <h2 className="lab-title">IAM Lab</h2>
            <p className="lab-eyebrow">Practice account. Everything stays in your browser.</p>
          </div>
        </div>
        <div className="lab-actions">
          <button type="button" className="lab-icon-btn" onClick={resetAll} title="Reset the lab" aria-label="Reset the lab"><RotateCcw size={15} /></button>
          <button type="button" className="lab-icon-btn" onClick={() => navigate('/')} title="Back to site" aria-label="Back to site"><ArrowLeft size={17} /></button>
        </div>
      </header>

      <div className="lab-body">
        <aside className="lab-side">
          <nav className="lab-nav" aria-label="IAM console">
            {NAV.map(({ id, label, Icon }) => (
              <button key={id} type="button" className={view === id ? 'on' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => go(id)}>
                <Icon size={16} aria-hidden="true" /> {label}
                {counts[id] !== undefined && <span className="lab-count">{counts[id]}</span>}
              </button>
            ))}
          </nav>
          <div className="lab-side-missions">
            <div className="lab-progress-text"><span>Challenges</span><b>{completed.length} / {CHALLENGES.length}</b></div>
            <div className="lab-progress-track"><i style={{ width: `${(completed.length / CHALLENGES.length) * 100}%` }} /></div>
            <ul>
              {CHALLENGES.map((c) => {
                const ok = completed.includes(c.id)
                return (
                  <li key={c.id}>
                    <button type="button" className={`lab-mission${ok ? ' done' : ''}`} onClick={() => go(c.view)}>
                      <span className="lab-mission-num" aria-hidden="true">{ok ? <CheckCircle2 size={16} /> : c.id}</span>
                      <span>{c.title}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        <div className="lab-main">
          {error && <p className="lab-error" role="alert">{error}</p>}

          {view === 'users' && (
            <section className="lab-panel">
              <p className="lab-kicker">IAM / users</p>
              <h3>Users</h3>
              <p className="lab-panel-desc">A user is a person or an app with long-term credentials. Create one, then give it permissions through a group or a policy.</p>
              <form className="lab-form" autoComplete="off" onSubmit={(e) => { e.preventDefault(); createUser() }}>
                <label className="lab-field">User name
                  <input value={uName} onChange={(e) => setUName(e.target.value)} placeholder="e.g. karim.dev" />
                </label>
                <label className="lab-field">Console password
                  <input type="password" autoComplete="new-password" value={uPass} onChange={(e) => setUPass(e.target.value)} />
                </label>
                <ul className="lab-checks">
                  {PASSWORD_RULES.map((r) => {
                    const ok = r.test(uPass)
                    return <li key={r.label} className={ok ? 'ok' : ''}>{ok ? <CheckCircle2 size={13} /> : <span className="lab-dot" />}{r.label}</li>
                  })}
                </ul>
                <label className="lab-check"><input type="checkbox" checked={uReset} onChange={(e) => setUReset(e.target.checked)} /> Ask for a new password at first sign-in</label>
                <p className="lab-note">The password is checked here, then thrown away. It is never stored or sent anywhere.</p>
                <button type="submit" className="btn lab-btn">Create user</button>
              </form>
              <ul className="lab-list">
                {sim.users.map((u) => (
                  <li key={u.name} className="lab-item">
                    <div className="lab-item-head">
                      <span className="lab-user-avatar" aria-hidden="true">{initials(u.name)}</span>
                      <div className="lab-item-title">
                        <code>{u.name}</code>
                        <small>{groupsOf(u.name).length ? `In ${groupsOf(u.name).join(', ')}` : 'In no group'}</small>
                      </div>
                      {u.mustReset && <span className="lab-tag warn">Resets password at first sign-in</span>}
                      <span className="lab-switch-row">MFA
                        <button type="button" className={`lab-mfa${u.mfa ? ' on' : ''}`} aria-pressed={u.mfa} aria-label={`MFA for ${u.name}`} onClick={() => patchUser(u.name, { mfa: !u.mfa })} />
                      </span>
                      <button type="button" className="lab-del" aria-label={`Delete ${u.name}`} onClick={() => deleteUser(u.name)}><Trash2 size={15} /></button>
                    </div>
                    <Attach all={policyNames} value={u.policies} onChange={(next) => patchUser(u.name, { policies: next })} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {view === 'groups' && (
            <section className="lab-panel">
              <p className="lab-kicker">IAM / groups</p>
              <h3>Groups</h3>
              <p className="lab-panel-desc">Attach a policy to a group once and every member gets the same permissions.</p>
              <div className="lab-row">
                <input value={gName} onChange={(e) => setGName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createGroup()} placeholder="e.g. Support" aria-label="New group name" />
                <button type="button" className="btn lab-btn" onClick={createGroup}>Create group</button>
              </div>
              <ul className="lab-list">
                {sim.groups.map((g) => (
                  <li key={g.name} className="lab-item">
                    <div className="lab-item-head">
                      <div className="lab-item-title"><strong>{g.name}</strong><small>{g.members.length} member{g.members.length === 1 ? '' : 's'}</small></div>
                      <button type="button" className="lab-del" aria-label={`Delete ${g.name}`} onClick={() => mutate((s) => ({ ...s, groups: s.groups.filter((x) => x.name !== g.name) }))}><Trash2 size={15} /></button>
                    </div>
                    <Chips items={g.members} empty="No members yet" onRemove={(m) => patchGroup(g.name, { members: g.members.filter((x) => x !== m) })} />
                    <AddSelect label="+ Add user" options={sim.users.map((u) => u.name).filter((n) => !g.members.includes(n))} onPick={(n) => patchGroup(g.name, { members: [...g.members, n] })} />
                    <Attach all={policyNames} value={g.policies} onChange={(next) => patchGroup(g.name, { policies: next })} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {view === 'roles' && (
            <section className="lab-panel">
              <p className="lab-kicker">IAM / roles</p>
              <h3>Roles</h3>
              <p className="lab-panel-desc">A role gives temporary access to a service that trusts it, so no password or key sits in your code.</p>
              <div className="lab-row">
                <input value={rName} onChange={(e) => setRName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createRole()} placeholder="e.g. ReportsFunctionRole" aria-label="New role name" />
                <select value={rTrust} onChange={(e) => setRTrust(e.target.value)} aria-label="Trusted service">{TRUST.map((t) => <option key={t}>{t}</option>)}</select>
                <button type="button" className="btn lab-btn" onClick={createRole}>Create role</button>
              </div>
              <ul className="lab-list">
                {sim.roles.map((r) => (
                  <li key={r.name} className="lab-item">
                    <div className="lab-item-head">
                      <span className="lab-role-icon" aria-hidden="true"><ShieldCheck size={15} /></span>
                      <div className="lab-item-title"><code>{r.name}</code><small>Trusted by {r.trust}</small></div>
                      <button type="button" className="lab-del" aria-label={`Delete ${r.name}`} onClick={() => mutate((s) => ({ ...s, roles: s.roles.filter((x) => x.name !== r.name) }))}><Trash2 size={15} /></button>
                    </div>
                    <Attach all={policyNames} value={r.policies} onChange={(next) => patchRole(r.name, { policies: next })} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {view === 'policies' && (
            <section className="lab-panel">
              <p className="lab-kicker">IAM / policies</p>
              <h3>Policies</h3>
              <p className="lab-panel-desc">A policy says who may do what on which resource. Saving a name that already exists updates that policy.</p>
              <form className="lab-form" onSubmit={(e) => { e.preventDefault(); savePolicy() }}>
                <label className="lab-field">Policy name
                  <input value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} placeholder="e.g. ReadReports" />
                </label>
                <label className="lab-field">Effect
                  <select value={pf.effect} onChange={(e) => setPf({ ...pf, effect: e.target.value as Effect })}><option>Allow</option><option>Deny</option></select>
                </label>
                <label className="lab-field">Actions, separated by commas
                  <input value={pf.actions} onChange={(e) => setPf({ ...pf, actions: e.target.value })} placeholder="s3:GetObject, s3:ListBucket" />
                </label>
                <div className="lab-quick-row">{['s3:*', 'dynamodb:*', 'lambda:*', 'ec2:*', '*'].map((a) => <button key={a} type="button" className="lab-quick" onClick={() => addTo('actions', a)}>{a}</button>)}</div>
                <label className="lab-field">Resources, separated by commas
                  <input value={pf.resources} onChange={(e) => setPf({ ...pf, resources: e.target.value })} placeholder="arn:aws:s3:::my-bucket/*" />
                </label>
                <div className="lab-quick-row">
                  {[...quickResources, '*'].map((r) => <button key={r} type="button" className="lab-quick" title={r} onClick={() => addTo('resources', r)}>{r === '*' ? '*' : r.split(':').pop()}</button>)}
                </div>
                <label className="lab-check"><input type="checkbox" checked={pf.needsMfa} onChange={(e) => setPf({ ...pf, needsMfa: e.target.checked })} /> Only applies when the user signed in with MFA</label>
                <button type="submit" className="btn lab-btn">Save policy</button>
              </form>
              <ul className="lab-list">
                {sim.policies.map((p) => (
                  <li key={p.name} className="lab-item">
                    <div className="lab-item-head">
                      <div className="lab-item-title"><code>{p.name}</code></div>
                      <span className={`lab-tag ${p.effect === 'Allow' ? 'ok' : 'no'}`}>{p.effect}</span>
                      <button type="button" className="btn lab-btn alt" onClick={() => setPf({ name: p.name, effect: p.effect, actions: p.actions.join(', '), resources: p.resources.join(', '), needsMfa: p.needsMfa })}>Edit</button>
                      <button type="button" className="lab-del" aria-label={`Delete ${p.name}`} onClick={() => deletePolicy(p.name)}><Trash2 size={15} /></button>
                    </div>
                    <pre className="lab-pre">{JSON.stringify({ Effect: p.effect, Action: p.actions, Resource: p.resources, ...(p.needsMfa ? { Condition: { Bool: { 'aws:MultiFactorAuthPresent': 'true' } } } : {}) }, null, 2)}</pre>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {view === 'services' && (
            <section className="lab-panel">
              <p className="lab-kicker">IAM / services</p>
              <h3>Services</h3>
              <p className="lab-panel-desc">Create the resources your policies protect. Each one gets an ARN, the address policies use to point at it.</p>
              <div className="lab-row">
                <select value={sType} onChange={(e) => setSType(e.target.value as ServiceType)} aria-label="Service type">
                  {(Object.keys(SERVICES) as ServiceType[]).map((t) => <option key={t} value={t}>{SERVICES[t].label}</option>)}
                </select>
                <input value={sName} onChange={(e) => setSName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createResource()} placeholder="e.g. reports-bucket" aria-label="Service name" />
                <button type="button" className="btn lab-btn" onClick={createResource}>Create</button>
              </div>
              <ul className="lab-list">
                {sim.resources.map((r) => (
                  <li key={keyOf(r)} className="lab-item">
                    <div className="lab-item-head">
                      <div className="lab-item-title"><strong>{r.name}</strong><small>{SERVICES[r.type].label}</small></div>
                      <button type="button" className="lab-del" aria-label={`Delete ${r.name}`} onClick={() => mutate((s) => ({ ...s, resources: s.resources.filter((x) => keyOf(x) !== keyOf(r)) }))}><Trash2 size={15} /></button>
                    </div>
                    <code className="lab-arn">{arnOf(r)}</code>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {view === 'test' && (
            <section className="lab-panel">
              <p className="lab-kicker">IAM / access request</p>
              <h3>Request tester</h3>
              <p className="lab-panel-desc">Choose who asks and what they want right inside the flow, then run it. An explicit Deny beats every Allow, and no match means no access.</p>
              {!who || !target ? (
                <p className="lab-empty">Create at least one user or role, and one service, to run a request.</p>
              ) : (
                <div className="lab-flow-panel">
                  <div className="lab-scenarios">
                    <div className="lab-tabs" role="group" aria-label="Example requests">
                      {scenarios.map((sc, i) => (
                        <button
                          key={sc.title}
                          type="button"
                          className={`lab-tab${who === sc.who && keyOf(target) === sc.res && act === sc.action ? ' on' : ''}`}
                          onClick={() => playScenario(sc)}
                        >
                          {i + 1} {sc.title}
                        </button>
                      ))}
                    </div>
                    <button type="button" className="btn lab-btn" onClick={runTest} disabled={running}>
                      <Play size={13} aria-hidden="true" />{running ? 'Playing…' : 'Run request'}
                    </button>
                  </div>

                  <div className="lab-diagram">
                    <div className="lab-group">
                      <strong>Practice account</strong>
                      <small>identities</small>
                      {identities.map((id) => (
                        <button key={id} type="button" className={`lab-pick${id === who ? ' sel' : ''}`} aria-pressed={id === who} title={id.slice(5)} onClick={() => { setPrincipal(id); resetFlow() }}>
                          {id.slice(5)}
                          {id.startsWith('role:') && <small>role</small>}
                        </button>
                      ))}
                      {who.startsWith('user:')
                        ? <button type="button" className={`lab-tag lab-tag-btn ${mfaOn ? 'ok' : 'warn'}`} title="Click to switch MFA" onClick={() => patchUser(whoName, { mfa: !mfaOn })}>MFA {mfaOn ? 'on' : 'off'}</button>
                        : <span className="lab-tag">Role session, no MFA</span>}
                    </div>

                    <div className={`lab-link${phase === 'identity' ? ' go' : phase === 'idle' ? '' : ' done'}`} aria-hidden="true"><i /></div>

                    <div className={`lab-iam-box${phase === 'iam' ? ' busy' : ''}`}>
                      <strong>IAM</strong>
                      <small>policy check</small>
                      <select className="lab-action" aria-label="Action" value={act} onChange={(e) => { setSimAction(e.target.value); resetFlow() }}>
                        {actions.map((a) => <option key={a}>{a}</option>)}
                      </select>
                    </div>

                    <div className="lab-fan" style={{ height: fanH }} aria-hidden="true">
                      <svg viewBox={`0 0 100 ${fanH}`} preserveAspectRatio="none">
                        {sim.resources.map((r, i) => (
                          <path
                            key={keyOf(r)}
                            d={`M0 ${fanH / 2} L100 ${rowY(i)}`}
                            vectorEffect="non-scaling-stroke"
                            className={i === targetIdx ? `sel ${phase === 'result' ? verdictClass : ''}` : ''}
                          />
                        ))}
                      </svg>
                      {phase === 'result' && <i className={verdictClass} style={{ '--y': `${(rowY(targetIdx) / fanH) * 100}%` } as CSSProperties} />}
                    </div>

                    <div className="lab-targets">
                      {sim.resources.map((r) => {
                        const sel = keyOf(r) === keyOf(target)
                        return (
                          <button key={keyOf(r)} type="button" className={`lab-pick lab-target${sel ? ' sel' : ''}${sel && verdict ? ` ${verdictClass}` : ''}`} aria-pressed={sel} onClick={() => { setSimRes(keyOf(r)); resetFlow() }}>
                            {SERVICES[r.type].label}
                            <small>{r.name}</small>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <p className="lab-caption" aria-live="polite">{caption}</p>

                    <ol className="lab-steps" aria-label="IAM decision workflow">
                      {WORKFLOW.map((step, i) => {
                        const st = run && i < revealed ? run.steps[i] : null
                        return (
                          <li key={step.title} className={`lab-step${st ? ` ${st.state}` : ''}${running && i === revealed - 1 ? ' current' : ''}`}>
                            <span className="lab-step-mark" aria-hidden="true">
                              {st ? (st.state === 'pass' ? <CheckCircle2 size={15} /> : st.state === 'stop' ? <X size={15} /> : <Minus size={15} />) : i + 1}
                            </span>
                            <div>
                              <strong>{step.title}</strong>
                              <p>{step.info}</p>
                              {st && <p className="lab-step-result">{st.result}</p>}
                            </div>
                          </li>
                        )
                      })}
                    </ol>

                    <div className={`lab-verdict ${verdict ? (verdict.decision === 'ALLOW' ? 'allow' : 'deny') : 'idle'}`} aria-live="polite">
                      <ShieldCheck size={17} />
                      <div>
                        <strong>{verdict ? verdict.decision : 'Ready'}</strong>
                        <p>{verdict ? verdict.reason : 'Run the request to watch it travel through IAM.'}</p>
                      </div>
                    </div>

                    {verdict && verdict.trace.length > 0 && (
                      <table className="lab-trace">
                        <thead><tr><th>Policy</th><th>From</th><th>Effect</th><th>Result</th></tr></thead>
                        <tbody>
                          {verdict.trace.map((t, i) => (
                            <tr key={i} className={t.matched ? 'hit' : ''}>
                              <td><code>{t.policy}</code></td><td>{t.source}</td><td>{t.effect}</td><td>{t.note}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {toast && <div className="lab-toast" role="status"><CheckCircle2 size={15} /> {toast}</div>}
    </main>
  )
}
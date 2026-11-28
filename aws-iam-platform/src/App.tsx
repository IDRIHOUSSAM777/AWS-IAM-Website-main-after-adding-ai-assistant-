import { useEffect, useRef, useState } from 'react'
import { MonitorPlay } from 'lucide-react'
import { Link } from 'react-router-dom'
import awsLogo from './assets/aws-logo.png'
import './App.css'
import HeroStage from './HeroStage'
import NovaShopDemo from './NovaShopDemo'
import Quiz from './quiz/Quiz'
import Kyubi from './kyubi/Kyubi'

const identities = {
  sara: {
    label: 'Sara, developer',
    note: 'Sara is in the Developers group, so she inherits its policy.',
    resources: [
      ['EC2 servers', 'Allow'],
      ['S3 order files', 'Allow'],
      ['DynamoDB orders', 'Deny'],
      ['Billing reports', 'Deny'],
    ],
  },
  karim: {
    label: 'Karim, finance analyst',
    note: 'Karim is in the Finance group, which only covers billing.',
    resources: [
      ['EC2 servers', 'Deny'],
      ['S3 order files', 'Deny'],
      ['DynamoDB orders', 'Deny'],
      ['Billing reports', 'Allow'],
    ],
  },
  fn: {
    label: 'Order function (Lambda)',
    note: 'The function assumes OrderFunctionRole and gets temporary credentials.',
    resources: [
      ['EC2 servers', 'Deny'],
      ['S3 order files', 'Allow, read only'],
      ['DynamoDB orders', 'Allow'],
      ['Billing reports', 'Deny'],
    ],
  },
}

type IconKind = 'user' | 'group' | 'role' | 'policy' | 'key' | 'code' | 'admin' | 'trail' | 'control' | 'manage' | 'time' | 'free'

function InlineIcon({ kind }: { kind: IconKind }) {
  const paths: Record<IconKind, React.ReactNode> = {
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
    group: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1M16 14h1.5a4.5 4.5 0 0 1 4.5 4.5V20" /></>,
    role: <><rect x="4" y="4" width="16" height="17" /><circle cx="12" cy="11" r="2.5" /><path d="M8 18c.8-2 2.2-3 4-3s3.2 1 4 3M9 4V1M15 4V1" /></>,
    policy: <path d="M9 4c-2 0-3 1-3 3v2c0 1-1 2-2 3 1 1 2 2 2 3v2c0 2 1 3 3 3M15 4c2 0 3 1 3 3v2c0 1 1 2 2 3-1 1-2 2-2 3v2c0 2-1 3-3 3" />,
    key: <><circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v4M21 12v3" /></>,
    code: <path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16" />,
    admin: <path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />,
    trail: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /><path d="M3 3l18 18" /></>,
    control: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
    manage: <><rect x="3" y="4" width="18" height="6" /><rect x="3" y="14" width="18" height="6" /><path d="M7 7h.01M7 17h.01" /></>,
    time: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    free: <><circle cx="12" cy="12" r="9" /><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2" /></>,
  }

  return <span className={`ic ic-${kind}`} aria-hidden="true"><svg viewBox="0 0 24 24">{paths[kind]}</svg></span>
}

function AwsLogo() {
  return (
    <a className="logo" href="#top" aria-label="AWS Student Builder">
      <img src={awsLogo} alt="AWS" />
    </a>
  )
}

function App() {
  const [identity, setIdentity] = useState<keyof typeof identities>('sara')
  const [allow, setAllow] = useState(true)
  const [deny, setDeny] = useState(false)
  const [activeSection, setActiveSection] = useState(0)
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const barRef = useRef<HTMLElement>(null)
  const selected = identities[identity]
  const allowed = allow && !deny
  const evaluatorNote = deny
    ? 'An explicit Deny blocks this request, even though an Allow exists.'
    : allow
      ? 'An applicable policy grants this action. No applicable deny blocks this request.'
      : 'No policy allows this action, so IAM denies it by default.'

  useEffect(() => {
    const sectionIds = ['top', 'what-is-iam', 'why-iam', 'how-it-works', 'lab']
    let frame = 0
    const updateNavigation = () => {
    frame = 0
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    barRef.current?.style.setProperty(
      '--progress',
      String(maxScroll > 0 ? Math.min(1, window.scrollY / maxScroll) : 0),
    )
    let active = 0
    sectionIds.forEach((id, index) => {
      const section = document.getElementById(id)
      if (section && section.getBoundingClientRect().top < window.innerHeight * 0.35) {
        active = index
      }
    })
    setActiveSection((current) => current === active ? current : active)
    }
    const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(updateNavigation)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    updateNavigation()
    return () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
    <div id="top" aria-hidden="true" />
    <a className="skip" href="#what-is-iam">Skip to content</a>
    <header className="bar" ref={barRef}>
      <div className="w nav">
        <AwsLogo />
        <span className="nav-brand-name">Student Builder</span>
        <nav className="pills" aria-label="Sections">
          <a className={activeSection === 0 ? 'on' : ''} aria-current={activeSection === 0 ? 'true' : undefined} href="#top">home</a>
          <a className={activeSection === 1 ? 'on' : ''} aria-current={activeSection === 1 ? 'true' : undefined} href="#what-is-iam">What is IAM</a>
          <a className={activeSection === 2 ? 'on' : ''} aria-current={activeSection === 2 ? 'true' : undefined} href="#why-iam">Why</a>
          <a className={activeSection === 3 ? 'on' : ''} aria-current={activeSection === 3 ? 'true' : undefined} href="#how-it-works">How</a>
          <Link className={`lab-nav-link ${activeSection === 4 ? 'on' : ''}`} to="/lab?mode=missions"><MonitorPlay size={14} aria-hidden="true" />IAM Lab</Link>
        </nav>
        <a className="pill" href="/iam">Read more</a>
      </div>
    </header>

    <section className="w" aria-label="AWS Student Builder">
      <HeroStage />
    </section>

      <section className="w intro" aria-label="Meet AWS IAM">
        <div className="c">
          <p className="t">AWS Identity and Access Management</p>
          <h1>The right access.<br />Nothing extra.</h1>
          <h2>Meet AWS IAM.</h2>
          <p className="mu">Control who can do what in your AWS account. Learn how identities, roles, and policies help protect every project you build.</p>
          <div className="tags"><span>Beginner friendly</span><span>Service explained</span></div>
        </div>
        <div className="c req" aria-live="polite">
          <p className="t">IAM / Access request</p>
          <dl>
            <div><dt>Who</dt><dd>StudentAppRole</dd></div>
            <div><dt>Action</dt><dd>s3:GetObject</dd></div>
            <div><dt>Resource</dt><dd>student-demo-bucket/notes.pdf</dd></div>
          </dl>
          <div className={`res ${allowed ? 'ok' : 'no'}`}>
            <b>{allowed ? 'ALLOW' : 'DENY'}</b>
            <span>{allowed ? 'Read this object' : 'Cannot read this object'}</span>
          </div>
          <p className="note">{evaluatorNote}</p>
        </div>
      </section>

      <div className="gw">
      <section className="w s" id="what-is-iam">
        <div className="sh"><b>01</b><h2>— WHAT IS IAM?</h2></div>
        <p className="lead">AWS Identity and Access Management (IAM) is the service that decides who can sign in to your AWS account and what each of them is allowed to do. Every AWS account has it, and it costs nothing extra.</p>
        <div className="g4">
          <div className="c"><InlineIcon kind="user" /><h3>User</h3><p className="mu">A person or an app with its own name and long-term credentials.</p><p className="eg">Example: <code>sara.dev</code></p></div>
          <div className="c"><InlineIcon kind="group" /><h3>Group</h3><p className="mu">A set of users who share the same permissions. Attach a policy once and everyone gets it.</p><p className="eg">Example: <code>Developers</code></p></div>
          <div className="c"><InlineIcon kind="role" /><h3>Role</h3><p className="mu">An identity with no password. Users, apps, or AWS services assume it and receive temporary credentials.</p><p className="eg">Example: <code>OrderFunctionRole</code></p></div>
          <div className="c"><InlineIcon kind="policy" /><h3>Policy</h3><p className="mu">A JSON document that lists which actions are allowed or denied on which resources.</p><p className="eg">Example: <code>s3:GetObject</code></p></div>
        </div>
        <h4>Company example: NovaShop, an online store</h4>
        <div className="c">
          <p className="mu" style={{ marginBottom: 14 }}>NovaShop has two teammates and one Lambda function that processes orders. Pick an identity to see what IAM lets it reach.</p>
          <div className="who">
            {(Object.keys(identities) as Array<keyof typeof identities>).map((key) => (
              <button key={key} type="button" aria-pressed={identity === key} onClick={() => setIdentity(key)}>
                {identities[key].label}
              </button>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 13 }}>{selected.note}</p>
          <div className="rg">
            {selected.resources.map(([name, result]) => (
              <div key={name} className={result.startsWith('Allow') ? 'allow' : 'deny'}>
                {name}<b>{result}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w s" id="why-iam">
        <div className="sh"><b>02</b><h2>— WHY IAM?</h2></div>
        <p className="lead">Without IAM, an account has one door and one key. These are the problems that follow.</p>
        <div className="g2">
          <div className="pr"><InlineIcon kind="key" /><div><p className="t rk">Risk 01</p><h3>Shared root login</h3><p className="mu">Everyone uses the same email and password. One leak exposes the whole account.</p></div></div>
          <div className="pr"><InlineIcon kind="code" /><div><p className="t rk">Risk 02</p><h3>Keys pasted into code</h3><p className="mu">Access keys end up in source files and get pushed to a public repository.</p></div></div>
          <div className="pr"><InlineIcon kind="admin" /><div><p className="t rk">Risk 03</p><h3>Everyone is admin</h3><p className="mu">It feels simpler, until one wrong click deletes a production database.</p></div></div>
          <div className="pr"><InlineIcon kind="trail" /><div><p className="t rk">Risk 04</p><h3>No trail, no clean exit</h3><p className="mu">Nobody can tell who changed what, and former teammates keep their access.</p></div></div>
        </div>
        <h4>Without IAM and with IAM</h4>
        <div className="sc">
          <table>
            <thead><tr><th /><th>Without IAM</th><th>With IAM</th></tr></thead>
            <tbody>
              <tr><td>Sign-in</td><td>One shared root password</td><td>One identity per person, protected with MFA</td></tr>
              <tr><td>Permissions</td><td>All or nothing</td><td>Only what each task needs</td></tr>
              <tr><td>Credentials</td><td>Long-lived keys inside code</td><td>Temporary credentials from roles</td></tr>
              <tr><td>Tracking</td><td>No record of who acted</td><td>Every API call can be logged in CloudTrail</td></tr>
              <tr><td>Leaving the team</td><td>Change the password for everyone</td><td>Disable one user</td></tr>
            </tbody>
          </table>
        </div>
        <h4>What you gain</h4>
        <div className="g4">
          <div className="gn"><InlineIcon kind="control" /><h3>Fine-grained control</h3><p className="mu">Allow one action on one resource.</p><p className="tg">1 action, 1 resource</p></div>
          <div className="gn"><InlineIcon kind="manage" /><h3>One place to manage</h3><p className="mu">Users, roles, and policies live together.</p><p className="tg">1 console for everyone</p></div>
          <div className="gn"><InlineIcon kind="time" /><h3>Short-lived access</h3><p className="mu">Role credentials expire on their own.</p><p className="tg">Expires on its own</p></div>
          <div className="gn"><InlineIcon kind="free" /><h3>Free to use</h3><p className="mu">You pay only for the resources your identities use.</p><p className="tg">$0 for IAM itself</p></div>
        </div>
        <h4>Least privilege: give only what the task needs</h4>
        <div className="g2">
          <div><p className="cap wn">Too broad. If this key leaks, the whole account is open.</p><pre>{'{'}<br />  <span className="ky">"Effect"</span>: <span className="st">"Allow"</span>,<br />  <span className="ky">"Action"</span>: <span className="wn">"*"</span>,<br />  <span className="ky">"Resource"</span>: <span className="wn">"*"</span><br />{'}'}</pre></div>
          <div><p className="cap" style={{ color: 'var(--mi)' }}>Least privilege. If this key leaks, one file can be read.</p><pre>{'{'}<br />  <span className="ky">"Effect"</span>: <span className="st">"Allow"</span>,<br />  <span className="ky">"Action"</span>: <span className="st">"s3:GetObject"</span>,<br />  <span className="ky">"Resource"</span>: <span className="st">"arn:aws:s3:::student-demo-bucket/notes.pdf"</span><br />{'}'}</pre></div>
        </div>
        <p className="mu" style={{ marginTop: 14, maxWidth: '68ch' }}>Start with no access and add permissions as a real need appears. When you see <span className="code">*</span> in a policy, ask what it is really for.</p>
      </section>

      <section className="w s" id="how-it-works">
        <div className="sh"><b>03</b><h2>— HOW DOES IAM WORK?</h2></div>
        <p className="lead">Every request goes through two checks before it touches a resource.</p>
        <div className="flow">
          <div className="c"><p className="t">Authentication</p><h3>Who are you?</h3><p className="mu">You prove your identity with a password and MFA, an access key, or a role session.</p></div>
          <span aria-hidden="true">→</span>
          <div className="c"><p className="t">Authorization</p><h3>What can you do?</h3><p className="mu">IAM reads the policies attached to that identity and matches the action and the resource.</p></div>
          <span aria-hidden="true">→</span>
          <div className="c"><p className="t">Resource</p><h3>Request goes through</h3><p className="mu">The bucket, server, or table answers only if both checks pass.</p></div>
        </div>
        <h4>Anatomy of a policy</h4>
        <div className="g2">
          <pre>{'{'}<br />  <span className="ky">"Effect"</span>: <span className="st">"Allow"</span>,<br />  <span className="ky">"Action"</span>: <span className="st">"s3:GetObject"</span>,<br />  <span className="ky">"Resource"</span>: <span className="st">"arn:aws:s3:::student-demo-bucket/*"</span>,<br />  <span className="ky">"Condition"</span>: {'{'}<br />    <span className="ky">"Bool"</span>: {'{'} <span className="st">"aws:MultiFactorAuthPresent"</span>: <span className="st">"true"</span> {'}'}<br />  {'}'}<br />{'}'}</pre>
          <dl className="c ann">
            <dt>Effect</dt><dd>Allow or Deny.</dd>
            <dt>Action</dt><dd>The API call, such as reading an object.</dd>
            <dt>Resource</dt><dd>The thing the action applies to.</dd>
            <dt>Condition</dt><dd>Optional extra rule, here: MFA must be on.</dd>
          </dl>
        </div>

        <h4>Watch a group use resources</h4>
        <p className="mu demo-intro">Back to NovaShop. Sara, Karim and the order Lambda each have their own policy, and IAM judges every request against that policy only.</p>
        <NovaShopDemo reducedMotion={reducedMotion} />
        <p className="mu demo-footnote">The scan is shown one statement at a time so it is easy to follow. IAM actually weighs all statements together, and their order does not matter.</p>

        <h4>Allow or Deny: try it</h4>
        <div className="ev">
          <div className="c">
            <p className="mu" style={{ marginBottom: 4 }}>Attach policies to StudentAppRole and watch the decision change.</p>
            <label><input type="checkbox" checked={allow} onChange={(event) => setAllow(event.target.checked)} /><span>A policy <b>allows</b> <code className="code">s3:GetObject</code> on the bucket</span></label>
            <label><input type="checkbox" checked={deny} onChange={(event) => setDeny(event.target.checked)} /><span>A policy <b>denies</b> <code className="code">s3:GetObject</code> on the bucket</span></label>
            <ol className="rules"><li>Everything is denied by default.</li><li>An explicit Allow opens access.</li><li>An explicit Deny always wins.</li></ol>
          </div>
          <div className="c req" aria-live="polite">
            <p className="t">IAM / Access request</p>
            <dl>
              <div><dt>Who</dt><dd>StudentAppRole</dd></div>
              <div><dt>Action</dt><dd>s3:GetObject</dd></div>
              <div><dt>Resource</dt><dd>student-demo-bucket/notes.pdf</dd></div>
            </dl>
            <div className={`res ${allowed ? 'ok' : 'no'}`}><b>{allowed ? 'ALLOW' : 'DENY'}</b><span>{allowed ? 'Read this object' : 'Cannot read this object'}</span></div>
            <p className="note">{evaluatorNote}</p>
          </div>
        </div>
        <p className="mu" style={{ marginTop: 14, fontSize: 12, maxWidth: '72ch' }}>Other layers, such as service control policies and permission boundaries, can also limit what an identity may do. A request needs an Allow and no Deny anywhere in the chain.</p>
        <Quiz />
      </section>

      <section className="w s lab" id="lab">
        <div className="sh"><b className="lab-mark" aria-hidden="true">&gt;_&lt;</b><h2 className="lab-heading"><MonitorPlay size={20} aria-hidden="true" />ENTER IAM LAB</h2></div>
        <h2 className="lab-title">Time to build.</h2>
        <p className="lead">Put the three ideas into practice in a safe practice account. Nothing you do here touches a real AWS bill.</p>
        <div className="g2">
          <div className="c">
            <p className="t">Guided missions</p><h3>Follow the steps</h3>
            <p className="mu">Short tasks with hints and a check at the end of each one.</p>
            <ol><li><span>Mission 1</span>Create a user and turn on MFA</li><li><span>Mission 2</span>Add users to a group and attach a policy</li><li><span>Mission 3</span>Let a Lambda function use a role</li></ol>
            <Link className="btn" to="/lab?mode=missions">Start missions</Link>
          </div>
          <div className="c">
            <p className="t">Free sandbox</p><h3>Build your own</h3>
            <p className="mu">Create users, groups, roles, and policies in any order. Send access requests and see if IAM allows or denies them.</p>
            <ol><li><span>Try</span>Break a policy on purpose</li><li><span>Try</span>Add an explicit Deny and see it win</li><li><span>Try</span>Shrink a broad policy to least privilege</li></ol>
            <Link className="btn alt" to="/lab?mode=sandbox">Open sandbox</Link>
          </div>
        </div>
      </section>
      <footer className="w">AWS Student Builder. Learn, build, growth.</footer>
      </div>
      <Kyubi />
    </>
  )
}

export default App

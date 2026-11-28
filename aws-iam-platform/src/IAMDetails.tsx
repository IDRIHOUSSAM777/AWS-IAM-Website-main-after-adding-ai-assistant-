import { useRef, useState, type CSSProperties } from 'react'
import { ArrowRight, BookOpen, Download, PanelLeftClose, PanelLeftOpen, ShieldCheck, X } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { Link, Navigate, useParams } from 'react-router-dom'
import awsLogo from './assets/aws-logo.png'
import { iamQuestionSections } from './iamQuestionBank'
import './App.css'
import './IAMDetails.css'
import Kyubi from './kyubi/Kyubi'

function IAMDetails() {
  const { topicId } = useParams<{ topicId: string }>()
  const [focusMode, setFocusMode] = useState(false)
  const [questionNavOpen, setQuestionNavOpen] = useState(true)
  const [fontSize, setFontSize] = useState(16)
  const [pdfError, setPdfError] = useState('')
  const articleRef = useRef<HTMLElement>(null)
  const questionSection = iamQuestionSections.find((section) => section.topics.some((topic) => topic.id === topicId))
  const questionTopic = questionSection?.topics.find((topic) => topic.id === topicId)

  function downloadArticle() {
    const article = articleRef.current
    if (!article) {
      setPdfError('The article is not ready yet. Please try again.')
      return
    }

    setPdfError('')
    const pdf = new jsPDF({ format: 'a4', unit: 'mm' })
    const margin = 18
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const contentWidth = pageWidth - margin * 2
    const pageBottom = pageHeight - margin - 10
    let y = margin

    article.querySelectorAll<HTMLElement>('h1, h2, h3, p, pre, li').forEach((block) => {
      const text = block.innerText.trim()
      if (!text) return

      const tag = block.tagName
      const heading = tag === 'H1' || tag === 'H2' || tag === 'H3'
      const fontSize = tag === 'H1' ? 22 : tag === 'H2' ? 16 : tag === 'H3' ? 13 : tag === 'PRE' ? 9 : 10
      const lineHeight = fontSize * 0.48
      const indent = tag === 'LI' ? 4 : 0
      pdf.setFont(tag === 'PRE' ? 'courier' : 'helvetica', heading ? 'bold' : 'normal')
      pdf.setFontSize(fontSize)
      pdf.setTextColor(heading ? 190 : 35, heading ? 105 : 35, heading ? 0 : 35)
      const lines = pdf.splitTextToSize(text, contentWidth - indent)
      const blockHeight = lines.length * lineHeight

      if (y + blockHeight > pageBottom) {
        pdf.addPage()
        y = margin
      }

      pdf.text(lines, margin + indent, y)
      y += blockHeight + (heading ? 4 : 3)
    })

    const pageCount = pdf.getNumberOfPages()
    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      pdf.setTextColor(100)
      pdf.text(`AWS Student Builder - Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
    }

    pdf.save('aws-iam-guide.pdf')
  }

  if (topicId && !questionTopic) {
    return <Navigate to="/iam" replace />
  }

  return (
    <>
      <header className="bar">
        <div className="w nav iam-nav">
          <a className="logo" href="/" aria-label="AWS Student Builder, home">
            <img src={awsLogo} alt="AWS" />
          </a>
          <span className="nav-brand-name">Student Builder</span>
          <a className="pill" href="/">Home</a>
        </div>
      </header>

      <div className={`iam-layout w${focusMode ? ' is-focus' : ''}`}>
        <div className="iam-heading-row">
          <div className="iam-toolbar">
            {!focusMode && (
              <button
                className="iam-pdf iam-question-nav-toggle"
                type="button"
                aria-expanded={questionNavOpen}
                aria-label={questionNavOpen ? 'Hide question bank sidebar' : 'Show question bank sidebar'}
                title={questionNavOpen ? 'Hide question bank sidebar' : 'Show question bank sidebar'}
                onClick={() => setQuestionNavOpen((open) => !open)}
              >
                {questionNavOpen
                  ? <PanelLeftClose size={16} aria-hidden="true" />
                  : <PanelLeftOpen size={16} aria-hidden="true" />}
              </button>
            )}
            <button className="iam-pdf" type="button" onClick={downloadArticle} title="Download the article as a PDF">
              <Download size={15} aria-hidden="true" /> PDF
            </button>
            <button
              className={`iam-focus-toggle${focusMode ? ' is-on' : ''}`}
              type="button"
              role="switch"
              aria-checked={focusMode}
              onClick={() => setFocusMode((active) => !active)}
            >
              <span className="iam-switch" aria-hidden="true"><i /></span>
              Mode concentration
            </button>
          </div>
        </div>
        {pdfError && <p className="iam-pdf-error" role="alert">{pdfError}</p>}

        <div className={`iam-reading-layout${questionNavOpen && !focusMode ? '' : ' is-sidebar-closed'}`}>
          <aside className="iam-question-nav" id="iam-question-nav" aria-label="Sommaire de la banque de questions" hidden={!questionNavOpen || focusMode}>
            
            <nav aria-label="Sections et sujets">
              {iamQuestionSections.map((section) => (
                <section key={section.id}>
                  <h3>{section.title}</h3>
                  <ul>
                    {section.topics.map((topic) => (
                      <li key={topic.id}>
                        <Link to={`/iam/questions/${topic.id}`} aria-current={topic.id === topicId ? 'page' : undefined}>
                          {topic.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </nav>
          </aside>
          <div className={`iam-reading-content${focusMode ? ' is-focus' : ''}`}>
            {focusMode && (
              <aside className="iam-focus-panel" aria-label="Reading settings">
                <button className="iam-focus-close" type="button" onClick={() => setFocusMode(false)} aria-label="Close focus mode">
                  <X size={18} aria-hidden="true" />
                </button>
                <input
                  id="iam-font-size"
                  type="range"
                  min="14"
                  max="20"
                  step="1"
                  value={fontSize}
                  aria-label="Text size"
                  onChange={(event) => setFontSize(Number(event.target.value))}
                />
                <div className="iam-range-values"><span>14</span><output htmlFor="iam-font-size">{fontSize}</output><span>20</span></div>
              </aside>
            )}
            <main className="iam-guide" ref={articleRef} style={{ '--iam-text-size': `${fontSize + (focusMode ? 2 : 0)}px` } as CSSProperties}>
        <section className="w iam-hero" id="overview">
          <p className="t">AWS Identity and Access Management</p>
          <h2>{questionTopic?.title ?? 'A closer look at IAM'}</h2>
          <p className="lead">
            {questionTopic && questionSection
              ? `${questionSection.title} — questions and answers`
              : 'IAM helps you securely control access to your AWS account. It answers two questions for every request: who is making it, and what are they allowed to do?'}
          </p>
          {questionTopic && <Link className="iam-back-link" to="/iam#question-bank">← Back</Link>}
          {!questionTopic && (
            <div className="iam-summary">
              <ShieldCheck size={22} aria-hidden="true" />
              <p><b>In short:</b> give each person or workload only the permissions it needs, and use temporary credentials whenever possible.</p>
            </div>
          )}
        </section>

        {!questionTopic && (
          <>
        <section className="w s iam-section" id="identities">
          <div className="sh"><b>01</b><h2>— IAM identities</h2></div>
          <p className="lead">An identity represents a person or workload that needs to make requests in AWS. Choose the identity type that fits how it will access your account.</p>
          <div className="g2 iam-cards">
            <article className="c">
              <p className="t">Human access</p>
              <h3>IAM users and groups</h3>
              <p className="mu">An IAM user is an identity in one AWS account. A group is a convenient way to assign the same permissions to several IAM users. Groups contain users, not other groups.</p>
              <p className="eg">Use case: a legacy application or a narrowly scoped learning exercise.</p>
            </article>
            <article className="c">
              <p className="t">Recommended for people</p>
              <h3>Federated access</h3>
              <p className="mu">People can sign in through an identity provider, such as AWS IAM Identity Center, and receive role-based access without creating a separate long-term IAM user for each person.</p>
              <p className="eg">Use case: employees or students who need console access.</p>
            </article>
            <article className="c">
              <p className="t">Temporary access</p>
              <h3>IAM roles</h3>
              <p className="mu">A role has permissions but no permanent password or access keys. A trusted user, application, or AWS service assumes the role and receives temporary credentials.</p>
              <p className="eg">Use case: an EC2 instance reading from an S3 bucket.</p>
            </article>
            <article className="c">
              <p className="t">Permissions</p>
              <h3>Policies</h3>
              <p className="mu">A policy is a JSON document that describes permissions. Attach identity-based policies to users, groups, or roles; resource-based policies can be attached directly to supported resources.</p>
              <p className="eg">Example: allow <code>s3:GetObject</code> on one specific bucket.</p>
            </article>
          </div>
        </section>

        <section className="w s iam-section" id="policies">
          <div className="sh"><b>02</b><h2>— How a policy works</h2></div>
          <p className="lead">A policy statement describes the effect, the actions, and the resources involved. Optional conditions add context, such as requiring a particular network or MFA.</p>
          <div className="g2 iam-policy-layout">
            <pre aria-label="Example IAM policy">{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::student-demo-bucket/notes.pdf"
    }
  ]
}`}</pre>
            <dl className="c ann iam-definitions">
              <dt>Effect</dt><dd><code>Allow</code> or <code>Deny</code>.</dd>
              <dt>Action</dt><dd>The AWS operation, such as reading an S3 object.</dd>
              <dt>Resource</dt><dd>The AWS resource the operation applies to.</dd>
              <dt>Condition</dt><dd>An optional rule that must be met for the statement to apply.</dd>
              <dt>Version</dt><dd>The policy language version; use <code>2012-10-17</code> for current policies.</dd>
            </dl>
          </div>

          <h3 className="iam-subtitle">How AWS decides</h3>
          <ol className="iam-steps">
            <li><b>Start with implicit deny.</b> A request is denied unless an applicable policy allows it.</li>
            <li><b>Look for an applicable Allow.</b> The action and resource must match, and any conditions must be true.</li>
            <li><b>Check for explicit Deny.</b> An applicable explicit Deny overrides an Allow.</li>
            <li><b>Apply other limits.</b> Organization policies, permissions boundaries, and session policies can further restrict permissions.</li>
          </ol>
          <p className="mu iam-note">The complete evaluation can also depend on the resource policy, the type of principal, and the AWS service involved. When access is denied, check each policy layer and the request context.</p>
        </section>

        <section className="w s iam-section" id="security">
          <div className="sh"><b>03</b><h2>— Secure IAM habits</h2></div>
          <div className="g2 iam-practices">
            <article className="c"><h3>Protect the root user</h3><p className="mu">Enable MFA, do not use root for everyday tasks, and do not create root access keys.</p></article>
            <article className="c"><h3>Prefer temporary credentials</h3><p className="mu">Use roles and federation instead of sharing long-lived access keys. Never put credentials in source code.</p></article>
            <article className="c"><h3>Apply least privilege</h3><p className="mu">Grant only the actions and resources needed for a task. Review and remove permissions that are no longer required.</p></article>
            <article className="c"><h3>Use MFA and review activity</h3><p className="mu">Require MFA where appropriate, remove unused credentials, and use AWS CloudTrail to review account activity.</p></article>
          </div>
          <div className="iam-next">
            <BookOpen size={20} aria-hidden="true" />
            <p><b>Ready to practice?</b><br />Jump straight into the guided IAM missions.</p>
            <a className="btn" href="/#start-mission">Explore more IAM <ArrowRight size={15} aria-hidden="true" /></a>
          </div>
        </section>
          </>
        )}
        {questionTopic && (
          <section className="w s iam-section iam-question-bank iam-topic-page">
            <div className="sh"><b>Q&amp;A</b><h2>— {questionSection?.title}</h2></div>
            <div className="iam-question-topic">
              {questionTopic.questions.map((question) => (
                <article className="iam-question-answer" id={question.id} key={question.id}>
                  <h3>{question.question}</h3>
                  <p><b>Réponse :</b> {question.answer}</p>
                </article>
              ))}
            </div>
            <Link className="iam-topic-next" to="/iam">Retour à la page principale Read More</Link>
          </section>
        )}
            </main>
          </div>
        </div>
      </div>

      <footer className="w iam-footer">AWS Student Builder. Learn, build, grow.</footer>
      <Kyubi />
    </>
  )
}

export default IAMDetails

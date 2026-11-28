import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchQuiz, QuizApiError, submitAnswer, type QuizQuestion, type QuizState } from './quizApi'
import './quiz.css'

const PER_PAGE = 3

export default function Quiz() {
  const [state, setState] = useState<QuizState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [picked, setPicked] = useState<Record<number, number>>({})
  const [sending, setSending] = useState<number | null>(null)
  const [notice, setNotice] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchQuiz()
      setState(data)
      const firstOpen = data.questions.findIndex((q) => !q.answered)
      setPage(firstOpen === -1 ? 0 : Math.floor(firstOpen / PER_PAGE))
    } catch (caught) {
      setState(null)
      setError(caught instanceof QuizApiError ? caught.message : 'Something went wrong on our side. Please try again in a moment.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchQuiz().then(
      (data) => {
        if (!active) return
        setState(data)
        setError(null)
        const firstOpen = data.questions.findIndex((q) => !q.answered)
        setPage(firstOpen === -1 ? 0 : Math.floor(firstOpen / PER_PAGE))
        setLoading(false)
      },
      (caught) => {
        if (!active) return
        setState(null)
        setError(caught instanceof QuizApiError ? caught.message : 'Something went wrong on our side. Please try again in a moment.')
        setLoading(false)
      },
    )
    return () => {
      active = false
    }
  }, [])

  async function handleSubmit(question: QuizQuestion) {
    const choice = picked[question.slot]
    if (choice === undefined || sending !== null) return
    setSending(question.slot)
    setNotice((current) => ({ ...current, [question.slot]: '' }))
    try {
      const result = await submitAnswer(question.slot, choice)
      setState((current) =>
        current
          ? {
              ...current,
              score: result.score,
              answered: result.answered,
              questions: current.questions.map((q) => (q.slot === result.question.slot ? result.question : q)),
            }
          : current,
      )
    } catch (caught) {
      setNotice((current) => ({
        ...current,
        [question.slot]: caught instanceof QuizApiError ? caught.message : 'Your answer could not be saved. Please try again.',
      }))
    } finally {
      setSending(null)
    }
  }

  if (loading) {
    return (
      <div className="qz" id="check-yourself">
        <h4>Check yourself</h4>
        <div className="qz-panel qz-center"><p className="mu" role="status">Preparing your questions…</p></div>
      </div>
    )
  }

  if (error || !state) {
    return (
      <div className="qz" id="check-yourself">
        <h4>Check yourself</h4>
        <div className="qz-panel qz-center">
          <p className="qz-big">{error ?? 'The quiz is not available at the moment.'}</p>
          <button className="btn" type="button" onClick={() => void load()}>Try again</button>
        </div>
      </div>
    )
  }

  const pages = Math.max(1, Math.ceil(state.questions.length / PER_PAGE))
  const visible = state.questions.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
  const finished = state.answered === state.total && state.total > 0

  return (
    <div className="qz" id="check-yourself">
      <h4>Check yourself</h4>
      <div className="qz-panel">
        <div className="qz-top">
          <span>Page {page + 1} of {pages}</span>
          <span>Answered {state.answered} of {state.total}</span>
        </div>

        {visible.map((question) => {
          const chosen = question.answered ? question.chosen : picked[question.slot]
          return (
            <fieldset className="qz-q" key={question.slot} disabled={question.answered}>
              <legend>{question.slot}. {question.text}</legend>
              <div className="qz-opts">
                {question.options.map((option, index) => {
                  const isChosen = chosen === index
                  const look = question.answered
                    ? index === question.correct ? 'right' : isChosen ? 'wrong' : ''
                    : isChosen ? 'on' : ''
                  return (
                    <label className={`qz-opt ${look}`} key={index}>
                      <input
                        type="radio"
                        name={`q-${question.slot}`}
                        checked={isChosen}
                        onChange={() => setPicked((current) => ({ ...current, [question.slot]: index }))}
                      />
                      <span className="qz-radio" aria-hidden="true" />
                      <span className="qz-text">{option}</span>
                      {question.answered && index === question.correct ? <span className="qz-flag">Right answer</span> : null}
                      {question.answered && isChosen && index !== question.correct ? <span className="qz-flag">Your answer</span> : null}
                    </label>
                  )
                })}
              </div>

              {question.answered ? (
                <div className={`qz-fb ${question.isCorrect ? 'ok' : 'no'}`} role="status">
                  <b>{question.isCorrect ? 'Well done! You earned 1 point.' : 'Not this time, but now you know.'}</b>
                  <span>{question.explanation}</span>
                </div>
              ) : (
                <div className="qz-act">
                  <button className="btn" type="button" disabled={chosen === undefined || sending !== null} onClick={() => void handleSubmit(question)}>
                    {sending === question.slot ? 'One moment…' : 'Submit answer'}
                  </button>
                  {notice[question.slot] ? <span className="qz-err" role="alert">{notice[question.slot]}</span> : null}
                </div>
              )}
            </fieldset>
          )
        })}

        <div className="qz-foot">
          <p className="qz-count">{state.score} of {state.total} correct</p>
          <div className="qz-pager" role="group" aria-label="Quiz pages">
            <button type="button" className="qz-arrow" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <span className="qz-dots">
              {Array.from({ length: pages }, (_, index) => (
                <button key={index} type="button" className={index === page ? 'on' : ''} aria-label={`Page ${index + 1}`} aria-current={index === page ? 'true' : undefined} onClick={() => setPage(index)} />
              ))}
            </span>
            <button type="button" className="qz-arrow" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <span className="qz-spacer" />
        </div>

        {finished ? (
          <p className="qz-done">
            You finished all {state.total} questions with {state.score} correct.
          </p>
        ) : null}
      </div>
    </div>
  )
}

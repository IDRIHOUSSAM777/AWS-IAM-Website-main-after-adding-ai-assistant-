export type QuizQuestion = {
  slot: number
  text: string
  options: string[]
  answered: boolean
  chosen: number | null
  correct: number | null
  isCorrect: boolean | null
  explanation: string | null
}

export type QuizState = {
  questions: QuizQuestion[]
  answered: number
  score: number
  total: number
}

type AnswerResult = {
  question: QuizQuestion
  alreadyAnswered: boolean
  score: number
  answered: number
  total: number
}

export class QuizApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, { credentials: 'same-origin', ...init })
  } catch {
    throw new QuizApiError('We could not reach the site just now. Please check your connection and try again.', 0)
  }
  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    // an empty or unreadable answer is handled below
  }
  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : 'Something went wrong on our side. Please try again in a moment.'
    throw new QuizApiError(message, response.status)
  }
  return data as T
}

let quizRequest: Promise<QuizState> | null = null
export function fetchQuiz() {
  if (!quizRequest) {
    quizRequest = request<QuizState>('/api/quiz').finally(() => {
      quizRequest = null
    })
  }
  return quizRequest
}

export const submitAnswer = (slot: number, choice: number) =>
  request<AnswerResult>('/api/quiz/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot, choice }),
  })

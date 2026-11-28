import questionBankMarkdown from './content/banque_de_questions_aws_iam.md?raw'

export interface IAMQuestion {
  id: string
  question: string
  answer: string
}

export interface IAMQuestionTopic {
  id: string
  title: string
  questions: IAMQuestion[]
}

export interface IAMQuestionSection {
  id: string
  title: string
  topics: IAMQuestionTopic[]
}

function cleanText(text: string) {
  return text.replace(/`([^`]+)`/g, '$1').replace(/\\\*/g, '*').trim()
}

function parseQuestionBank(markdown: string): IAMQuestionSection[] {
  const sections: IAMQuestionSection[] = []
  let section: IAMQuestionSection | undefined
  let topic: IAMQuestionTopic | undefined
  let currentQuestion: IAMQuestion | undefined

  for (const line of markdown.split(/\r?\n/)) {
    const sectionHeading = line.match(/^## (.+)$/)
    if (sectionHeading) {
      section = {
        id: `question-section-${sections.length + 1}`,
        title: cleanText(sectionHeading[1]),
        topics: [],
      }
      sections.push(section)
      topic = undefined
      currentQuestion = undefined
      continue
    }

    const topicHeading = line.match(/^### (.+)$/)
    if (topicHeading && section) {
      topic = {
        id: `question-topic-${section.topics.length + 1}-${section.id}`,
        title: cleanText(topicHeading[1]).replace(/^[A-Z]\.\d+\.\s*/, ''),
        questions: [],
      }
      section.topics.push(topic)
      currentQuestion = undefined
      continue
    }

    const questionMatch = line.match(/^\s*\* \*\*Q(\d+)\.\*\*\s*(.+)$/)
    if (questionMatch && topic) {
      currentQuestion = {
        id: `question-${questionMatch[1]}`,
        question: cleanText(questionMatch[2]),
        answer: '',
      }
      topic.questions.push(currentQuestion)
      continue
    }

    const answerMatch = line.match(/^\s*\*\*R\d+\.\*\*\s*(.*)$/)
    if (answerMatch && currentQuestion) {
      currentQuestion.answer = cleanText(answerMatch[1])
      continue
    }

    if (currentQuestion?.answer && line.trim() && !/^\s*\*\*N\d+:\*\*/.test(line)) {
      currentQuestion.answer = `${currentQuestion.answer} ${cleanText(line)}`
    }
  }

  return sections
}

export const iamQuestionSections = parseQuestionBank(questionBankMarkdown)

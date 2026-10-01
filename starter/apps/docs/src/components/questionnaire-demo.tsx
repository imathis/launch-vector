import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@workspace/ui/components/questionnaire"
import { type FormEvent, useState } from "react"

const items = [
  {
    name: "completed",
    required: true,
    choices: [{ value: "yes" }, { value: "no" }],
  },
  {
    name: "practice",
    required: true,
    choices: [{ value: "one" }, { value: "three" }, { value: "five" }],
  },
] as const

export function QuestionnaireDemo() {
  const [notice, setNotice] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const answers = new FormData(event.currentTarget)
    setNotice(
      `Saved: ${answers.get("completed")}, ${answers.get("practice")} practice sessions.`
    )
  }

  return (
    <Questionnaire
      className="max-w-lg"
      items={items}
      shortcuts="letters"
      onSubmit={submit}
    >
      <QuestionnaireProgress />
      <QuestionnaireItem name="completed" required>
        <QuestionnaireTitle>Was this week’s goal completed?</QuestionnaireTitle>
        <QuestionnaireDescription>Choose one answer.</QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="yes">
            Yes
            <QuestionnaireChoiceDescription>
              2 points
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireChoice value="no">
            No
            <QuestionnaireChoiceDescription>
              0 points
            </QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireItem name="practice" required>
        <QuestionnaireTitle>
          How many times did you practice?
        </QuestionnaireTitle>
        <QuestionnaireDescription>
          Choose the closest answer.
        </QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="one">Once</QuestionnaireChoice>
          <QuestionnaireChoice value="three">Three times</QuestionnaireChoice>
          <QuestionnaireChoice value="five">
            Five or more times
          </QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireActions>
        <QuestionnairePrevious />
        <QuestionnaireNext />
        <QuestionnaireSubmit>Save response</QuestionnaireSubmit>
      </QuestionnaireActions>
      <p className="min-h-6 text-sm text-muted-foreground" aria-live="polite">
        {notice}
      </p>
    </Questionnaire>
  )
}

import { QuestionnaireDemo } from "../components/questionnaire-demo"
import { defineComponentDoc } from "../docs/types"

const source = `import {
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
    choices: [
      { value: "one" },
      { value: "three" },
      { value: "five" },
    ],
  },
] as const

function QuestionnaireDemo() {
  const [notice, setNotice] = useState("")

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const answers = new FormData(event.currentTarget)
    setNotice(
      \`Saved: \${answers.get("completed")}, \${answers.get("practice")} practice sessions.\`
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
            <QuestionnaireChoiceDescription>2 points</QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
          <QuestionnaireChoice value="no">
            No
            <QuestionnaireChoiceDescription>0 points</QuestionnaireChoiceDescription>
          </QuestionnaireChoice>
        </QuestionnaireChoices>
        <QuestionnaireError />
      </QuestionnaireItem>
      <QuestionnaireItem name="practice" required>
        <QuestionnaireTitle>How many times did you practice?</QuestionnaireTitle>
        <QuestionnaireDescription>Choose the closest answer.</QuestionnaireDescription>
        <QuestionnaireChoices>
          <QuestionnaireChoice value="one">Once</QuestionnaireChoice>
          <QuestionnaireChoice value="three">Three times</QuestionnaireChoice>
          <QuestionnaireChoice value="five">Five or more times</QuestionnaireChoice>
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
}`

export default defineComponentDoc({
  slug: "questionnaire",
  title: "Questionnaire",
  purpose:
    "Presents an ordered set of questions one at a time with answer validation, progress, and navigation.",
  guidance: {
    useWhen:
      "A survey, intake, or setup flow benefits from focused single-question steps and fixed single- or multiple-choice answers.",
    avoidWhen:
      "Users need to compare or edit many answers simultaneously, or the form has only one compact field. Use regular Field composition instead.",
  },
  examples: [
    {
      title: "Required survey questions",
      description:
        "A canned yes/no question and a multiple-choice question share native radio behavior, keyboard shortcuts, progress, and validation.",
      source,
      preview: <QuestionnaireDemo />,
    },
  ],
  variantsAndStates:
    "Items support required, optional, skipped, disabled, invalid, single-choice, multiple-choice, and freeform states. Roots can be controlled, resume saved answers, and assign letter or number shortcuts.",
  mobile:
    "Keep the questionnaire full width with wrapping titles and choice descriptions. Generated choices and navigation provide 44px touch targets; containing pages must preserve safe-area padding.",
  accessibility:
    "Each item is a fieldset whose title is its legend. Choices use native radio or checkbox inputs, descriptions and errors are associated with the active item, progress is a named progressbar, and navigation moves focus to the next question or first invalid answer.",
})

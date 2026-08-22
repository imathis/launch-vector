import { createHighlighterCore } from "@shikijs/core"
import { createJavaScriptRegexEngine } from "@shikijs/engine-javascript"
import tsx from "@shikijs/langs/tsx"
import githubDark from "@shikijs/themes/github-dark"
import githubLight from "@shikijs/themes/github-light"

const highlighter = createHighlighterCore({
  engine: createJavaScriptRegexEngine(),
  langs: [tsx],
  themes: [githubLight, githubDark],
})

export async function highlightCode(source: string) {
  return (await highlighter).codeToHtml(source, {
    lang: "tsx",
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    defaultColor: false,
  })
}

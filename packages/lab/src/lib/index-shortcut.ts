// 1–9 then 0; only the first ten list entries are reachable.
const NUMBER_KEY_CODE = /^(?:Digit|Numpad)([0-9])$/

export const INDEX_SHORTCUT_COUNT = 10

export function numberKeyIndex(code: string) {
  const match = NUMBER_KEY_CODE.exec(code)
  if (!match?.[1]) return null
  const number = Number(match[1])
  return number === 0 ? INDEX_SHORTCUT_COUNT - 1 : number - 1
}

export function indexShortcut(index: number) {
  if (index < 0 || index >= INDEX_SHORTCUT_COUNT) return undefined
  return index === INDEX_SHORTCUT_COUNT - 1 ? "0" : String(index + 1)
}

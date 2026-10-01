export const FRAME_STATE_MESSAGE = "vector-lab:frame-state"
export const FRAME_KEY_MESSAGE = "vector-lab:frame-key"

export type FrameStateMessage = {
  type: typeof FRAME_STATE_MESSAGE
  variant: string
  scenario: string
  view: "focus" | "compare"
  canvas: string
}

export type FrameKeyMessage = {
  type: typeof FRAME_KEY_MESSAGE
  key: string
  code: string
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  repeat: boolean
}

export function isFrameStateMessage(
  value: unknown
): value is FrameStateMessage {
  if (!value || typeof value !== "object") return false
  const message = value as Partial<FrameStateMessage>
  return (
    message.type === FRAME_STATE_MESSAGE &&
    typeof message.variant === "string" &&
    typeof message.scenario === "string" &&
    (message.view === "focus" || message.view === "compare") &&
    typeof message.canvas === "string"
  )
}

export function isFrameKeyMessage(value: unknown): value is FrameKeyMessage {
  if (!value || typeof value !== "object") return false
  const message = value as Partial<FrameKeyMessage>
  return (
    message.type === FRAME_KEY_MESSAGE &&
    typeof message.key === "string" &&
    typeof message.code === "string" &&
    typeof message.altKey === "boolean" &&
    typeof message.shiftKey === "boolean" &&
    typeof message.metaKey === "boolean" &&
    typeof message.ctrlKey === "boolean" &&
    typeof message.repeat === "boolean"
  )
}

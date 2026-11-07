export type CourseDeletionState =
  | { phase: "closed" | "confirm" | "deleting" | "success" }
  | { phase: "error"; message: string };

export type CourseDeletionAction =
  | { type: "open" | "cancel" | "confirm" | "success" }
  | { type: "error"; message: string };

export function courseDeletionState(state: CourseDeletionState, action: CourseDeletionAction): CourseDeletionState {
  switch (action.type) {
    case "open": return state.phase === "closed" ? { phase: "confirm" } : state;
    case "cancel": return state.phase === "confirm" || state.phase === "error" ? { phase: "closed" } : state;
    case "confirm": return state.phase === "confirm" || state.phase === "error" ? { phase: "deleting" } : state;
    case "success": return state.phase === "deleting" ? { phase: "success" } : state;
    case "error": return state.phase === "deleting" ? { phase: "error", message: action.message } : state;
  }
}

export interface ActionState {
  error: string | null;
  success: string | null;
  fieldErrors?: Record<string, string>;
}

export const INITIAL_ACTION_STATE: ActionState = {
  error: null,
  success: null,
};

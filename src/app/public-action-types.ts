export interface PublicLeadActionState {
  error: string | null;
  success: string | null;
  downloadUrl: string | null;
  downloadLabel: string | null;
}

export const INITIAL_PUBLIC_LEAD_ACTION_STATE: PublicLeadActionState = {
  error: null,
  success: null,
  downloadUrl: null,
  downloadLabel: null,
};

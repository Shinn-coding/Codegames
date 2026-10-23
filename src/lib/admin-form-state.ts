export type AdminFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: Record<string, string>;
  /** Raw submitted values, echoed back so a failed validation keeps the form. */
  values?: Record<string, string>;
};

export const initialAdminFormState: AdminFormState = { status: "idle" };

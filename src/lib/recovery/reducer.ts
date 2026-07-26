import type { Diagnosis, RecoveryStage, RecoveryWriteback } from "../types.ts";

export type RecoveryState = {
  stage: RecoveryStage;
  transcript: string;
  diagnosis?: Diagnosis;
  writeback?: RecoveryWriteback;
  verificationAttempts: number;
  error?: string;
  resumeStage?: RecoveryStage;
};

export type RecoveryAction =
  | { type: "START_RECORDING" }
  | { type: "START_TRANSCRIPTION" }
  | { type: "TRANSCRIPT_READY"; transcript: string }
  | { type: "EDIT_TRANSCRIPT"; transcript: string }
  | { type: "START_DIAGNOSIS" }
  | { type: "DIAGNOSIS_READY"; diagnosis: Diagnosis }
  | { type: "BEGIN_EXPLANATION" }
  | { type: "AWAIT_VERIFICATION" }
  | { type: "START_VERIFICATION" }
  | { type: "VERIFICATION_FAILED" }
  | { type: "REPAIRED" }
  | { type: "START_WRITEBACK"; writeback: RecoveryWriteback }
  | { type: "COMPLETED"; writeback: RecoveryWriteback }
  | { type: "ERROR"; message: string; resumeStage: RecoveryStage }
  | { type: "RESUME" };

export const initialRecoveryState: RecoveryState = {
  stage: "idle",
  transcript: "",
  verificationAttempts: 0,
};

export function recoveryReducer(
  state: RecoveryState,
  action: RecoveryAction,
): RecoveryState {
  switch (action.type) {
    case "START_RECORDING":
      return { ...state, stage: "recording", error: undefined };
    case "START_TRANSCRIPTION":
      return { ...state, stage: "transcribing", error: undefined };
    case "TRANSCRIPT_READY":
      return { ...state, stage: "transcript_review", transcript: action.transcript };
    case "EDIT_TRANSCRIPT":
      return { ...state, transcript: action.transcript };
    case "START_DIAGNOSIS":
      return { ...state, stage: "diagnosing", error: undefined };
    case "DIAGNOSIS_READY":
      return {
        ...state,
        stage: action.diagnosis.clarificationNeeded
          ? "clarification_required"
          : "explaining",
        diagnosis: action.diagnosis,
      };
    case "BEGIN_EXPLANATION":
      return { ...state, stage: "explaining" };
    case "AWAIT_VERIFICATION":
      return { ...state, stage: "awaiting_verification" };
    case "START_VERIFICATION":
      return { ...state, stage: "verifying", error: undefined };
    case "VERIFICATION_FAILED":
      return {
        ...state,
        stage: "retry_explanation",
        verificationAttempts: state.verificationAttempts + 1,
      };
    case "REPAIRED":
      return {
        ...state,
        stage: "repaired",
        verificationAttempts: state.verificationAttempts + 1,
      };
    case "START_WRITEBACK":
      return { ...state, stage: "writing_back", writeback: action.writeback };
    case "COMPLETED":
      return { ...state, stage: "completed", writeback: action.writeback };
    case "ERROR":
      return {
        ...state,
        stage: "recoverable_error",
        error: action.message,
        resumeStage: action.resumeStage,
      };
    case "RESUME":
      return {
        ...state,
        stage: state.resumeStage ?? "idle",
        error: undefined,
        resumeStage: undefined,
      };
  }
}

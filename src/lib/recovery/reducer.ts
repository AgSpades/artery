import type { Diagnosis, RecoveryStage, RecoveryWriteback } from "../types.ts";

export type VoiceStatus =
  | "permission_required"
  | "connecting"
  | "mentor_speaking"
  | "listening"
  | "processing"
  | "reconnecting"
  | "fallback"
  | "ended";

export type ConversationTurn = {
  speaker: "learner" | "mentor";
  text: string;
  englishSubtitle?: string;
  interrupted?: boolean;
  turnType?: "initial_reasoning" | "clarification" | "self_correction";
};

export type RecoveryState = {
  stage: RecoveryStage;
  voiceStatus: VoiceStatus;
  turns: ConversationTurn[];
  transcript: string;
  diagnosis?: Diagnosis;
  writeback?: RecoveryWriteback;
  verificationAttempts: number;
  error?: string;
  resumeStage?: RecoveryStage;
  selfCorrectionPending?: boolean;
};

export type RecoveryAction =
  | { type: "START_CONVERSATION" }
  | { type: "VOICE_READY" }
  | { type: "VOICE_RECONNECTING" }
  | { type: "VOICE_FALLBACK" }
  | {
      type: "START_MENTOR_REPLY";
      text: string;
      englishSubtitle?: string;
    }
  | { type: "MENTOR_REPLY_FINISHED" }
  | { type: "SPEECH_STARTED" }
  | { type: "TURN_TRANSCRIPT"; transcript: string }
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
  voiceStatus: "permission_required",
  turns: [],
  transcript: "",
  verificationAttempts: 0,
};

export function recoveryReducer(
  state: RecoveryState,
  action: RecoveryAction,
): RecoveryState {
  switch (action.type) {
    case "START_CONVERSATION":
      return { ...state, voiceStatus: "connecting", error: undefined };
    case "VOICE_READY":
      return { ...state, voiceStatus: "listening", error: undefined };
    case "VOICE_RECONNECTING":
      return { ...state, voiceStatus: "reconnecting" };
    case "VOICE_FALLBACK":
      return { ...state, voiceStatus: "fallback" };
    case "START_MENTOR_REPLY":
      return {
        ...state,
        voiceStatus: "mentor_speaking",
        turns: [
          ...state.turns,
          {
            speaker: "mentor",
            text: action.text,
            englishSubtitle: action.englishSubtitle,
          },
        ],
      };
    case "MENTOR_REPLY_FINISHED":
      return { ...state, voiceStatus: "listening" };
    case "SPEECH_STARTED":
      return {
        ...state,
        voiceStatus: "listening",
        selfCorrectionPending:
          state.voiceStatus === "mentor_speaking" &&
          ["explaining", "retry_explanation"].includes(state.stage),
        turns: state.turns.map((turn, index) =>
          index === state.turns.length - 1 && turn.speaker === "mentor"
            ? { ...turn, interrupted: true }
            : turn,
        ),
      };
    case "TURN_TRANSCRIPT": {
      const turnType = state.selfCorrectionPending
        ? "self_correction"
        : state.stage === "clarification_required"
          ? "clarification"
          : "initial_reasoning";
      const label =
        turnType === "self_correction"
          ? "Self-correction: "
          : turnType === "clarification"
            ? "Clarification: "
            : "";
      return {
        ...state,
        voiceStatus: "processing",
        transcript: [state.transcript, `${label}${action.transcript}`]
          .filter(Boolean)
          .join("\n"),
        turns: [
          ...state.turns,
          { speaker: "learner", text: action.transcript, turnType },
        ],
        selfCorrectionPending: false,
      };
    }
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
      return {
        ...state,
        stage: "completed",
        voiceStatus: "ended",
        writeback: action.writeback,
      };
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

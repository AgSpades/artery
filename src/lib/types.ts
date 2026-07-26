import type { z } from "zod";

import type {
  conceptPacketSchema,
  diagnosisSchema,
  hostRecoveryRequestSchema,
  recallCardSchema,
  recoveryWritebackSchema,
} from "./schemas";

export type ConceptPacket = z.infer<typeof conceptPacketSchema>;
export type Diagnosis = z.infer<typeof diagnosisSchema>;
export type HostRecoveryRequest = z.infer<typeof hostRecoveryRequestSchema>;
export type RecallCard = z.infer<typeof recallCardSchema>;
export type RecoveryWriteback = z.infer<typeof recoveryWritebackSchema>;

export type RecoveryStage =
  | "idle"
  | "recording"
  | "transcribing"
  | "transcript_review"
  | "diagnosing"
  | "clarification_required"
  | "explaining"
  | "awaiting_verification"
  | "verifying"
  | "repaired"
  | "retry_explanation"
  | "writing_back"
  | "completed"
  | "recoverable_error";

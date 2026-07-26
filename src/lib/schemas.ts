import { z } from "zod";

export const optionSchema = z.strictObject({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const masteryStateSchema = z.enum([
  "misconception_detected",
  "explanation_delivered",
  "verification_failed",
  "provisionally_repaired",
  "scheduled_for_recall",
]);

export const priorContextSchema = z.strictObject({
  conceptId: z.string().min(1),
  misconceptionId: z.string().min(1).optional(),
  masteryState: z.string().min(1),
  latestCorrection: z.string().min(1).optional(),
});

export const hostRecoveryRequestSchema = z.strictObject({
  learnerId: z.string().min(1),
  contentId: z.string().min(1),
  subject: z.string().min(1),
  chapter: z.string().min(1),
  question: z.string().min(1),
  options: z.array(optionSchema).min(2),
  learnerAnswer: z.string().min(1),
  correctAnswer: z.string().min(1),
  preferredLanguage: z.literal("hi-IN"),
  conceptPacketId: z.string().min(1),
  priorContext: z.array(priorContextSchema),
});

export const recallCardSchema = z.strictObject({
  front: z.string().min(1),
  back: z.string().min(1),
  nextReviewAt: z.iso.datetime(),
  intervalDays: z.number().int().positive(),
});

export const recoveryWritebackSchema = z.strictObject({
  sessionId: z.string().min(1),
  learnerId: z.string().min(1),
  conceptId: z.string().min(1),
  misconceptionId: z.string().min(1),
  diagnosis: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  verificationStatus: z.enum(["passed", "failed"]),
  masteryState: masteryStateSchema,
  recallCard: recallCardSchema.optional(),
  completedAt: z.iso.datetime(),
});

export const diagnosisSchema = z.strictObject({
  misconceptionId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  studentEvidence: z.array(z.string().min(1).max(220)).min(1).max(3),
  correctReasoningFragment: z.string().min(1).max(220),
  divergencePoint: z.string().min(1).max(260),
  clarificationNeeded: z.boolean(),
  clarifyingQuestion: z.string().min(1).nullable(),
  spokenExplanation: z.string().min(1).max(360),
  englishSubtitle: z.string().min(1).max(320),
  verificationQuestion: z.string().min(1).max(300),
  expectedVerification: z.string().min(1).max(10),
  memoryUpdates: z.strictObject({
    conceptId: z.string().min(1),
    masteryState: masteryStateSchema,
    latestCorrection: z.string().min(1).max(220),
  }),
});

export const conceptPacketSchema = z.strictObject({
  id: z.string().min(1),
  concept: z.string().min(1),
  question: z.string().min(1),
  options: z.array(optionSchema).length(4),
  correctOption: z.string().min(1),
  demoWrongOption: z.string().min(1),
  allowedMisconceptions: z.array(
    z.strictObject({
      id: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
  verifiedFacts: z.array(z.string().min(1)).min(1),
  transferQuestion: z.strictObject({
    question: z.string().min(1),
    options: z.array(optionSchema).length(4),
    correctOption: z.string().min(1),
  }),
  recallCard: z.strictObject({
    front: z.string().min(1),
    back: z.string().min(1),
  }),
});

export const conceptPacketsSchema = z.strictObject({
  packVersion: z.string().min(1),
  scope: z.string().min(1),
  cases: z.array(conceptPacketSchema).min(3),
});

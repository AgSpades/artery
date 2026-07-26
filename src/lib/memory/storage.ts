"use client";

import { z } from "zod";

import {
  hostRecoveryRequestSchema,
  recoveryWritebackSchema,
} from "@/lib/schemas";
import type { HostRecoveryRequest, RecoveryWriteback } from "@/lib/types";

const MEMORY_KEY = "artery-demo-memory-v1";
const SESSIONS_KEY = "artery-active-sessions-v1";

const memorySchema = z.strictObject({
  version: z.literal(1),
  learner: z.strictObject({
    id: z.string(),
    name: z.string(),
    preferredLanguage: z.literal("hi-IN"),
  }),
  completedSessions: z.array(recoveryWritebackSchema),
});

const sessionSchema = z.strictObject({
  sessionId: z.string(),
  context: hostRecoveryRequestSchema,
  createdAt: z.iso.datetime(),
});

const sessionsSchema = z.record(z.string(), sessionSchema);

export type DemoMemory = z.infer<typeof memorySchema>;

const emptyMemory: DemoMemory = {
  version: 1,
  learner: { id: "demo_learner_01", name: "Ananya", preferredLanguage: "hi-IN" },
  completedSessions: [],
};

function parseOrClear<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
  } catch {}
  localStorage.removeItem(key);
  return fallback;
}

export function loadMemory() {
  return parseOrClear(MEMORY_KEY, memorySchema, emptyMemory);
}

export function saveWriteback(writeback: RecoveryWriteback) {
  const memory = loadMemory();
  const completedSessions = [
    ...memory.completedSessions.filter(
      ({ sessionId }) => sessionId !== writeback.sessionId,
    ),
    writeback,
  ];
  localStorage.setItem(
    MEMORY_KEY,
    JSON.stringify({ ...memory, completedSessions }),
  );
}

export function resetMemory() {
  localStorage.removeItem(MEMORY_KEY);
  localStorage.removeItem(SESSIONS_KEY);
}

export function saveActiveSession(
  sessionId: string,
  context: HostRecoveryRequest,
) {
  const sessions = parseOrClear(SESSIONS_KEY, sessionsSchema, {});
  sessions[sessionId] = { sessionId, context, createdAt: new Date().toISOString() };
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function loadActiveSession(sessionId: string) {
  return parseOrClear(SESSIONS_KEY, sessionsSchema, {})[sessionId];
}

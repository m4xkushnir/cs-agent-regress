import { z } from "zod";

export const ToolCall = z.object({
  id: z.string(),
  name: z.string(),
  args: z.record(z.string(), z.unknown()),
});
export type ToolCall = z.infer<typeof ToolCall>;

export const Turn = z.discriminatedUnion("role", [
  z.object({ idx: z.number().int(), role: z.literal("user"), text: z.string() }),
  z.object({
    idx: z.number().int(),
    role: z.literal("assistant"),
    text: z.string().nullable(),
    toolCalls: z.array(ToolCall),
  }),
  z.object({
    idx: z.number().int(),
    role: z.literal("tool"),
    callId: z.string(),
    content: z.string(),
    isError: z.boolean(),
  }),
]);
export type Turn = z.infer<typeof Turn>;

export const ExpectedAction = z.object({
  name: z.string(),
  args: z.record(z.string(), z.unknown()),
});

/** One simulated conversation, normalized away from tau2's on-disk format. */
export const Trajectory = z.object({
  id: z.string(),
  runId: z.string(),
  taskId: z.string(),
  trial: z.number().int(),
  agentModel: z.string(),
  prompt: z.string(),
  reward: z.number(),
  terminationReason: z.string(),
  dbMatch: z.boolean().nullable(),
  nlAssertions: z.array(z.object({ text: z.string(), met: z.boolean() })),
  expectedActions: z.array(ExpectedAction),
  costUsd: z.number().nullable(),
  turns: z.array(Turn),
});
export type Trajectory = z.infer<typeof Trajectory>;

export const Run = z.object({
  runId: z.string(),
  agentModel: z.string(),
  prompt: z.string(),
  trajectories: z.array(Trajectory),
});
export type Run = z.infer<typeof Run>;

export const Severity = z.enum(["critical", "major", "minor"]);
export type Severity = z.infer<typeof Severity>;

export const Finding = z.object({
  check: z.string(),
  severity: Severity,
  turnIdx: z.number().int().nullable(),
  message: z.string(),
});
export type Finding = z.infer<typeof Finding>;

/** Per-task expectations. Generated from tau2 tasks, then edited by hand. */
export const ScenarioSpec = z.object({
  taskId: z.string(),
  summary: z.string(),
  /** Checks that must report zero findings on every trial of this task. */
  gate: z.array(z.string()).default([]),
  /** Checks to skip for this task, with the reason written next to them. */
  skip: z.array(z.object({ check: z.string(), reason: z.string() })).default([]),
});
export type ScenarioSpec = z.infer<typeof ScenarioSpec>;

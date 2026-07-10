import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { agents, companies, createDb, issues } from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { agentService } from "../services/agents.ts";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres agent routing tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

describeEmbeddedPostgres("agent service resolveByRoutingReference", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-agent-routing-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(issues);
    await db.delete(agents);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  async function seedCompany() {
    const companyId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    return companyId;
  }

  async function seedAgent(
    companyId: string,
    overrides: Partial<typeof agents.$inferInsert> = {},
  ) {
    const agentId = randomUUID();
    await db.insert(agents).values({
      id: agentId,
      companyId,
      name: `Agent-${agentId.slice(0, 8)}`,
      role: "implementer",
      status: "idle",
      adapterType: "claude_local",
      adapterConfig: {},
      runtimeConfig: {},
      permissions: {},
      ...overrides,
    });
    return agentId;
  }

  async function seedAssignedIssue(companyId: string, assigneeAgentId: string, status = "in_progress") {
    await db.insert(issues).values({
      id: randomUUID(),
      companyId,
      title: "Seeded work",
      status,
      assigneeAgentId,
    });
  }

  it("routes role references to the least-loaded matching agent", async () => {
    const companyId = await seedCompany();
    const busyId = await seedAgent(companyId, { createdAt: new Date("2026-01-01T00:00:00.000Z") });
    const idleId = await seedAgent(companyId, { createdAt: new Date("2026-01-02T00:00:00.000Z") });
    await seedAgent(companyId, { role: "planner" });
    await seedAssignedIssue(companyId, busyId);
    await seedAssignedIssue(companyId, busyId, "todo");
    await seedAssignedIssue(companyId, busyId, "done");
    await seedAssignedIssue(companyId, idleId);

    const routed = await agentService(db).resolveByRoutingReference(companyId, {
      strategy: "role",
      value: "implementer",
    });

    expect(routed.candidateCount).toBe(2);
    expect(routed.agent?.id).toBe(idleId);
  });

  it("breaks load ties deterministically by creation time", async () => {
    const companyId = await seedCompany();
    const olderId = await seedAgent(companyId, { createdAt: new Date("2026-01-01T00:00:00.000Z") });
    await seedAgent(companyId, { createdAt: new Date("2026-01-02T00:00:00.000Z") });

    const routed = await agentService(db).resolveByRoutingReference(companyId, {
      strategy: "role",
      value: "implementer",
    });

    expect(routed.agent?.id).toBe(olderId);
  });

  it("excludes terminated and pending approval agents and prefers invokable over paused agents", async () => {
    const companyId = await seedCompany();
    await seedAgent(companyId, { status: "terminated" });
    await seedAgent(companyId, { status: "pending_approval" });
    await seedAgent(companyId, { status: "paused" });
    const idleId = await seedAgent(companyId, { status: "idle" });
    await seedAssignedIssue(companyId, idleId);
    await seedAssignedIssue(companyId, idleId);

    const routed = await agentService(db).resolveByRoutingReference(companyId, {
      strategy: "role",
      value: "implementer",
    });

    expect(routed.candidateCount).toBe(2);
    expect(routed.agent?.id).toBe(idleId);
  });

  it("falls back to a paused agent when no invokable candidate exists", async () => {
    const companyId = await seedCompany();
    const pausedId = await seedAgent(companyId, { status: "paused" });
    await seedAgent(companyId, { role: "planner" });

    const routed = await agentService(db).resolveByRoutingReference(companyId, {
      strategy: "role",
      value: "implementer",
    });

    expect(routed.agent?.id).toBe(pausedId);
  });

  it("routes capability references against the capabilities text", async () => {
    const companyId = await seedCompany();
    const reviewerId = await seedAgent(companyId, {
      role: "engineer",
      capabilities: "TypeScript, Code Review",
    });
    await seedAgent(companyId, { role: "engineer", capabilities: "frontend" });

    const routed = await agentService(db).resolveByRoutingReference(companyId, {
      strategy: "capability",
      value: "code review",
    });

    expect(routed.candidateCount).toBe(1);
    expect(routed.agent?.id).toBe(reviewerId);
  });

  it("returns no agent when nothing matches", async () => {
    const companyId = await seedCompany();
    await seedAgent(companyId, { role: "planner" });

    const routed = await agentService(db).resolveByRoutingReference(companyId, {
      strategy: "role",
      value: "implementer",
    });

    expect(routed.agent).toBeNull();
    expect(routed.candidateCount).toBe(0);
  });
});

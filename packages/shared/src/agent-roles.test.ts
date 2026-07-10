import { describe, expect, it } from "vitest";
import { AGENT_ROLES, AGENT_ROLE_LABELS, coerceAgentRole, isAgentRole } from "./constants.js";

describe("agent roles", () => {
  it("includes the planner role with a label", () => {
    expect(AGENT_ROLES).toContain("planner");
    expect(AGENT_ROLE_LABELS.planner).toBe("Planner");
  });

  it("isAgentRole accepts known roles and rejects free text", () => {
    expect(isAgentRole("planner")).toBe(true);
    expect(isAgentRole("engineer")).toBe(true);
    expect(isAgentRole("reviewer")).toBe(false);
    expect(isAgentRole("")).toBe(false);
    expect(isAgentRole(null)).toBe(false);
    expect(isAgentRole(42)).toBe(false);
  });

  it("coerceAgentRole falls back to general for unknown input", () => {
    expect(coerceAgentRole("planner")).toBe("planner");
    expect(coerceAgentRole("reviewer")).toBe("general");
    expect(coerceAgentRole(undefined)).toBe("general");
    expect(coerceAgentRole("reviewer", "qa")).toBe("qa");
  });
});

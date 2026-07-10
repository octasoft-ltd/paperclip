import { describe, expect, it } from "vitest";
import {
  agentCapabilitiesMatch,
  formatAgentRoutingReference,
  parseAgentRoutingReference,
} from "./agent-routing.js";

describe("parseAgentRoutingReference", () => {
  it("parses role routing references", () => {
    expect(parseAgentRoutingReference("role:implementer")).toEqual({
      strategy: "role",
      value: "implementer",
    });
  });

  it("parses capability routing references and trims whitespace", () => {
    expect(parseAgentRoutingReference("  capability: code review  ")).toEqual({
      strategy: "capability",
      value: "code review",
    });
  });

  it("lowercases the strategy prefix but preserves the value", () => {
    expect(parseAgentRoutingReference("Role:Implementer")).toEqual({
      strategy: "role",
      value: "Implementer",
    });
  });

  it("returns null for agent IDs, shortnames, and malformed references", () => {
    expect(parseAgentRoutingReference("22222222-2222-4222-8222-222222222222")).toBeNull();
    expect(parseAgentRoutingReference("paperclip-engineer")).toBeNull();
    expect(parseAgentRoutingReference("role:")).toBeNull();
    expect(parseAgentRoutingReference("role:   ")).toBeNull();
    expect(parseAgentRoutingReference("team:implementer")).toBeNull();
    expect(parseAgentRoutingReference("")).toBeNull();
  });
});

describe("formatAgentRoutingReference", () => {
  it("round-trips a parsed reference", () => {
    expect(formatAgentRoutingReference({ strategy: "role", value: "implementer" })).toBe("role:implementer");
  });
});

describe("agentCapabilitiesMatch", () => {
  it("matches comma-separated entries case-insensitively", () => {
    expect(agentCapabilitiesMatch("TypeScript, Code Review, debugging", "code review")).toBe(true);
    expect(agentCapabilitiesMatch("TypeScript, Code Review, debugging", "DEBUGGING")).toBe(true);
  });

  it("matches a single word inside a phrase entry", () => {
    expect(agentCapabilitiesMatch("frontend implementation work", "implementation")).toBe(true);
  });

  it("does not match partial words", () => {
    expect(agentCapabilitiesMatch("javascript", "java")).toBe(false);
  });

  it("returns false for empty capabilities or values", () => {
    expect(agentCapabilitiesMatch(null, "code")).toBe(false);
    expect(agentCapabilitiesMatch("", "code")).toBe(false);
    expect(agentCapabilitiesMatch("code", " ")).toBe(false);
  });
});

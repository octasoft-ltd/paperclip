import { describe, expect, it } from "vitest";
import {
  WORKSPACE_VALIDATION_FINGERPRINT_PREFIX,
  computeWorkspaceValidationFingerprint,
} from "./workspace-validation-fingerprint.js";

function buildDetail(overrides: Record<string, unknown> = {}) {
  return {
    reason: "missing_git_metadata",
    adapterType: "codex_local",
    issueId: "issue-1",
    issueIdentifier: "OCT-1325",
    issueProjectId: "project-1",
    issueProjectWorkspaceId: "workspace-1",
    resolvedWorkspaceSource: "project_primary",
    resolvedProjectId: "project-1",
    resolvedProjectWorkspaceId: "workspace-1",
    resolvedWorkspaceCwd: "/tmp/project",
    executionWorkspaceCwd: "/tmp/project",
    executionWorkspaceStrategy: "git_worktree",
    executionWorkspaceProjectId: "project-1",
    executionWorkspaceProjectWorkspaceId: "workspace-1",
    persistedExecutionWorkspaceId: "execution-workspace-1",
    persistedWorkspaceCwd: "/tmp/project",
    persistedWorkspaceStrategy: "git_worktree",
    persistedProjectId: "project-1",
    persistedProjectWorkspaceId: "workspace-1",
    persistedProviderRef: null,
    ...overrides,
  };
}

describe("computeWorkspaceValidationFingerprint", () => {
  it("returns null for absent or malformed detail", () => {
    expect(computeWorkspaceValidationFingerprint(null)).toBeNull();
    expect(computeWorkspaceValidationFingerprint(undefined)).toBeNull();
    expect(computeWorkspaceValidationFingerprint("nope")).toBeNull();
    expect(computeWorkspaceValidationFingerprint(42)).toBeNull();
  });

  it("returns null when reason is missing or blank", () => {
    expect(computeWorkspaceValidationFingerprint(buildDetail({ reason: undefined }))).toBeNull();
    expect(computeWorkspaceValidationFingerprint(buildDetail({ reason: "" }))).toBeNull();
    expect(computeWorkspaceValidationFingerprint(buildDetail({ reason: "   " }))).toBeNull();
  });

  it("is deterministic for identical details", () => {
    const a = computeWorkspaceValidationFingerprint(buildDetail());
    const b = computeWorkspaceValidationFingerprint(buildDetail());
    expect(a).not.toBeNull();
    expect(a).toBe(b);
    expect(a?.startsWith(WORKSPACE_VALIDATION_FINGERPRINT_PREFIX)).toBe(true);
  });

  it("is stable against key ordering in the detail object", () => {
    const ordered = buildDetail();
    const reordered = Object.fromEntries(Object.entries(ordered).reverse());
    expect(computeWorkspaceValidationFingerprint(reordered)).toBe(
      computeWorkspaceValidationFingerprint(ordered),
    );
  });

  it("ignores cosmetic fields (identity is unchanged)", () => {
    expect(computeWorkspaceValidationFingerprint(buildDetail({ issueIdentifier: "OCT-9999" }))).toBe(
      computeWorkspaceValidationFingerprint(buildDetail()),
    );
  });

  it("changes when the failure reason changes", () => {
    expect(computeWorkspaceValidationFingerprint(buildDetail({ reason: "persisted_cwd_mismatch" }))).not.toBe(
      computeWorkspaceValidationFingerprint(buildDetail()),
    );
  });

  it("changes when the workspace binding or worktree state changes", () => {
    const base = computeWorkspaceValidationFingerprint(buildDetail());
    expect(computeWorkspaceValidationFingerprint(buildDetail({ persistedWorkspaceCwd: "/tmp/other" }))).not.toBe(base);
    expect(computeWorkspaceValidationFingerprint(buildDetail({ persistedExecutionWorkspaceId: "execution-workspace-2" }))).not.toBe(base);
    expect(computeWorkspaceValidationFingerprint(buildDetail({ executionWorkspaceStrategy: "project_primary" }))).not.toBe(base);
    expect(computeWorkspaceValidationFingerprint(buildDetail({ adapterType: "claude_local" }))).not.toBe(base);
  });

  it("treats null and absent identity fields as equivalent", () => {
    const withNull = computeWorkspaceValidationFingerprint(buildDetail({ persistedProviderRef: null }));
    const detailWithoutField = buildDetail();
    delete (detailWithoutField as Record<string, unknown>).persistedProviderRef;
    expect(computeWorkspaceValidationFingerprint(detailWithoutField)).toBe(withNull);
  });
});

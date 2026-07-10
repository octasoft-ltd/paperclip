export const AGENT_ROUTING_STRATEGIES = ["role", "capability"] as const;
export type AgentRoutingStrategy = (typeof AGENT_ROUTING_STRATEGIES)[number];

export interface AgentRoutingReference {
  strategy: AgentRoutingStrategy;
  value: string;
}

const ROUTING_REFERENCE_PATTERN = /^(role|capability):(.+)$/i;

/**
 * Parses an assignee agent routing reference such as `role:implementer` or
 * `capability:code-review`. Returns null when the value is not a routing
 * reference (e.g. an agent ID or shortname), so callers can fall back to
 * direct reference resolution.
 */
export function parseAgentRoutingReference(raw: string): AgentRoutingReference | null {
  const match = ROUTING_REFERENCE_PATTERN.exec(raw.trim());
  if (!match) return null;
  const value = match[2]!.trim();
  if (!value) return null;
  return {
    strategy: match[1]!.toLowerCase() as AgentRoutingStrategy,
    value,
  };
}

export function formatAgentRoutingReference(reference: AgentRoutingReference): string {
  return `${reference.strategy}:${reference.value}`;
}

/**
 * Case-insensitive match of a routing capability value against an agent's
 * free-form `capabilities` text. Entries are separated by commas, semicolons,
 * or newlines; a value matches when it equals an entry or one of the entry's
 * whitespace-separated words.
 */
export function agentCapabilitiesMatch(capabilities: string | null | undefined, value: string): boolean {
  if (!capabilities) return false;
  const needle = value.trim().toLowerCase();
  if (!needle) return false;
  return capabilities
    .split(/[,;\n]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0)
    .some((entry) => entry === needle || entry.split(/\s+/).includes(needle));
}

/**
 * Audit record for an auto-fix applied by an agent.
 * Stored in AgentJob.result JSON for the admin dashboard.
 */
export interface AutoFixRecord {
  /** What kind of fix, e.g. "grammar_rewrite", "clickbait_title", "auto_post" */
  type: string;
  /** Which field was changed, e.g. "content", "title", "community_post" */
  field: string;
  /** Truncated original value */
  before: string;
  /** Truncated new value */
  after: string;
  /** Whether the fix was actually persisted to DB */
  applied: boolean;
  /** If not applied, why */
  reason?: string;
}

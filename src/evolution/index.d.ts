export type Language =
  | 'javascript'
  | 'typescript'
  | 'tsx'
  | 'rust'
  | 'python'
  | 'go'
  | 'csharp'
  | 'java'
  | 'c'
  | 'cpp'
  | 'php'
  | 'bash'
  | 'cmake';

export interface Abstraction {
  kind: 'function' | 'class' | 'macro';
  syntaxKind?: string;
  name: string;
  qualifiedName: string;
  start: number;
  end: number;
  startLine: number;
  endLine: number;
  /** Null when CMake formal arity needs unevaluated variable expansion. */
  parameters: number | null;
  complexity: number;
  hash: string;
  shape: string;
  editHash?: string;
}

export interface EvolutionIdentity extends Partial<Omit<Abstraction, 'kind'>> {
  id: string;
  path: string;
  kind: string;
  qualifiedName: string;
  hash: string;
  shape: string;
  editHash?: string;
  language: Language;
  startLine: number;
  complexity: number;
}
export interface EvolutionEvent {
  commit: string;
  id: string;
  kind: string;
  action: 'added' | 'modified' | 'renamed' | 'deleted';
  matchedBy?: string;
  before?: EvolutionIdentity;
  after?: EvolutionIdentity;
}
export interface EvolutionPattern {
  id: string;
  kind: string;
  beforeShape: string;
  afterShape: string;
  count: number;
  complexityDelta: number;
  evidence: { commit: string; path: string; id: string }[];
}
export interface EvolutionReport {
  schemaVersion: 1;
  algorithm: string;
  from: string;
  to: string;
  truncated: boolean;
  commits: { sha: string; date: string; subject: string }[];
  events: EvolutionEvent[];
  current: EvolutionIdentity[];
  hotspots: { path: string; changes: number }[];
  coupling: { files: string[]; commits: number }[];
  repeatedPatterns: EvolutionPattern[];
  suggestions: {
    patternId: string;
    confidence: 'observational';
    message: string;
    evidence: EvolutionPattern['evidence'];
  }[];
  limitations: string[];
}

export function extractEvolution(
  root: string,
  options?: {
    from?: string;
    to?: string;
    maxCommits?: number;
    maxFiles?: number;
    maxFileBytes?: number;
    maxTotalBytes?: number;
  }
): Promise<EvolutionReport>;

const actions = new Set(['added', 'deleted', 'modified', 'renamed']);
const isText = (value) => typeof value === 'string';
const isCount = (value) => Number.isSafeInteger(value) && value > 0;
const isSha = (value) =>
  typeof value === 'string' && /^(?:[\da-f]{40}|[\da-f]{64})$/.test(value);
const records = (list, test) =>
  Array.isArray(list) && list.every((item) => item && test(item));
const isIdentity = (entry) =>
  entry && isText(entry.path) && isText(entry.qualifiedName);
const isEvent = (entry) =>
  isSha(entry.commit) &&
  isSha(entry.id) &&
  isText(entry.kind) &&
  actions.has(entry.action) &&
  (entry.action === 'added' || isIdentity(entry.before)) &&
  (entry.action === 'deleted' || isIdentity(entry.after));
const isCommit = (entry) =>
  isSha(entry.sha) &&
  isText(entry.subject) &&
  isText(entry.date) &&
  Number.isFinite(Date.parse(entry.date));
const isPathPair = (entry) =>
  Array.isArray(entry.files) &&
  entry.files.length === 2 &&
  entry.files.every(isText) &&
  isCount(entry.commits);
const isSuggestion = (entry) =>
  isText(entry.message) &&
  isText(entry.patternId) &&
  records(
    entry.evidence,
    ({ commit, id, path }) => isSha(commit) && isSha(id) && isText(path)
  );

export function isReport(report) {
  return (
    report?.schemaVersion === 1 &&
    report.algorithm === 'first-parent-structural-v1' &&
    typeof report.truncated === 'boolean' &&
    records(report.commits, isCommit) &&
    records(report.events, isEvent) &&
    records(
      report.hotspots,
      ({ path, changes }) => isText(path) && isCount(changes)
    ) &&
    records(report.coupling, isPathPair) &&
    records(
      report.repeatedPatterns,
      ({ id, count }) => isText(id) && isCount(count)
    ) &&
    records(report.suggestions, isSuggestion) &&
    Array.isArray(report.limitations) &&
    report.limitations.every(isText)
  );
}

export function eventsByCommit(events) {
  const byCommit = new Map();
  for (const event of events) {
    const entries = byCommit.get(event.commit) || [];
    entries.push(event);
    byCommit.set(event.commit, entries);
  }
  return byCommit;
}

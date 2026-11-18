import { mountDocument } from '@link-foundation/ui-dom';
import { createI18n, parseLinoCatalogs } from 'lino-i18n/browser';
import sample from './sample-report.json';
import layout from './actions.lino?raw';
import catalog from './en.lino?raw';
import { eventsByCommit, isReport } from './report.js';
import './styles.css';

const [en] = parseLinoCatalogs(catalog);
const i18n = createI18n({
  defaultLocale: 'en',
  locales: { en: en.translations },
});
const t = (key) => i18n.t(key);
const byId = (id) => document.getElementById(id);
const filter = byId('change-kind');
const fileInput = byId('report-file');
const dateFormat = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});
let report;
let byCommit;
let selection = 0;

function make(tag, className, text) {
  const item = document.createElement(tag);
  item.className = className;
  if (text !== undefined) {
    item.textContent = text;
  }
  return item;
}

function changeLabel(event) {
  const location = (entry) =>
    event.kind === 'file'
      ? entry.path
      : `${entry.path} · ${entry.qualifiedName}`;
  if (event.action === 'renamed') {
    return `${location(event.before)} → ${location(event.after)}`;
  }
  return location(event.after || event.before);
}

function commitItem(commit, events, expanded, evidenceId) {
  const item = make('details', 'commit');
  item.id = `commit-${commit.sha}`;
  item.open = expanded;
  const summary = make('summary', 'commit-summary');
  const copy = make('span', 'commit-copy');
  copy.append(
    make('strong', '', commit.subject || 'Untitled commit'),
    make(
      'small',
      '',
      `${commit.sha.slice(0, 8)} · ${dateFormat.format(new Date(commit.date))}`
    )
  );
  summary.append(copy, make('span', 'count', String(events.length)));
  const changes = make('ul', 'changes');
  const visible = events.slice(0, 100);
  if (evidenceId && !visible.some(({ id }) => id === evidenceId)) {
    const evidence = events.find(({ id }) => id === evidenceId);
    if (evidence) {
      visible.push(evidence);
    }
  }
  for (const event of visible) {
    const row = make('li', 'change');
    if (event.id === evidenceId) {
      row.tabIndex = -1;
      row.dataset.evidence = '';
    }
    row.append(
      make('span', `change-action ${event.action}`, t(event.action)),
      make('span', 'change-path', changeLabel(event))
    );
    changes.append(row);
  }
  if (events.length > visible.length) {
    changes.append(
      make(
        'li',
        'empty',
        `Showing ${visible.length} of ${events.length} changes.`
      )
    );
  }
  item.append(summary, changes);
  return item;
}

function renderTimeline(evidence) {
  const commits = report.commits
    .slice()
    .reverse()
    .map((commit) => ({
      commit,
      events: (byCommit.get(commit.sha) || []).filter(
        (event) => !filter.value || event.kind === filter.value
      ),
    }))
    .filter(({ events }) => !filter.value || events.length);
  const timeline = byId('timeline');
  const visible = commits.slice(0, 100);
  if (
    evidence &&
    !visible.some(({ commit }) => commit.sha === evidence.commit)
  ) {
    const entry = commits.find(({ commit }) => commit.sha === evidence.commit);
    if (entry) {
      visible.push(entry);
    }
  }
  timeline.replaceChildren(
    ...visible.map(({ commit, events }, index) =>
      commitItem(
        commit,
        events,
        index === 0,
        commit.sha === evidence?.commit ? evidence.id : undefined
      )
    )
  );
  if (!commits.length) {
    timeline.append(make('p', 'empty', t('none')));
  } else if (commits.length > visible.length) {
    timeline.append(
      make(
        'p',
        'empty',
        `Showing ${visible.length} of ${commits.length} commits.`
      )
    );
  }
}

function renderHotspots() {
  const container = byId('hotspots');
  const rows = report.hotspots.slice(0, 6);
  const max = Math.max(1, ...rows.map(({ changes }) => changes));
  container.replaceChildren();
  for (const { path, changes } of rows) {
    const item = make('div', 'hotspot');
    const row = make('div', 'hotspot-row');
    row.append(make('code', '', path), make('span', '', String(changes)));
    const bar = make('div', 'bar');
    bar.setAttribute('aria-hidden', 'true');
    const fill = make('span', '');
    fill.style.width = `${(changes / max) * 100}%`;
    bar.append(fill);
    item.append(row, bar);
    container.append(item);
  }
  if (!rows.length) {
    container.append(make('p', 'empty', t('none')));
  }
}

function renderCoupling() {
  const container = byId('coupling');
  const rows = report.coupling.slice(0, 5);
  container.replaceChildren();
  for (const { files, commits } of rows) {
    const item = make('div', 'coupling-row');
    const paths = make('span', 'pair');
    paths.append(make('code', '', files[0]), make('code', '', files[1]));
    item.append(paths, make('span', 'count', String(commits)));
    container.append(item);
  }
  if (!rows.length) {
    container.append(make('p', 'empty', t('none')));
  }
}

function evidenceLink(evidence) {
  const event = byCommit
    .get(evidence.commit)
    ?.find(({ id }) => id === evidence.id);
  const label = event ? changeLabel(event) : evidence.path;
  const link = make(
    'a',
    'evidence-link',
    `${evidence.commit.slice(0, 8)} · ${label}`
  );
  link.href = `#commit-${evidence.commit}`;
  link.addEventListener('click', (click) => {
    click.preventDefault();
    filter.value = '';
    renderTimeline(evidence);
    const target = byId(`commit-${evidence.commit}`);
    if (target) {
      target.open = true;
      const row =
        target.querySelector('[data-evidence]') ||
        target.querySelector('summary');
      row.focus();
      row.scrollIntoView({ block: 'center' });
    }
  });
  return link;
}

function renderPatterns() {
  const container = byId('patterns');
  const rows = report.suggestions.slice(0, 10);
  container.replaceChildren();
  for (const { patternId, evidence, message } of rows) {
    const card = make('div', 'pattern');
    const count =
      report.repeatedPatterns.find(({ id }) => id === patternId)?.count ??
      evidence.length;
    const links = make('div', 'evidence-links');
    for (const entry of evidence.slice(0, 10)) {
      links.append(evidenceLink(entry));
    }
    card.append(
      make('strong', '', `${count} occurrences`),
      make('p', '', message),
      links
    );
    container.append(card);
  }
  if (!rows.length) {
    container.append(make('p', 'empty', t('none')));
  }
}

function notice(message) {
  const status = byId('notice');
  status.textContent = message;
  status.hidden = !message;
}

function show(next, name) {
  report = next;
  byCommit = eventsByCommit(next.events);
  filter.value = '';
  byId('report-name').textContent = name;
  notice(report.truncated ? t('truncated') : '');
  const values = [
    ['commits', report.commits.length],
    ['changes', report.events.length],
    ['hotspots', report.hotspots.length],
    ['patterns', report.repeatedPatterns.length],
  ];
  byId('metrics').replaceChildren(
    ...values.map(([key, value]) => {
      const metric = make('div', 'metric');
      metric.append(make('dt', '', t(key)), make('dd', '', String(value)));
      return metric;
    })
  );
  byId('limits').replaceChildren(
    ...report.limitations.slice(0, 10).map((limit) => make('li', '', limit))
  );
  renderTimeline();
  renderHotspots();
  renderCoupling();
  renderPatterns();
}

function showSample() {
  show(sample, 'Formatting utilities');
}

async function openReport() {
  const request = ++selection;
  const [file] = fileInput.files;
  fileInput.value = '';
  if (!file) {
    return;
  }
  try {
    if (file.size > 8_388_608) {
      throw new Error('File too large');
    }
    const candidate = JSON.parse(await file.text());
    if (!isReport(candidate)) {
      throw new Error('Invalid report');
    }
    if (request === selection) {
      show(candidate, file.name);
    }
  } catch {
    if (request === selection) {
      notice(t('invalid'));
    }
  }
}

mountDocument(byId('report-actions'), layout, {
  onAction({ source }) {
    if (source === 'upload') {
      fileInput.click();
    } else if (source === 'sample') {
      selection++;
      showSample();
    }
  },
});
filter.addEventListener('change', () => renderTimeline());
fileInput.addEventListener('change', openReport);
showSample();

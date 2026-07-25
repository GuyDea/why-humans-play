import { describe, expect, it } from 'vitest';
import draftManagerRaw from '../drafts/draft-manager.component.ts?raw';
import discoverRaw from '../discover/discover-page.ts?raw';
import topicsRaw from '../topics/topics-page.ts?raw';
import fullRunRaw from '../topics/full-run-panel.ts?raw';
import pipelineRaw from '../pipeline/pipeline-page.ts?raw';
import lessonsPageRaw from '../lessons/lessons-page.ts?raw';
import lessonsPanelRaw from '../lessons/lessons-panel.ts?raw';
import agentConsoleRaw from '../panels/agent-console.ts?raw';
import welcomeRaw from '../onboarding/welcome-page.ts?raw';
import appHtmlRaw from '../app.html?raw';
import { HELP_FULLRUN, HELP_MASTHEAD, HELP_PAGES } from './help-content';

function templateIds(...raws: string[]): Set<string> {
  const ids = new Set<string>();
  for (const raw of raws) {
    for (const match of raw.matchAll(/appHelpTarget="([^"]+)"/gu)) ids.add(match[1]);
  }
  return ids;
}

const scopes = [
  { name: 'studio', ids: HELP_PAGES['/'].components.map((c) => c.id), raws: [draftManagerRaw] },
  { name: 'discover', ids: HELP_PAGES['/discover'].components.map((c) => c.id), raws: [discoverRaw] },
  { name: 'topics', ids: HELP_PAGES['/topics'].components.map((c) => c.id), raws: [topicsRaw] },
  { name: 'pipeline', ids: HELP_PAGES['/pipeline'].components.map((c) => c.id), raws: [pipelineRaw] },
  {
    name: 'lessons',
    ids: HELP_PAGES['/lessons'].components.map((c) => c.id),
    raws: [lessonsPageRaw, lessonsPanelRaw],
  },
  { name: 'console', ids: HELP_PAGES['/console'].components.map((c) => c.id), raws: [agentConsoleRaw] },
  { name: 'welcome', ids: HELP_PAGES['/welcome'].components.map((c) => c.id), raws: [welcomeRaw] },
  { name: 'masthead', ids: [...HELP_MASTHEAD].map((c) => c.id), raws: [appHtmlRaw] },
  { name: 'fullrun', ids: [...HELP_FULLRUN].map((c) => c.id), raws: [fullRunRaw] },
];

describe('help target coverage', () => {
  for (const scope of scopes) {
    it(`matches content ids to template targets for ${scope.name}`, () => {
      expect(new Set(scope.ids).size).toBe(scope.ids.length); // unique within scope
      expect(templateIds(...scope.raws)).toEqual(new Set(scope.ids)); // two-way
    });
  }
});

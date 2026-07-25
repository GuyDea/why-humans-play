import { describe, expect, it } from 'vitest';
import {
  EDITORIAL_METHOD,
  HELP_FULLRUN,
  HELP_GLOSSARY,
  HELP_MASTHEAD,
  HELP_PAGES,
  HELP_ROUTES,
  findHelpComponent,
  type HelpComponent,
} from './help-content';
import {
  WELCOME_PRINCIPLES,
  WELCOME_SKILL_POINTERS,
  WELCOME_STAGES,
} from '../onboarding/welcome-content';

function allComponents(): HelpComponent[] {
  return [
    ...HELP_ROUTES.flatMap((route) => HELP_PAGES[route].components),
    ...HELP_MASTHEAD,
    ...HELP_FULLRUN,
  ];
}

describe('Help content boundary', () => {
  it('provides a titled goal for every application route', () => {
    expect(Object.keys(HELP_PAGES)).toEqual(HELP_ROUTES);
    for (const route of HELP_ROUTES) {
      expect(HELP_PAGES[route].title.trim()).not.toBe('');
      expect(HELP_PAGES[route].goal.trim()).not.toBe('');
    }
  });

  it('gives every help component a unique id, title and summary', () => {
    const components = allComponents();
    const ids = components.map((component) => component.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const component of components) {
      expect(component.id).toMatch(/^[a-z]+\.[a-z]+$/u);
      expect(component.title.trim()).not.toBe('');
      expect(component.summary.trim()).not.toBe('');
      expect(Array.isArray(component.controls)).toBe(true);
    }
  });

  it('resolves any component by id and rejects unknown ids', () => {
    const components = allComponents();
    if (components.length > 0) {
      expect(findHelpComponent(components[0].id)).toBe(components[0]);
    }
    expect(findHelpComponent('does.notexist')).toBeUndefined();
  });

  it('defines every planned glossary term as a workbench concept', () => {
    expect(HELP_GLOSSARY.map((entry) => entry.term)).toEqual([
      'beat',
      'architecture',
      'gate',
      'package',
      'candidate board',
      'handoff',
      'promote',
      'milestone',
      'decision',
      'lesson',
      'reconcile',
    ]);
    for (const entry of HELP_GLOSSARY) {
      expect(entry.definition.trim()).not.toBe('');
    }
  });

  it('points editorial method to both repository skills without app-owned rules', () => {
    expect(EDITORIAL_METHOD.summary).toContain(
      'app does not contain those rules',
    );
    expect(EDITORIAL_METHOD.skills).toEqual([
      expect.objectContaining({
        name: 'choosing-whp-video-topic',
        path: '.agents/skills/choosing-whp-video-topic/SKILL.md',
      }),
      expect.objectContaining({
        name: 'writing-whp-youtube-scripts',
        path: '.agents/skills/writing-whp-youtube-scripts/SKILL.md',
      }),
    ]);
  });

  it('guards all Help and Welcome copy against editorial-rule imperatives', () => {
    // Both onboarding surfaces are boundary-protected: the app explains
    // workbench mechanics and never encodes editorial method.
    const copy = JSON.stringify({
      pages: HELP_PAGES,
      masthead: HELP_MASTHEAD,
      fullRun: HELP_FULLRUN,
      glossary: HELP_GLOSSARY,
      editorialMethod: EDITORIAL_METHOD,
      welcomeStages: WELCOME_STAGES,
      welcomePrinciples: WELCOME_PRINCIPLES,
      welcomeSkillPointers: WELCOME_SKILL_POINTERS,
    }).toLowerCase();

    // Keep this denylist explicit: additions to Help or Welcome must describe
    // mechanics, never smuggle script-quality instructions into the app.
    const editorialRuleDenylist = [
      /\byou should\b/u,
      /\bmake sure to\b/u,
      /\bthe (?:topic|hook|architecture|script) (?:should|must)\b/u,
      /\b(?:write|choose|make) (?:a|the|your) (?:good|better|strong) (?:topic|hook|architecture|script)\b/u,
    ];

    for (const denied of editorialRuleDenylist) {
      expect(copy).not.toMatch(denied);
    }
  });
});

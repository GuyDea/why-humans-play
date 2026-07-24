import '@angular/compiler';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';

describe('Studio routes', () => {
  it('routes the studio, shared-history console, topic workbench, pipeline, and lessons pages', () => {
    expect(routes.slice(0, 5).map((route) => route.path)).toEqual([
      '',
      'console',
      'topics',
      'pipeline',
      'lessons',
    ]);
    expect(routes[0]?.component?.name).toBe('StudioPage');
    expect(routes[1]?.component?.name).toBe('AgentConsolePage');
    expect(routes[2]?.component?.name).toBe('TopicsPage');
    expect(routes[3]?.component?.name).toBe('PipelinePage');
    expect(routes[4]?.component?.name).toBe('LessonsPage');
  });

  it('renders persistent Studio, Topics, Pipeline, and Console navigation around the router outlet', () => {
    const template = readFileSync('src/app/app.html', 'utf8');

    expect(template).toContain('routerLink="/"');
    expect(template).toContain('routerLink="/topics"');
    expect(template).toContain('routerLink="/pipeline"');
    expect(template).toContain('routerLink="/lessons"');
    expect(template).toContain('routerLink="/console"');
    expect(template).toContain('<router-outlet');
  });

  it('mounts the brief, findings, and parking-lot panels in the studio right rail', () => {
    const studio = readFileSync(
      'src/app/drafts/draft-manager.component.ts',
      'utf8',
    );

    expect(studio).toContain('<app-brief-panel');
    expect(studio).toContain('<app-findings-panel');
    expect(studio).toContain('<app-parking-lot');
  });
});

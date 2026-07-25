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

  it('resolves the AI-first Discover route to its standalone component', () => {
    const discover = routes.find((route) => route.path === 'discover');

    expect(discover).toBeDefined();
    expect(discover?.component?.name).toBe('DiscoverPage');
  });

  it('renders persistent Studio, Discover, Topics, Pipeline, and Console navigation around the router outlet', () => {
    const template = readFileSync('src/app/app.html', 'utf8');

    expect(template).toContain('routerLink="/"');
    expect(template).toContain('routerLink="/discover"');
    expect(template).toContain('routerLink="/topics"');
    expect(template).toContain('routerLink="/pipeline"');
    expect(template).toContain('routerLink="/lessons"');
    expect(template).toContain('routerLink="/console"');
    expect(template).toContain('<router-outlet');
    // Discover is the AI-first front door: first link after Studio.
    expect(template.indexOf('routerLink="/discover"'))
      .toBeLessThan(template.indexOf('routerLink="/topics"'));
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

describe('keep-alive route flags', () => {
  const keepAlivePaths = ['', 'console', 'topics', 'pipeline', 'lessons', 'discover'];

  it('flags the working tabs keepAlive and excludes welcome and the wildcard', () => {
    for (const path of keepAlivePaths) {
      const route = routes.find((r) => r.path === path);
      expect(route, `route ${path}`).toBeTruthy();
      expect(route?.data?.['keepAlive'], `keepAlive on ${path}`).toBe(true);
    }
    expect(routes.find((r) => r.path === 'welcome')?.data?.['keepAlive'])
      .toBeUndefined();
    expect(routes.find((r) => r.path === '**')?.data?.['keepAlive'])
      .toBeUndefined();
  });
});

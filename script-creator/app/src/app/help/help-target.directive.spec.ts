import '@angular/compiler';
import {
  Component,
  createComponent,
  provideZonelessChangeDetection,
  ɵresolveComponentResources,
  type ApplicationRef,
  type ComponentRef,
} from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HelpModeService } from './help-mode.service';
import { HelpTargetDirective } from './help-target.directive';

@Component({
  selector: 'app-help-target-host',
  standalone: true,
  imports: [HelpTargetDirective],
  template: `<section appHelpTarget="masthead.nav"><button>Real control</button></section>`,
})
class HostComponent {}

interface Mounted {
  application: ApplicationRef;
  component: ComponentRef<HostComponent>;
  root: HTMLElement;
  service: HelpModeService;
  tick(): void;
  destroy(): void;
}

const mounted: Mounted[] = [];

afterEach(() => {
  while (mounted.length > 0) mounted.pop()?.destroy();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function mount(): Promise<Mounted> {
  await ɵresolveComponentResources(async (url) => url);
  const application = await createApplication({
    providers: [provideZonelessChangeDetection(), provideRouter([])],
  });
  const root = document.createElement('app-help-target-host');
  document.body.append(root);
  const component = createComponent(HostComponent, {
    environmentInjector: application.injector,
    hostElement: root,
  });
  application.attachView(component.hostView);
  const view: Mounted = {
    application,
    component,
    root,
    service: application.injector.get(HelpModeService),
    tick: () => {
      application.tick();
      component.changeDetectorRef.detectChanges();
    },
    destroy: () => {
      application.detachView(component.hostView);
      component.destroy();
      application.destroy();
      root.remove();
    },
  };
  view.tick();
  mounted.push(view);
  return view;
}

function section(view: Mounted): HTMLElement {
  return view.root.querySelector('section') as HTMLElement;
}

describe('HelpTargetDirective', () => {
  it('shows no cue until help mode is active', async () => {
    const view = await mount();
    expect(section(view).querySelector('.help-target-cue')).toBeNull();
    expect(section(view).classList.contains('help-target')).toBe(false);
  });

  it('adds an outline and a labelled cue when active, and selects on cue click', async () => {
    const view = await mount();
    const selectSpy = vi.spyOn(view.service, 'select');
    view.service.activate();
    view.tick();

    const host = section(view);
    expect(host.classList.contains('help-target')).toBe(true);
    const cue = host.querySelector<HTMLButtonElement>('.help-target-cue')!;
    expect(cue).not.toBeNull();
    expect(cue.getAttribute('type')).toBe('button');
    expect(cue.getAttribute('aria-label')).toBe('Explain Workbench navigation');

    cue.click();
    expect(selectSpy).toHaveBeenCalledWith('masthead.nav');
  });

  it('reflects the selected id with a stronger outline class', async () => {
    const view = await mount();
    view.service.activate();
    view.service.select('masthead.nav');
    view.tick();
    expect(section(view).classList.contains('help-target--selected')).toBe(true);
  });

  it('removes the cue and classes when help mode turns off', async () => {
    const view = await mount();
    view.service.activate();
    view.tick();
    view.service.deactivate();
    view.tick();
    const host = section(view);
    expect(host.querySelector('.help-target-cue')).toBeNull();
    expect(host.classList.contains('help-target')).toBe(false);
  });
});

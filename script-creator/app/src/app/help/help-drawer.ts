import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, type Subscription } from 'rxjs';
import {
  EDITORIAL_METHOD,
  HELP_GLOSSARY,
  HELP_PAGES,
  helpRoute,
} from './help-content';
import { HelpModeService } from './help-mode.service';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

@Component({
  selector: 'app-help-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      id="script-creator-help"
      class="help-drawer"
      aria-labelledby="help-title"
    >
        <header class="help-drawer-header">
          <div>
            <p>Script Creator reference</p>
            <h2 id="help-title">Help</h2>
            <p class="help-mode-hint">Help mode is on — click any ? to explain a region.</p>
          </div>
          <button
            class="help-close"
            type="button"
            aria-label="Close help"
            (click)="requestClose()"
          >
            <span aria-hidden="true">×</span>
            <span class="help-close-label">Close help</span>
          </button>
        </header>

        <div class="help-drawer-scroll">
          <section
            class="help-topic"
            data-testid="help-topic"
            aria-live="polite"
            aria-atomic="true"
          >
            @if (selectedComponent(); as component) {
              <div data-testid="help-component">
                <p>This component</p>
                <h3>{{ component.title }}</h3>
                <p>{{ component.summary }}</p>
                @if (component.controls.length > 0) {
                  <ul class="help-controls">
                    @for (line of component.controls; track line) {
                      <li>{{ line }}</li>
                    }
                  </ul>
                }
                @if (component.unlockedBy) {
                  <p class="help-gate">
                    <span>Unlocked by</span> {{ component.unlockedBy }}
                  </p>
                }
                <button
                  type="button"
                  class="help-overview-link"
                  (click)="help.clear()"
                >
                  ← Page overview
                </button>
              </div>
            } @else {
              <p>On this page</p>
              <h3>{{ page().title }}</h3>
              <p>{{ page().goal }}</p>
            }
          </section>

          <section class="help-glossary" aria-labelledby="glossary-heading">
            <div class="help-section-heading">
              <p>Workbench language</p>
              <h3 id="glossary-heading">Glossary</h3>
            </div>
            <dl>
              @for (entry of glossary; track entry.term) {
                <div>
                  <dt>{{ entry.term }}</dt>
                  <dd>{{ entry.definition }}</dd>
                </div>
              }
            </dl>
          </section>

          <section class="help-method" aria-labelledby="method-heading">
            <div class="help-section-heading">
              <p>Method owners</p>
              <h3 id="method-heading">Editorial method</h3>
            </div>
            <p>{{ editorialMethod.summary }}</p>
            <dl>
              @for (skill of editorialMethod.skills; track skill.name) {
                <div>
                  <dt>{{ skill.name }}</dt>
                  <dd>
                    <span>{{ skill.owns }}</span>
                    <code>{{ skill.path }}</code>
                  </dd>
                </div>
              }
            </dl>
          </section>
        </div>
    </aside>
  `,
})
export class HelpDrawer implements AfterViewInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly routeState = signal(helpRoute(this.router.url));
  private readonly navigationSubscription: Subscription;

  protected readonly help = inject(HelpModeService);
  protected readonly selectedComponent = this.help.selected;
  protected readonly page = computed(() => HELP_PAGES[this.routeState()]);
  protected readonly glossary = HELP_GLOSSARY;
  protected readonly editorialMethod = EDITORIAL_METHOD;

  constructor() {
    this.navigationSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    ).subscribe((event) => {
      this.routeState.set(helpRoute(event.urlAfterRedirects));
    });
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.focusableElements()[0]?.focus());
  }

  ngOnDestroy(): void {
    this.navigationSubscription.unsubscribe();
  }

  @HostListener('document:keydown', ['$event'])
  protected handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
    }
  }

  protected requestClose(): void {
    this.host.nativeElement.dispatchEvent(new CustomEvent('helpClose', {
      bubbles: true,
    }));
  }

  private focusableElements(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        FOCUSABLE_SELECTOR,
      ),
    ).filter((element) => element.getAttribute('aria-hidden') !== 'true');
  }
}

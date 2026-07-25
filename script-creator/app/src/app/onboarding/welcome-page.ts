import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HelpTargetDirective } from '../help/help-target.directive';
import { OnboardingState } from './onboarding-state';
import {
  WELCOME_PRINCIPLES,
  WELCOME_SKILL_POINTERS,
  WELCOME_STAGES,
} from './welcome-content';

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [RouterLink, HelpTargetDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="welcome-page">
      <header class="welcome-hero">
        <div>
          <p class="eyebrow">Workbench orientation</p>
          <h1>Welcome to Script Studio</h1>
        </div>
        <p class="hero-copy">
          Follow an episode from a durable topic run to the repository
          milestones you explicitly approve.
        </p>
      </header>

      <section
        class="pipeline-map"
        aria-labelledby="pipeline-map-heading"
        appHelpTarget="welcome.mentalmodel"
      >
        <div class="section-heading">
          <p>One episode, five surfaces</p>
          <h2 id="pipeline-map-heading">The pipeline mental model</h2>
        </div>
        <ol>
          @for (stage of stages; track stage.name; let index = $index) {
            <li>
              <span class="stage-index">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              <strong>{{ stage.name }}</strong>
              <span>{{ stage.description }}</span>
            </li>
          }
        </ol>
      </section>

      <section class="welcome-grid">
        <article
          class="checklist-card"
          aria-labelledby="checklist-heading"
          appHelpTarget="welcome.checklist"
        >
          <div class="section-heading">
            <p>Live progress</p>
            <h2 id="checklist-heading">First episode checklist</h2>
          </div>

          @if (state.error()) {
            <p class="load-alert" role="alert">
              Progress is unavailable. {{ state.error() }}
            </p>
          }

          <ol
            class="checklist"
            data-testid="onboarding-checklist"
            aria-live="polite"
            [attr.aria-busy]="state.loading()"
          >
            @for (step of state.steps(); track step.id; let index = $index) {
              <li
                data-testid="onboarding-step"
                [attr.data-state]="step.done ? 'done' : 'pending'"
              >
                <span class="status-mark" aria-hidden="true">
                  {{ step.done ? '✓' : String(index + 1).padStart(2, '0') }}
                </span>
                <span class="step-copy">
                  <strong>{{ step.label }}</strong>
                  <span>{{ step.detail }}</span>
                </span>
                <a
                  [routerLink]="step.href"
                  [attr.aria-label]="'Go to ' + step.label"
                >Go</a>
              </li>
            }
          </ol>

          @if (state.dismissed()) {
            <p class="dismissed-note" role="status">
              Welcome will stay available in the masthead.
            </p>
          } @else {
            <button type="button" (click)="state.dismiss()">
              Don't show this automatically
            </button>
          }
        </article>

        <article
          class="principles-card"
          aria-labelledby="principles-heading"
          appHelpTarget="welcome.boundaries"
        >
          <div class="section-heading">
            <p>Control boundaries</p>
            <h2 id="principles-heading">How this workbench behaves</h2>
          </div>
          <ul class="principles">
            @for (principle of principles; track principle.title) {
              <li>
                <strong>{{ principle.title }}</strong>
                <span>{{ principle.description }}</span>
              </li>
            }
          </ul>

          <div class="skill-pointers">
            <h3>Editorial method</h3>
            <p>
              The app points to the owners of editorial method and does not
              duplicate their rules.
            </p>
            <dl>
              @for (skill of skillPointers; track skill.name) {
                <div>
                  <dt>{{ skill.name }}</dt>
                  <dd>
                    {{ skill.purpose }}
                    <code>{{ skill.path }}</code>
                  </dd>
                </div>
              }
            </dl>
          </div>
        </article>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .welcome-page {
      display: grid;
      gap: clamp(1.5rem, 4vw, 3rem);
      min-height: calc(100vh - 3.75rem);
      padding: clamp(1.25rem, 4vw, 3.5rem);
    }

    .welcome-hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.7fr);
      align-items: end;
      gap: 2rem;
      border-bottom: 3px solid var(--whp-ink);
      padding-bottom: 1.35rem;
    }

    h1,
    h2,
    h3,
    p {
      margin: 0;
    }

    h1,
    h2 {
      font-family: var(--whp-font-editor);
      font-weight: 520;
      letter-spacing: -0.025em;
    }

    h1 {
      max-width: 15ch;
      font-size: clamp(2.3rem, 6vw, 5.5rem);
      line-height: 0.95;
    }

    h2 {
      font-size: clamp(1.45rem, 2.6vw, 2.2rem);
    }

    .eyebrow,
    .section-heading > p {
      margin-bottom: 0.45rem;
      color: var(--whp-accent);
      font-size: 0.64rem;
      font-weight: 850;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .hero-copy {
      max-width: 46ch;
      color: var(--whp-muted);
      font-family: var(--whp-font-editor);
      font-size: clamp(1rem, 1.7vw, 1.25rem);
      line-height: 1.55;
    }

    .pipeline-map {
      display: grid;
      gap: 1rem;
    }

    .pipeline-map ol {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .pipeline-map li {
      position: relative;
      display: grid;
      align-content: start;
      gap: 0.45rem;
      min-height: 9rem;
      border-block: 1px solid var(--whp-line-strong);
      border-left: 1px solid var(--whp-line-strong);
      padding: 1rem;
      background: var(--whp-surface);
    }

    .pipeline-map li:last-child {
      border-right: 1px solid var(--whp-line-strong);
      box-shadow: inset 0 3px var(--whp-accent);
    }

    .pipeline-map li > strong {
      font-family: var(--whp-font-editor);
      font-size: 1.15rem;
      font-weight: 560;
    }

    .pipeline-map li > span:last-child {
      color: var(--whp-muted);
      font-size: 0.72rem;
      line-height: 1.5;
    }

    .stage-index {
      color: var(--whp-accent);
      font-family: var(--whp-font-mono);
      font-size: 0.6rem;
    }

    .welcome-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(20rem, 0.85fr);
      gap: 1.25rem;
      align-items: start;
    }

    .checklist-card,
    .principles-card {
      border: 1px solid var(--whp-line-strong);
      padding: clamp(1rem, 2.5vw, 1.75rem);
      background: var(--whp-panel);
    }

    .checklist {
      display: grid;
      gap: 0;
      margin: 1.25rem 0 0;
      padding: 0;
      list-style: none;
    }

    .checklist li {
      display: grid;
      grid-template-columns: 2.2rem minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.8rem;
      border-top: 1px solid var(--whp-line);
      padding: 0.85rem 0;
    }

    .checklist li:last-child {
      border-bottom: 1px solid var(--whp-line);
    }

    .status-mark {
      display: grid;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--whp-line-strong);
      border-radius: 50%;
      color: var(--whp-muted);
      font-family: var(--whp-font-mono);
      font-size: 0.62rem;
      place-items: center;
    }

    [data-state='done'] .status-mark {
      border-color: var(--whp-success);
      color: var(--whp-success);
      background: var(--whp-success-tint);
    }

    .step-copy {
      display: grid;
      gap: 0.2rem;
    }

    .step-copy > strong {
      font-size: 0.82rem;
    }

    .step-copy > span {
      color: var(--whp-muted);
      font-size: 0.7rem;
      line-height: 1.45;
    }

    .checklist a,
    .checklist-card button {
      border: 1px solid var(--whp-line-strong);
      padding: 0.45rem 0.65rem;
      color: var(--whp-ink);
      background: var(--whp-surface);
      cursor: pointer;
      font-size: 0.68rem;
      font-weight: 820;
      text-decoration: none;
    }

    .checklist a:hover,
    .checklist-card button:hover {
      border-color: var(--whp-accent);
      color: var(--whp-accent);
    }

    .checklist-card > button {
      margin-top: 1rem;
    }

    .dismissed-note,
    .load-alert {
      margin-top: 1rem;
      color: var(--whp-muted);
      font-size: 0.7rem;
    }

    .load-alert {
      border-left: 3px solid var(--whp-accent);
      padding: 0.7rem;
      background: var(--whp-accent-tint);
    }

    .principles {
      display: grid;
      gap: 1rem;
      margin: 1.25rem 0 0;
      padding: 0;
      list-style: none;
    }

    .principles li {
      display: grid;
      gap: 0.3rem;
      border-left: 3px solid var(--whp-ink);
      padding-left: 0.8rem;
    }

    .principles strong {
      font-family: var(--whp-font-editor);
      font-size: 1rem;
    }

    .principles span,
    .skill-pointers p,
    .skill-pointers dd {
      color: var(--whp-muted);
      font-size: 0.72rem;
      line-height: 1.5;
    }

    @media (max-width: 58rem) {
      .welcome-hero,
      .welcome-grid {
        grid-template-columns: 1fr;
      }

      .pipeline-map ol {
        grid-template-columns: 1fr;
      }

      .pipeline-map li {
        min-height: auto;
        border-right: 1px solid var(--whp-line-strong);
        border-bottom: 0;
      }

      .pipeline-map li:last-child {
        border-bottom: 1px solid var(--whp-line-strong);
      }
    }

    @media (max-width: 34rem) {
      .checklist li {
        grid-template-columns: 2.2rem minmax(0, 1fr);
      }

      .checklist a {
        grid-column: 2;
        justify-self: start;
      }
    }
  `,
})
export class WelcomePage implements OnInit {
  protected readonly state = inject(OnboardingState);
  protected readonly stages = WELCOME_STAGES;
  protected readonly principles = WELCOME_PRINCIPLES;
  protected readonly skillPointers = WELCOME_SKILL_POINTERS;
  protected readonly String = String;

  ngOnInit(): void {
    void this.state.load();
  }
}

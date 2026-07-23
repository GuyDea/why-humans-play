import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { DraftManagerComponent } from './drafts/draft-manager.component';
import {
  AgentConsole,
  AgentConsoleModel,
} from './panels/agent-console';
import {
  STUDIO_SESSION,
} from './studio-session';

@Component({
  selector: 'app-studio-page',
  standalone: true,
  imports: [DraftManagerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-draft-manager
      [client]="session.client"
      [session]="session"
    />
  `,
})
export class StudioPage {
  protected readonly session = inject(STUDIO_SESSION);
}

@Component({
  selector: 'app-agent-console-page',
  standalone: true,
  imports: [AgentConsole],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="console-page">
      <header>
        <p>Durable operation history</p>
        <h1>Agent console</h1>
      </header>
      <app-agent-console
        [client]="session.client"
        [model]="model"
      />
    </main>
  `,
  styles: `
    :host {
      display: block;
    }

    .console-page {
      display: grid;
      gap: 1rem;
      min-height: calc(100vh - 3.75rem);
      padding: clamp(1rem, 3vw, 2.5rem);
    }

    header {
      display: grid;
      gap: 0.2rem;
    }

    h1,
    p {
      margin: 0;
    }

    h1 {
      color: var(--whp-ink);
      font-family: var(--whp-font-editor);
      font-size: clamp(1.6rem, 3vw, 2.5rem);
      font-weight: 500;
    }

    p {
      color: var(--whp-muted);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
  `,
})
export class AgentConsolePage {
  protected readonly session = inject(STUDIO_SESSION);
  protected readonly model = new AgentConsoleModel(this.session);
}

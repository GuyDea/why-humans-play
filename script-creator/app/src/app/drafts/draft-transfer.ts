import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from '@angular/core';
import type { DraftManager } from './draft-manager';

@Component({
  selector: 'app-draft-transfer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="transfer" aria-labelledby="transfer-heading">
      <div>
        <p class="eyebrow">Repository bridge</p>
        <h2 id="transfer-heading">Import & export</h2>
      </div>

      <details>
        <summary>Import narration Markdown</summary>
        <div class="details-body">
          <label for="import-markdown">
            Paste Markdown or choose a repository <code>.md</code> file
          </label>
          <textarea
            #markdown
            id="import-markdown"
            rows="6"
            placeholder="# Episode title&#10;&#10;## 1. Opening&#10;&#10;> Narration"
          ></textarea>
          <div class="row">
            <label class="file-action">
              Choose file
              <input
                type="file"
                accept=".md,text/markdown,text/plain"
                (change)="pickFile($event, markdown)"
              />
            </label>
            @if (pickedFile()) {
              <small>{{ pickedFile() }}</small>
            }
          </div>
          @if (fileError()) {
            <p class="error" role="alert">{{ fileError() }}</p>
          }
          <button
            type="button"
            class="secondary"
            (click)="importMarkdown(markdown.value)"
          >
            Import draft
          </button>
        </div>
      </details>

      <div class="export">
        <button
          type="button"
          class="primary"
          [disabled]="!manager().activeDraft()"
          (click)="exportDraft()"
        >
          Export active draft
        </button>

        @if (manager().exportBlockedReasons().length > 0) {
          <div class="blocked" role="alert">
            <strong>Export is blocked</strong>
            <ul>
              @for (
                reason of manager().exportBlockedReasons();
                track $index
              ) {
                <li>{{ reason }}</li>
              }
            </ul>
          </div>
        }
        @if (manager().exportError()) {
          <p class="error" role="alert">{{ manager().exportError() }}</p>
        }

        @if (manager().exportedMarkdown(); as exported) {
          <label for="artifact-path">Repository artifact path</label>
          <input
            #artifactPath
            id="artifact-path"
            type="text"
            value="whp-youtube/drafts/"
            spellcheck="false"
          />
          <p class="hint">
            Writes are limited to <code>whp-youtube/topics/</code> and
            <code>whp-youtube/drafts/</code>.
          </p>
          <button
            type="button"
            class="secondary"
            (click)="writeArtifact(artifactPath.value)"
          >
            Write artifact
          </button>

          <details class="preview">
            <summary>Preview exported Markdown</summary>
            <pre>{{ exported }}</pre>
          </details>
        }

        @if (manager().artifactError()) {
          <p class="error" role="alert">{{ manager().artifactError() }}</p>
        }
        @if (manager().artifactConflict(); as conflict) {
          <div class="conflict" role="alert">
            <strong>Artifact changed outside Script Studio</strong>
            <p>Current hash: <code>{{ conflict.currentHash }}</code></p>
            @if (conflict.parked.length > 0) {
              <p>Parked copies: {{ conflict.parked.join(', ') }}</p>
            }
          </div>
        }
        @if (manager().artifactHash(); as hash) {
          <p class="success" role="status">
            Artifact written. CAS hash <code>{{ hash }}</code>
          </p>
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .transfer,
    .details-body,
    .export {
      display: grid;
      gap: 0.75rem;
    }

    h2,
    p,
    pre {
      margin: 0;
    }

    h2 {
      color: var(--whp-ink);
      font-size: 1rem;
    }

    .eyebrow {
      margin-bottom: 0.2rem;
      color: var(--whp-muted-soft);
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    details {
      border-top: 1px solid var(--whp-line-soft);
      padding-top: 0.7rem;
    }

    summary {
      color: var(--whp-muted);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 750;
    }

    .details-body {
      padding-top: 0.75rem;
    }

    label,
    .hint,
    small {
      color: var(--whp-muted);
      font-size: 0.72rem;
    }

    textarea,
    input[type="text"] {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid var(--whp-line-strong);
      border-radius: 0.25rem;
      background: var(--whp-surface);
      padding: 0.55rem 0.6rem;
      color: var(--whp-ink);
      font: inherit;
      font-size: 0.78rem;
    }

    textarea {
      resize: vertical;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 0.7rem;
    }

    .file-action {
      border-bottom: 1px solid currentColor;
      color: var(--whp-muted);
      cursor: pointer;
      font-weight: 700;
    }

    .file-action input {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      clip-path: inset(50%);
      white-space: nowrap;
    }

    button {
      justify-self: start;
      border-radius: 0.25rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      font: inherit;
      font-size: 0.75rem;
      font-weight: 750;
    }

    .primary {
      border: 1px solid var(--whp-accent);
      background: var(--whp-accent);
      color: var(--whp-ground);
    }

    .secondary {
      border: 1px solid var(--whp-line-strong);
      background: var(--whp-surface);
      color: var(--whp-ink);
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }

    .blocked,
    .conflict,
    .error,
    .success {
      padding: 0.65rem;
      font-size: 0.72rem;
      line-height: 1.45;
    }

    .blocked,
    .conflict {
      border-left: 3px solid var(--whp-accent);
      background: var(--whp-accent-tint);
      color: var(--whp-accent);
    }

    .blocked ul {
      margin: 0.35rem 0 0;
      padding-inline-start: 1rem;
    }

    .error {
      background: var(--whp-accent-tint);
      color: var(--whp-accent);
    }

    .success {
      border-left: 3px solid var(--whp-success);
      background: var(--whp-success-tint);
      color: var(--whp-success);
      overflow-wrap: anywhere;
    }

    code,
    pre {
      font-family: var(--whp-font-mono);
    }

    .preview pre {
      max-height: 12rem;
      overflow: auto;
      margin-top: 0.65rem;
      border: 1px solid var(--whp-line-soft);
      background: var(--whp-surface);
      padding: 0.65rem;
      font-size: 0.68rem;
      line-height: 1.45;
      white-space: pre-wrap;
    }

    input:focus-visible,
    textarea:focus-visible,
    summary:focus-visible,
    button:focus-visible,
    .file-action:focus-within {
      outline: 2px solid var(--whp-accent);
      outline-offset: 2px;
    }
  `,
})
export class DraftTransfer {
  readonly manager = input.required<DraftManager>();
  readonly pickedFile = signal<string | null>(null);
  readonly fileError = signal<string | null>(null);

  protected async pickFile(
    event: Event,
    target: HTMLTextAreaElement,
  ): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.fileError.set(null);
    try {
      target.value = await file.text();
      this.pickedFile.set(file.webkitRelativePath || file.name);
    } catch (error) {
      this.fileError.set(
        error instanceof Error ? error.message : 'The file could not be read.',
      );
    }
  }

  protected importMarkdown(markdown: string): void {
    void this.manager().importMarkdown(markdown);
  }

  protected exportDraft(): void {
    void this.manager().exportDraft();
  }

  protected writeArtifact(path: string): void {
    void this.manager().writeExportArtifact(path);
  }
}

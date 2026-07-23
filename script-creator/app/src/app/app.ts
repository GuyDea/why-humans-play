import { Component } from '@angular/core';
import { DaemonClient } from './api/client';
import { extractNonce } from './api/nonce';
import { DraftManagerComponent } from './drafts/draft-manager.component';

@Component({
  selector: 'app-root',
  imports: [DraftManagerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly nonce = extractNonce(globalThis.location);
  protected readonly client = new DaemonClient(
    globalThis.location.origin,
    () => this.nonce,
  );
}

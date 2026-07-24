import { runBrowserSweep } from './browser-sweep-harness.js';

async function runPlan6BrowserSweep(): Promise<void> {
  await runBrowserSweep(6);
}

void runPlan6BrowserSweep();

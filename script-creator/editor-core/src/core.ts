import { history } from 'prosemirror-history';
import type { Plugin } from 'prosemirror-state';
import { annotationPlugin } from './annotations.js';
import { lockGuardPlugin } from './lock-guard.js';
import { proposalPlugin } from './proposals.js';
import { revisionPlugin } from './revision.js';

export function corePlugins(): Plugin[] {
  return [revisionPlugin(), annotationPlugin(), proposalPlugin(), lockGuardPlugin(), history()];
}

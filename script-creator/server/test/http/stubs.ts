import type {
  DocumentHttpService,
  ValidatorHttpService,
} from '../../src/http/app.js';

function notConfigured(): never {
  throw new Error('document service is not configured in this test');
}

export const UNUSED_DOCUMENT_SERVICE: DocumentHttpService = {
  createDraft: notConfigured,
  getDraft: notConfigured,
  saveDraft: notConfigured,
  listRevisions: notConfigured,
  importMarkdown: notConfigured,
  exportMarkdown: notConfigured,
};

export const UNUSED_VALIDATOR_SERVICE: ValidatorHttpService = {
  validate: notConfigured,
};

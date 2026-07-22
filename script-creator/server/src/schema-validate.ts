import { Ajv } from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: false });

export function validateAgainstSchema(
  schema: Record<string, unknown>, text: string,
): { ok: true; value: unknown } | { ok: false; reason: string } {
  let value: unknown;
  try { value = JSON.parse(text); } catch (e) { return { ok: false, reason: `not JSON: ${String(e)}` }; }
  const validate = ajv.compile(schema);
  if (validate(value)) return { ok: true, value };
  return { ok: false, reason: ajv.errorsText(validate.errors) };
}

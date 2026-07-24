process.env['PLAN7_SWEEP'] = '1';

void import('./plan6-browser-sweep.js').catch((error: unknown) => {
  console.error(
    `FAILED — Plan 7 browser sweep loader: ${
      error instanceof Error ? error.stack : String(error)
    }`,
  );
  process.exitCode = 1;
});

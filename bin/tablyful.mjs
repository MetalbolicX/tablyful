#!/usr/bin/env node

// CLI entry point
import('./src/Cli/CliMain.res.mjs').then(module => {
  module.main();
});

#!/usr/bin/env node
/**
 * Release orchestrator for tablyful.
 *
 * Pipeline:
 *   1. Pre-flight checks (clean tree, correct branch, remote up-to-date)
 *   2. Run full test suite
 *   3. Apply pending changesets (version bump + CHANGELOG)
 *   4. Commit version bump
 *   5. Create git tag
 *   6. Build production bundle
 *   7. Verify dist/cli.mjs integrity
 *   8. Publish to npm
 *   9. Push commits and tags to remote
 *  10. Print success summary
 *
 * Usage:
 *   pnpm release
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = new URL("..", import.meta.url).pathname;

/**
 * Execute a shell command synchronously in the repository ROOT, optionally logging a label first.
 *
 * The command is run via execSync with stdio inherited from the parent process and cwd set to ROOT.
 *
 * @param {string} cmd - The command string to execute.
 * @param {string} [label] - Optional label to log before executing the command; logged only if truthy.
 * @returns {void}
 * @throws {Error} If execSync fails or the command exits with a non-zero status.
 */
const run = (cmd, label) => {
  if (label) log(label);
  execSync(cmd, { stdio: "inherit", cwd: ROOT });
};

/**
 * Execute a shell command synchronously in the repository ROOT directory and return its stdout.
 *
 * @param {string} cmd - The command string to execute.
 * @returns {string} The command's stdout as a trimmed string.
 * @throws {Error} If execSync fails or the command exits with a non-zero status.
 */
const capture = (cmd) => execSync(cmd, { cwd: ROOT }).toString().trim();

/**
 * Logs a formatted progress step to the console.
 *
 * Prints a blank line followed by a header in the form "[n/total] title"
 * and then a separator line consisting of 50 '─' characters.
 *
 * @param {number} n - The current step number (1-based).
 * @param {number} total - The total number of steps.
 * @param {string} title - A short title or description for the current step.
 * @returns {void}
 */
const step = (n, total, title) => {
  console.log(`\n[${n}/${total}] ${title}`);
  console.log("─".repeat(50));
};

/**
 * Logs a message to the console with a prefixed arrow and two leading spaces.
 *
 * @param {string} msg - The message to log.
 * @returns {void}
 */
const log = (msg) => console.log(`  → ${msg}`);

/**
 * Log an error message and terminate the process.
 *
 * Writes the given message to stderr (prefixed with a newline and a failure marker),
 * then exits the Node.js process with status code 1.
 *
 * @param {string} msg - The error message to display.
 * @returns {never} This function does not return; it exits the process.
 */
const abort = (msg) => {
  console.error(`\n  ✗ ${msg}`);
  process.exit(1);
};

/**
 * Logs a formatted success message to the console prefixed with a check mark.
 *
 * @param {string} msg - The message to log after the check mark.
 * @returns {void}
 */
const ok = (msg) => console.log(`  ✓ ${msg}`);

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 9;

// ---------------------------------------------------------------------------
// Step 1: Pre-flight checks
// ---------------------------------------------------------------------------
step(1, TOTAL_STEPS, "Pre-flight checks");

// 1a. Clean working tree
const gitStatus = capture("git status --porcelain");
if (gitStatus.length > 0) {
  console.error("\n  Uncommitted changes detected:");
  console.error(gitStatus);
  abort(
    "Working tree must be clean before releasing. Commit or stash your changes.",
  );
}
ok("Working tree is clean");

// 1b. Correct branch
const currentBranch = capture("git rev-parse --abbrev-ref HEAD");
const baseBranch = "main";
if (currentBranch !== baseBranch) {
  abort(
    `Must release from '${baseBranch}' branch. Currently on '${currentBranch}'.`,
  );
}
ok(`On branch '${baseBranch}'`);

// 1c. Remote is up to date
try {
  run("git fetch --quiet origin");
  const behind = capture(`git rev-list HEAD..origin/${baseBranch} --count`);
  if (parseInt(behind, 10) > 0) {
    abort(
      `Local branch is ${behind} commit(s) behind origin/${baseBranch}. Run 'git pull' first.`,
    );
  }
  ok("Remote is up to date");
} catch {
  // No remote configured — skip this check
  log("No remote configured, skipping remote sync check");
}

// 1d. Pending changesets exist
const changesetDir = resolve(ROOT, ".changeset");
const pendingChangesets = existsSync(changesetDir)
  ? (
      await import("node:fs/promises").then((fs) => fs.readdir(changesetDir))
    ).filter((f) => f.endsWith(".md") && f !== "README.md")
  : [];

if (pendingChangesets.length === 0) {
  abort(
    "No pending changesets found.\n\n" +
      "  Create one first with:  pnpm changeset\n" +
      "  Then commit it and re-run:  pnpm release",
  );
}
ok(`Found ${pendingChangesets.length} pending changeset(s)`);

// ---------------------------------------------------------------------------
// Step 2: Run full test suite
// ---------------------------------------------------------------------------
step(2, TOTAL_STEPS, "Running tests");

try {
  run("pnpm test", "pnpm test");
} catch {
  abort("Tests failed. Fix them before releasing.");
}
ok("All tests passed");

// ---------------------------------------------------------------------------
// Step 3: Apply pending changesets (version bump + CHANGELOG)
// ---------------------------------------------------------------------------
step(3, TOTAL_STEPS, "Applying changesets");

run("pnpm changeset:version", "pnpm changeset:version");

// Read the new version after changeset applied it
const pkg = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
const version = pkg.version;
ok(`Version bumped to ${version}`);

// ---------------------------------------------------------------------------
// Step 4: Commit version bump
// ---------------------------------------------------------------------------
step(4, TOTAL_STEPS, "Committing version bump");

run("git add -A", "git add -A");
run(`git commit -m "chore: release v${version}"`, `git commit`);
ok(`Committed: chore: release v${version}`);

// ---------------------------------------------------------------------------
// Step 5: Create git tag
// ---------------------------------------------------------------------------
step(5, TOTAL_STEPS, "Tagging release");

run(`git tag v${version}`, `git tag v${version}`);
ok(`Tag created: v${version}`);

// ---------------------------------------------------------------------------
// Step 6: Build production bundle
// ---------------------------------------------------------------------------
step(6, TOTAL_STEPS, "Building production bundle");

run("pnpm build", "pnpm build");
ok("Build succeeded");

// ---------------------------------------------------------------------------
// Step 7: Verify dist/cli.mjs integrity
// ---------------------------------------------------------------------------
step(7, TOTAL_STEPS, "Verifying dist/cli.mjs");

const distPath = resolve(ROOT, "dist", "cli.mjs");
if (!existsSync(distPath)) {
  abort("dist/cli.mjs not found after build.");
}

const firstLine = readFileSync(distPath, "utf8").split("\n")[0];
if (firstLine !== "#!/usr/bin/env node") {
  abort(
    `dist/cli.mjs is missing the shebang line.\n  First line: ${firstLine}`,
  );
}
ok("dist/cli.mjs exists and has correct shebang");

// ---------------------------------------------------------------------------
// Step 8: Publish to npm
// ---------------------------------------------------------------------------
step(8, TOTAL_STEPS, "Publishing to npm");

run("npm publish --access public", "npm publish");
ok(`Published tablyful@${version} to npm`);

// ---------------------------------------------------------------------------
// Step 9: Push commits and tags to remote
// ---------------------------------------------------------------------------
step(9, TOTAL_STEPS, "Pushing to remote");

try {
  run("git push", "git push");
  run("git push --tags", "git push --tags");
  ok("Pushed commits and tags to origin");
} catch {
  console.warn(
    "\n  Warning: git push failed (no remote configured?).\n" +
      "  Run manually:  git push && git push --tags",
  );
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log("\n" + "═".repeat(50));
console.log(`  tablyful v${version} released successfully!`);
console.log("═".repeat(50));
console.log(`\n  npm:  https://www.npmjs.com/package/tablyful/v/${version}`);
console.log(`  tag:  v${version}`);
console.log("\n  Next: create a changeset for your next feature with:");
console.log("        pnpm changeset\n");

 # Getting Started

 This guide explains how to install and run the tablyful CLI on another computer (Linux, macOS, or Windows). It covers Node.js prerequisites, different installation methods (global, one-shot with npx/pnpm dlx, local project install), how to verify the installation, and common troubleshooting tips.

 ## Prerequisites

 - Node.js 22 or newer is required. Verify your version:

 ```sh
 node -v
 ```

 If the version is older than 22, install a modern Node.js using one of the following:

 - macOS / Linux: use nvm (https://github.com/nvm-sh/nvm)

 ```sh
 # install nvm (follow the script from the repo)
 curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.6/install.sh | bash
 # restart your shell, then:
 nvm install 22
 nvm use 22
 ```

 - Windows: use the official Node.js installer from https://nodejs.org/ or nvm-windows (https://github.com/coreybutler/nvm-windows).

 ## Installation options

 Choose the option that best fits your workflow.

 Option A — Global install (convenient for frequent CLI usage)

 ```sh
 # npm (recommended)
 npm install -g tablyful

 # pnpm
 pnpm add -g tablyful

 # yarn
 yarn global add tablyful
 ```

 Notes:
 - On some Linux systems installing global npm packages may require elevated permissions. Prefer using nvm to avoid sudo, or configure npm's global directory per the npm docs.

 Option B — One-shot execution without global install (recommended for ad-hoc use)

 ```sh
 # npm (npx)
 npx tablyful@latest --help

 # pnpm (dlx)
 pnpm dlx tablyful@latest --help

 # yarn (dlx)
 yarn dlx tablyful@latest --help

 # bun (bunx)
 bunx tablyful@latest --help
 ```

 Option C — Local project install (when you want tablyful as a dev or project dependency)

 ```sh
 # inside your project directory
 npm install --save-dev tablyful
 # then run via npx or from node_modules/.bin
 npx tablyful --help
 ```

 Option D — Install from source (developer / contribute)

 ```sh
 # on the target machine
 git clone https://github.com/MetalbolicX/tablyful.git
 cd tablyful
 pnpm install
 pnpm build
 # execute the built CLI directly with node
 node dist/cli.mjs --help
 ```

 ## Verify the installation

 After installing (or when using npx/dlx), verify the CLI is available:

 ```sh
 tablyful --version
 tablyful --help
 ```

 If you used npx/dlx, prefix the commands accordingly (e.g. `npx tablyful@latest --version`).

 ## Running a quick example

 If you don't have example files on the target machine, you can download the sample input and try a simple conversion:

 ```sh
 curl -s https://raw.githubusercontent.com/MetalbolicX/tablyful/main/examples/cli/sample.json -o sample.json

 # convert to CSV (global install)
 tablyful sample.json --format csv

 # or using npx
 npx tablyful@latest sample.json --format csv
 ```

 Expected output:

 ```txt
 name,age,city
 Alice,30,NYC
 Bob,25,LA
 ```

 ## Copy your configuration

 If your project uses a `.tablyfulrc.json` file to define defaults, copy it to the target project root. Example copy commands:

 ```sh
 # from your machine to remote (replace user@host and path)
 scp .tablyfulrc.json user@host:/path/to/project/

 # or clone the repo that already contains it
 git clone <your-repo-url>
 ```

 The CLI also accepts an explicit config path with `--config ./path/to/.tablyfulrc.json`.

 ## Common issues & troubleshooting

 - "command not found" after global install: ensure the global npm binaries directory is on your PATH. Using nvm avoids most of these issues.
 - Permission errors when installing globally with npm: avoid `sudo` by using nvm or set up a user-level npm global directory as documented by npm.
 - Wrong Node.js version: `node -v` must be >= 22. Use nvm/nvm-windows to install and switch Node versions.
 - When running from source: if `node dist/cli.mjs` fails, make sure you ran `pnpm build` and that `dist/cli.mjs` exists.

 ## Next steps

 Now that the CLI is installed on the other computer, try the examples in the `examples/cli` folder, or read the [API Configuration Reference](/api-reference) and [Examples](/examples) pages for common workflows and flags.

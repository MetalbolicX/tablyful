import { spawnSync } from "node:child_process";

const cliPath = new URL("../../dist/cli.mjs", import.meta.url).pathname;

export type RunCliOptions = {
  args?: string[];
  input?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
};

export type RunCliResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export const runCli = ({ args = [], input, cwd, env }: RunCliOptions = {}): RunCliResult => {
  const result = spawnSync("node", [cliPath, ...args], {
    input,
    encoding: "utf8",
    cwd,
    env: { ...process.env, ...env },
  });

  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

export const sampleArrayOfArrays = JSON.stringify([
  ["name", "age"],
  ["Alice", 30],
  ["Bob", 25],
]);

export const sampleArrayOfObjects = JSON.stringify([
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
]);

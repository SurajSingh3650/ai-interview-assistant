import { spawnSync } from "node:child_process";

function hasCommand(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    stdio: "ignore",
    shell: process.platform === "win32"
  });

  return result.status === 0;
}

const hasCargo = hasCommand("cargo");
const hasRustc = hasCommand("rustc");

if (hasCargo && hasRustc) {
  process.exit(0);
}

const lines = [
  "",
  "Rust toolchain is required for Tauri builds.",
  "",
  `cargo: ${hasCargo ? "found" : "missing"}`,
  `rustc: ${hasRustc ? "found" : "missing"}`,
  "",
  "Install Rust with rustup, then restart the terminal:",
  "  Windows:",
  "    winget install Rustlang.Rustup",
  "  Or download:",
  "    https://rustup.rs",
  "",
  "After installation, verify:",
  "  cargo --version",
  "  rustc --version",
  "",
  "Then run again:",
  "  npm run tauri:build",
  ""
];

console.error(lines.join("\n"));
process.exit(1);

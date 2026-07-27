// Orchestrates the full data-layer population pipeline in order.
// Safe to re-run: every step is idempotent.
import { execFileSync } from "node:child_process";

const steps = [
  ["Seeding medicines", "scripts/seed/seed-medicines.ts"],
  ["Seeding pharmacy prices", "scripts/seed/seed-prices.ts"],
  ["Building image sourcing manifest", "scripts/seed/source-images.ts"],
  ["Uploading images to Storage", "scripts/seed/upload-images.ts"],
  ["Assigning medicine images", "scripts/seed/update-medicine-images.ts"],
  ["Verifying frontend data path", "scripts/seed/verify.ts"],
] as const;

for (const [label, script] of steps) {
  console.log(`\n=== ${label} (${script}) ===`);
  execFileSync("npx", ["tsx", script], { stdio: "inherit", env: process.env });
}

console.log("\nAll seed steps completed.");

import { rm } from "node:fs/promises";

export default async function globalSetup() {
  await rm("/tmp/ffm-playwright-db", {
    recursive: true,
    force: true,
  });
}

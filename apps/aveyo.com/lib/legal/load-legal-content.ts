import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadLegalContent(document: "privacy-policy" | "terms-of-service") {
  const filePath = join(process.cwd(), "lib/legal", `${document}.md`);
  return readFileSync(filePath, "utf8");
}

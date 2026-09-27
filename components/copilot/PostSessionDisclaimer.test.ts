import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

describe("POST_SESSION Informative Disclaimer Suite", () => {
  it("contém o disclaimer ético e informativo no PostSessionView", () => {
    const postSessionFilePath = path.join(
      process.cwd(),
      "components",
      "copilot",
      "PostSessionView.tsx"
    );
    const content = fs.readFileSync(postSessionFilePath, "utf-8");

    const expectedDisclaimer =
      "Sugestões e hipóteses geradas por IA para apoio reflexivo do profissional. Não constituem diagnóstico ou diretiva clínica.";

    assert.ok(
      content.includes(expectedDisclaimer),
      "O texto do disclaimer deve estar presente em PostSessionView.tsx"
    );
  });

  it("não contém termos determinísticos de diagnóstico médico como fato", () => {
    const postSessionFilePath = path.join(
      process.cwd(),
      "components",
      "copilot",
      "PostSessionView.tsx"
    );
    const content = fs.readFileSync(postSessionFilePath, "utf-8");

    assert.ok(
      content.includes("Não constituem diagnóstico"),
      "O texto deve explicitar que as hipóteses não constituem diagnóstico"
    );
  });
});

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Material = {
  id: string;
  title: string;
  source: string;
  filename: string | null;
  storage_path: string | null;
  created_at?: string;
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "indexing" | "done" | "error"
  >("idle");

  async function loadMaterials() {
    setError(null);
    const res = await fetch("/api/materials", { cache: "no-store" });
    const json = (await res.json()) as { materials: Material[] } | { error: string };
    if (!res.ok) {
      setError("error" in json ? json.error : "Falha ao carregar materiais");
      return;
    }
    if ("materials" in json) setMaterials(json.materials);
  }

  useEffect(() => {
    void loadMaterials();
  }, []);

  async function createMaterial(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/materials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, text, source: "manual" }),
      });
      const json = (await res.json()) as
        | { material: Material; chunks_created: number }
        | { error: string };
      if (!res.ok) {
        setError("error" in json ? json.error : "Falha ao criar material");
        return;
      }
      setTitle("");
      setText("");
      await loadMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar material");
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadMaterial(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError("Selecione um arquivo PDF ou DOCX.");
      return;
    }

    setUploadStatus("uploading");
    try {
      const fd = new FormData();
      if (uploadTitle.trim().length) fd.append("title", uploadTitle);
      fd.append("file", file);

      const res = await fetch("/api/materials/upload", { method: "POST", body: fd });
      setUploadStatus("indexing");

      const json: unknown = await res.json();
      const errorMessage =
        typeof json === "object" &&
        json &&
        "error" in json &&
        typeof (json as { error?: unknown }).error === "string"
          ? String((json as { error?: unknown }).error)
          : null;

      if (!res.ok) {
        setUploadStatus("error");
        setError(errorMessage ?? "Falha ao enviar material");
        return;
      }

      setUploadStatus("done");
      setUploadTitle("");
      setFile(null);
      await loadMaterials();
    } catch (err) {
      setUploadStatus("error");
      setError(err instanceof Error ? err.message : "Falha ao enviar material");
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Adicionar (texto)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createMaterial} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Título</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Anotações - Primeira entrevista"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Texto</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background"
                  rows={10}
                  placeholder="Cole o conteúdo aqui..."
                />
              </div>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Salvando..." : "Adicionar material (texto)"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Envio (PDF/DOCX)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={uploadMaterial} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Título (opcional)</label>
                <Input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Se vazio, usa o nome do arquivo"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Arquivo</label>
                <input
                  type="file"
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="mt-1 w-full text-sm"
                />
                <div className="mt-1 text-xs text-muted-foreground/80">Máx.: 15MB</div>
              </div>

              <Button
                type="submit"
                disabled={uploadStatus === "uploading" || uploadStatus === "indexing"}
              >
                {uploadStatus === "uploading"
                  ? "Enviando..."
                  : uploadStatus === "indexing"
                    ? "Indexando..."
                    : "Enviar e indexar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border border-border bg-card">
            {materials.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Sem materiais ainda.</div>
            ) : (
              materials.map((m) => (
                <div key={m.id} className="p-4 text-sm">
                  <div className="font-medium text-foreground">{m.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground/80">ID: {m.id}</div>
                  <div className="mt-1 text-xs text-muted-foreground/80">fonte: {m.source}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

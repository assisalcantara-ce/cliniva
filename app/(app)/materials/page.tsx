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
    <div className="patients-page space-y-6">
      <div className="page-header">
        <div className="title-row">
          <svg
            className="title-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ width: "40px", height: "40px" }}
          >
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="#0f766e" strokeWidth="2" />
            <path d="M7 9h10" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 13h10" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7 17h6" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <h1 className="page-title" style={{ fontSize: "32px" }}>
            Materiais
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Centralize documentos e anotações para apoiar consultas com IA.
        </p>
      </div>

      {error ? (
        <Card className="admin-card border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title">Adicionar (texto)</CardTitle>
          </CardHeader>
          <CardContent className="admin-card__content">
            <form onSubmit={createMaterial} className="space-y-3">
              <div className="field">
                <label className="label">Titulo</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Anotacoes - Primeira entrevista"
                  className="control"
                />
              </div>
              <div className="field">
                <label className="label">Texto</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background control"
                  rows={10}
                  placeholder="Cole o conteudo aqui..."
                />
              </div>
              <Button type="submit" disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white">
                {isSaving ? "Salvando..." : "Adicionar material"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title">Envio (PDF/DOCX)</CardTitle>
          </CardHeader>
          <CardContent className="admin-card__content">
            <form onSubmit={uploadMaterial} className="space-y-3">
              <div className="field">
                <label className="label">Titulo (opcional)</label>
                <Input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Se vazio, usa o nome do arquivo"
                  className="control"
                />
              </div>
              <div className="field">
                <label className="label">Arquivo</label>
                <input
                  type="file"
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="control w-full text-sm"
                />
                <div className="mt-1 text-xs text-muted-foreground/80">Max.: 15MB</div>
              </div>

              <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                O arquivo sera enviado e indexado para busca com IA.
              </div>

              <Button
                type="submit"
                disabled={uploadStatus === "uploading" || uploadStatus === "indexing"}
                className="bg-teal-600 hover:bg-teal-700 text-white"
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

      <Card className="admin-card">
        <CardHeader className="admin-card__header">
          <div className="flex items-center justify-between">
            <CardTitle className="admin-card__title text-lg font-bold">Lista de materiais</CardTitle>
            <span className="text-xs font-medium text-muted-foreground">
              Total: <span className="text-sm font-semibold text-foreground">{materials.length}</span>
            </span>
          </div>
        </CardHeader>
        <CardContent className="admin-card__content p-0">
          <div className="divide-y divide-gray-200">
            <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-teal-700 text-white border-b border-teal-800">
              <div className="grid grid-cols-12 gap-3 px-6 py-3 text-xs font-bold uppercase tracking-wide">
                <div className="col-span-6">Titulo</div>
                <div className="col-span-3">Fonte</div>
                <div className="col-span-3 text-right">Criado em</div>
              </div>
            </div>

            {materials.length === 0 ? (
              <div className="p-8 text-sm text-center text-muted-foreground">Sem materiais ainda.</div>
            ) : (
              materials.map((m) => (
                <div key={m.id} className="grid grid-cols-12 gap-3 px-6 py-4 text-sm items-center hover:bg-gray-50 transition-all">
                  <div className="col-span-6">
                    <div className="font-semibold text-foreground">{m.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground/80">ID: {m.id}</div>
                  </div>
                  <div className="col-span-3 text-xs text-muted-foreground/80">{m.source}</div>
                  <div className="col-span-3 text-xs text-muted-foreground/80 text-right">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString("pt-BR") : "-"}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

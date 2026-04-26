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

type EditState = {
  id: string;
  title: string;
  text: string;
  source: string;
  loading: boolean;
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

  // Edição
  const [editModal, setEditModal] = useState<EditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Deleção
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  async function uploadMaterial(e: React.FormEvent) {    e.preventDefault();
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

  async function openEdit(m: Material) {
    setEditError(null);
    const base: EditState = { id: m.id, title: m.title, text: "", source: m.source, loading: true };
    setEditModal(base);
    try {
      const res = await fetch(`/api/materials/${m.id}`);
      const json = (await res.json()) as { material: Material; text: string | null } | { error: string };
      if (!res.ok) {
        setEditError("error" in json ? json.error : "Falha ao carregar material");
        return;
      }
      setEditModal({
        id: m.id,
        title: (json as { material: Material; text: string | null }).material.title,
        text: (json as { material: Material; text: string | null }).text ?? "",
        source: m.source,
        loading: false,
      });
    } catch {
      setEditError("Falha ao carregar material");
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const body: Record<string, string> = { title: editModal.title };
      if (editModal.source === "manual" && editModal.text.trim()) body.text = editModal.text;
      const res = await fetch(`/api/materials/${editModal.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setEditError(json.error ?? "Falha ao salvar");
        return;
      }
      setEditModal(null);
      await loadMaterials();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function deleteMaterial(id: string) {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/materials/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Falha ao deletar material");
        return;
      }
      setDeleteId(null);
      await loadMaterials();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao deletar material");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="patients-page space-y-6">
      {/* Modal de edição */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-teal-600">
              <h2 className="text-base font-semibold text-white">Editar material</h2>
              <button
                onClick={() => setEditModal(null)}
                className="text-white/80 hover:text-white transition-colors"
                aria-label="Fechar"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <form onSubmit={saveEdit} className="p-6 space-y-4">
              {editError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{editError}</div>
              )}
              {editModal.loading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Título</label>
                    <Input
                      value={editModal.title}
                      onChange={(e) => setEditModal({ ...editModal, title: e.target.value })}
                      placeholder="Título do material"
                      required
                    />
                  </div>
                  {editModal.source === "manual" && (
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Conteúdo</label>
                      <textarea
                        value={editModal.text}
                        onChange={(e) => setEditModal({ ...editModal, text: e.target.value })}
                        rows={12}
                        placeholder="Conteúdo do material..."
                        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                      />
                      <p className="text-xs text-muted-foreground">Alterar o conteúdo recria os embeddings (requer chave OpenAI configurada).</p>
                    </div>
                  )}
                  {editModal.source !== "manual" && (
                    <p className="text-xs text-muted-foreground bg-gray-50 rounded-md p-3 border">
                      Materiais enviados via arquivo não permitem edição de conteúdo — apenas do título.
                    </p>
                  )}
                </>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setEditModal(null)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingEdit || editModal.loading}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSavingEdit ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação de deleção */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b-4 border-red-500 bg-red-50">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <h3 className="font-semibold text-gray-900">Confirmar exclusão</h3>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-600 mb-6">
                Este material e todos os seus chunks de embeddings serão removidos permanentemente. Essa ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setDeleteId(null)}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => void deleteMaterial(deleteId)}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deletando..." : "Deletar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
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
                <div className="col-span-5">Titulo</div>
                <div className="col-span-2">Fonte</div>
                <div className="col-span-3 text-right">Criado em</div>
                <div className="col-span-2 text-right">Ações</div>
              </div>
            </div>

            {materials.length === 0 ? (
              <div className="p-8 text-sm text-center text-muted-foreground">Sem materiais ainda.</div>
            ) : (
              materials.map((m) => (
                <div key={m.id} className="grid grid-cols-12 gap-3 px-6 py-4 text-sm items-center hover:bg-gray-50 transition-all">
                  <div className="col-span-5">
                    <div className="font-semibold text-foreground">{m.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground/80">ID: {m.id}</div>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground/80">{m.source}</div>
                  <div className="col-span-3 text-xs text-muted-foreground/80 text-right">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString("pt-BR") : "-"}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <button
                      onClick={() => void openEdit(m)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
                      title="Editar"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteId(m.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                      title="Deletar"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      Deletar
                    </button>
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

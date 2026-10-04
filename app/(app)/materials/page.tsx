"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function formatMaterialDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

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

  // Busca e Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "manual" | "file">("all");

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  // Resetar página ao alterar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sourceFilter, pageSize]);

  async function createMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("O título do material é obrigatório.");
      return;
    }
    if (!text.trim()) {
      setError("O conteúdo do material é obrigatório.");
      return;
    }

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
      setError("Selecione um arquivo PDF ou DOCX para envio.");
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
      setTimeout(() => setUploadStatus("idle"), 3000);
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
        setEditError(json.error ?? "Falha ao salvar alterações");
        return;
      }
      setEditModal(null);
      await loadMaterials();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Falha ao salvar alterações");
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

  // Filtragem Geral
  const filteredMaterials = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return materials.filter((m) => {
      const isManual = m.source === "manual";
      const matchesSource =
        sourceFilter === "all" ||
        (sourceFilter === "manual" && isManual) ||
        (sourceFilter === "file" && !isManual);

      if (!matchesSource) return false;

      if (!query) return true;

      const titleMatch = m.title.toLowerCase().includes(query);
      const filenameMatch = m.filename ? m.filename.toLowerCase().includes(query) : false;
      return titleMatch || filenameMatch;
    });
  }, [materials, searchQuery, sourceFilter]);

  // Cálculos de Paginação
  const totalItems = filteredMaterials.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedMaterials = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return filteredMaterials.slice(start, start + pageSize);
  }, [filteredMaterials, validCurrentPage, pageSize]);

  // KPIs
  const totalMaterialsCount = materials.length;
  const manualCount = useMemo(() => materials.filter((m) => m.source === "manual").length, [materials]);
  const fileCount = useMemo(() => materials.filter((m) => m.source !== "manual").length, [materials]);

  const paginationRange = useMemo(() => {
    const delta = 1;
    const range: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= validCurrentPage - delta && i <= validCurrentPage + delta)) {
        range.push(i);
      } else if (range[range.length - 1] !== "...") {
        range.push("...");
      }
    }
    return range;
  }, [totalPages, validCurrentPage]);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  return (
    <div className="patients-page space-y-6">
      {/* 1. CABEÇALHO */}
      <div className="page-header">
        <div className="title-row flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100/90 text-teal-700 shadow-2xs">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" />
                <path d="M7 8h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <path d="M7 12h10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                <path d="M7 16h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="page-title text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Materiais
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                Centralize documentos e anotações para apoiar consultas com IA.
              </p>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <Card className="admin-card border-red-200 bg-red-50">
          <CardContent className="p-5 text-sm text-red-800">{error}</CardContent>
        </Card>
      ) : null}

      {/* 2. RESUMO RÁPIDO (KPIs Contextuais) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">{totalMaterialsCount}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Total de materiais</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">{manualCount}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Anotações manuais</div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">{fileCount}</div>
            <div className="text-xs font-medium text-slate-500 mt-1">Arquivos indexados</div>
          </div>
        </div>
      </div>

      {/* 3. CARDS DE ADIÇÃO E ENVIO */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Card 1: Adicionar (Texto Manual) */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-800 shadow-2xs">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-none">
                Adicionar Nota Clínica (Texto)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crie anotações para indexação direta na IA
              </p>
            </div>
          </div>

          <form onSubmit={createMaterial} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Título *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Anotações — Primeira entrevista"
                className="control w-full bg-[#F3FBF9] border-[#DBE5E1] rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Conteúdo do texto *
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded-xl border border-[#DBE5E1] bg-[#F3FBF9] p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                rows={6}
                placeholder="Cole ou digite o conteúdo do material clínico aqui..."
              />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-2xs px-5 py-2.5 transition-all cursor-pointer"
              >
                {isSaving ? "Salvando..." : "Adicionar Material"}
              </Button>
            </div>
          </form>
        </div>

        {/* Card 2: Envio (PDF/DOCX) */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-800 shadow-2xs">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-none">
                Envio de Documento (PDF/DOCX)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload de arquivos para busca semântica do Copilot
              </p>
            </div>
          </div>

          <form onSubmit={uploadMaterial} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Título (Opcional)
              </label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Se vazio, usará o nome original do arquivo"
                className="control w-full bg-[#F3FBF9] border-[#DBE5E1] rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Arquivo (PDF ou DOCX)
              </label>
              <div className="rounded-xl border border-dashed border-slate-300 bg-[#F3FBF9] p-4 text-center hover:border-teal-500 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
                <label htmlFor="file-upload" className="cursor-pointer block space-y-1.5">
                  <div className="flex items-center justify-center">
                    <svg className="h-6 w-6 text-teal-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    {file ? file.name : "Clique para selecionar um arquivo do computador"}
                  </div>
                  <p className="text-[11px] text-slate-400">PDF ou DOCX até 15MB</p>
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-teal-200 bg-teal-50/50 p-3 text-xs text-teal-800">
              ⚡ O arquivo será processado e indexado em vetores para busca semântica em tempo real durante os atendimentos.
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={uploadStatus === "uploading" || uploadStatus === "indexing" || !file}
                className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-2xs px-5 py-2.5 transition-all cursor-pointer"
              >
                {uploadStatus === "uploading"
                  ? "Enviando..."
                  : uploadStatus === "indexing"
                  ? "Indexando com IA..."
                  : uploadStatus === "done"
                  ? "✓ Enviado com sucesso!"
                  : "Enviar e Indexar"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* 4. BUSCA E FILTROS DE MATERIAIS */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Busca por título */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar materiais por título ou nome de arquivo..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-[#F3FBF9] border-[#DBE5E1] rounded-xl focus:border-teal-500 focus:ring-teal-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                title="Limpar busca"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro de Tipo */}
          <div className="w-full md:w-52">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as "all" | "manual" | "file")}
              className="w-full rounded-xl border border-[#DBE5E1] bg-[#F3FBF9] px-3.5 py-2 text-sm text-slate-800 font-medium focus:border-teal-500 focus:ring-teal-500 cursor-pointer"
            >
              <option value="all">Todos os formatos</option>
              <option value="manual">Anotações Manuais</option>
              <option value="file">Arquivos (PDF/DOCX)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. LISTA DE MATERIAIS */}
      <div className="space-y-4">
        {filteredMaterials.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center shadow-2xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-3.5">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 8h10" />
                <path d="M7 12h10" />
                <path d="M7 16h6" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery || sourceFilter !== "all"
                ? "Nenhum material encontrado para os filtros selecionados"
                : "Nenhum material cadastrado ainda"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || sourceFilter !== "all"
                ? "Tente ajustar os filtros ou o termo de busca."
                : "Adicione anotações ou envie arquivos PDF/DOCX acima para alimentar a memória da IA."}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {paginatedMaterials.map((m) => {
              const isManual = m.source === "manual";

              return (
                <div
                  key={m.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:border-teal-400/80 hover:shadow-xs transition-all"
                >
                  {/* 1. Identificação do Material */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold text-xs shadow-2xs ${
                        isManual
                          ? "bg-purple-100/90 text-purple-800"
                          : "bg-blue-100/90 text-blue-800"
                      }`}
                    >
                      {isManual ? (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                        {m.title}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1 text-xs text-slate-500">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            isManual ? "text-purple-700" : "text-blue-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isManual ? "bg-purple-500" : "bg-blue-500"
                            }`}
                          />
                          {isManual ? "Anotação Manual" : `Arquivo (${m.filename ?? "Documento"})`}
                        </span>

                        <span className="text-slate-400">
                          Criado em: {formatMaterialDate(m.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Ações */}
                  <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => void openEdit(m)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700 transition-all shadow-2xs cursor-pointer"
                      title="Editar título ou conteúdo do material"
                    >
                      <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteId(m.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all shadow-2xs cursor-pointer"
                      title="Excluir este material"
                    >
                      <svg className="w-3.5 h-3.5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Deletar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 6. BARRA DE PAGINAÇÃO */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-2xs">
            {/* Informações da página */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                Mostrando <strong className="text-slate-800 font-semibold">{startItem}</strong> a{" "}
                <strong className="text-slate-800 font-semibold">{endItem}</strong> de{" "}
                <strong className="text-slate-800 font-semibold">{totalItems}</strong> materiais
              </span>

              {/* Seletor de itens por página */}
              <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <span className="text-slate-400">Por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-[#F3FBF9] px-2 py-1 text-xs font-semibold text-slate-700 focus:border-teal-500 focus:ring-teal-500 cursor-pointer"
                >
                  {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Controles de Navegação */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                {/* Botão Anterior */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={validCurrentPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Números das páginas */}
                <div className="flex items-center gap-1">
                  {paginationRange.map((p, idx) => {
                    if (p === "...") {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 text-xs font-medium text-slate-400">
                          ...
                        </span>
                      );
                    }
                    const pageNum = p as number;
                    const isActive = pageNum === validCurrentPage;

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 min-w-[32px] px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? "bg-teal-600 text-white shadow-2xs"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-teal-700"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Botão Próxima */}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={validCurrentPage >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7. MODAL DE EDIÇÃO */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-slate-900">Editar Material</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditModal(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveEdit} className="p-6 space-y-4">
              {editError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-xs font-medium text-red-700">
                  {editError}
                </div>
              )}

              {editModal.loading ? (
                <div className="py-8 text-center text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                  Carregando conteúdo do material...
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Título *
                    </label>
                    <Input
                      value={editModal.title}
                      onChange={(e) => setEditModal({ ...editModal, title: e.target.value })}
                      placeholder="Título do material"
                      className="w-full bg-[#F3FBF9] border-[#DBE5E1] rounded-xl"
                      required
                    />
                  </div>

                  {editModal.source === "manual" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Conteúdo do texto
                      </label>
                      <textarea
                        value={editModal.text}
                        onChange={(e) => setEditModal({ ...editModal, text: e.target.value })}
                        rows={10}
                        placeholder="Conteúdo do material..."
                        className="w-full rounded-xl border border-[#DBE5E1] bg-[#F3FBF9] p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <p className="text-[11px] text-slate-400">
                        ⚡ Alterar o conteúdo atualiza automaticamente os vetores semânticos para a IA.
                      </p>
                    </div>
                  )}

                  {editModal.source !== "manual" && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-600">
                      📄 Materiais indexados a partir de arquivos (PDF/DOCX) permitem a alteração do título descritivo.
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  disabled={isSavingEdit || editModal.loading}
                  className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  {isSavingEdit ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL DE CONFIRMAÇÃO DE DELEÇÃO */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Excluir Material</h3>
                <p className="text-xs text-slate-500">Essa ação não pode ser desfeita</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Este material e todos os seus fragmentos e embeddings indexados para a IA serão removidos permanentemente.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setDeleteId(null)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold shadow-xs py-2.5 transition-all cursor-pointer"
                onClick={() => void deleteMaterial(deleteId)}
                disabled={isDeleting}
              >
                {isDeleting ? "Deletando..." : "Sim, Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

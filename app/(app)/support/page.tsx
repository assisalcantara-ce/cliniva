"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type TicketForm = {
  title: string;
  category: "bug" | "feature" | "billing" | "general";
  priority: "low" | "medium" | "high" | "critical";
  description: string;
};

type SupportTicket = TicketForm & {
  id: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
};

const categoryLabels: Record<TicketForm["category"], string> = {
  bug: "Bug",
  feature: "Sugestão",
  billing: "Cobrança",
  general: "Geral",
};

const priorityLabels: Record<TicketForm["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const statusLabels: Record<SupportTicket["status"], string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  closed: "Fechado",
};

function statusBadgeClass(status: SupportTicket["status"]) {
  if (status === "open") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "in_progress") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TicketForm>({
    title: "",
    category: "general",
    priority: "medium",
    description: "",
  });

  useEffect(() => {
    async function loadTickets() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/support");
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          setError(json.error || "Falha ao carregar tickets.");
          return;
        }
        const data = (await res.json()) as { tickets: SupportTicket[] };
        setTickets(data.tickets || []);
      } catch {
        setError("Falha ao carregar tickets.");
      } finally {
        setIsLoading(false);
      }
    }

    loadTickets();
  }, []);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }, [tickets]);

  function updateForm<K extends keyof TicketForm>(key: K, value: TicketForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm({ title: "", category: "general", priority: "medium", description: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim() || !form.description.trim()) {
      setError("Preencha título e descrição.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          priority: form.priority,
        }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error || "Falha ao enviar ticket.");
        return;
      }

      const data = (await res.json()) as { ticket: SupportTicket };
      setTickets((prev) => [data.ticket, ...prev]);
      resetForm();
    } catch {
      setError("Falha ao enviar ticket.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="patients-page">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-6">
          <svg
            className="w-8 h-8 text-teal-700"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2a8 8 0 00-8 8v5a3 3 0 003 3h1v-6H6v-2a6 6 0 0112 0v2h-2v6h1a3 3 0 003-3v-5a8 8 0 00-8-8zm-1 17h2v2h-2v-2z" />
          </svg>
          <h1 className="text-2xl font-bold text-foreground">Suporte</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title">Abrir ticket</CardTitle>
          </CardHeader>
          <CardContent className="admin-card__content">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="form-grid">
                <div className="field col-span-2">
                  <label className="label">Título</label>
                  <Input
                    value={form.title}
                    onChange={(e) => updateForm("title", e.target.value)}
                    placeholder="Ex.: Erro ao abrir prontuário"
                    className="control"
                    required
                  />
                </div>
                <div className="field">
                  <label className="label">Categoria</label>
                  <Select
                    value={form.category}
                    onChange={(e) => updateForm("category", e.target.value as TicketForm["category"])}
                    className="control"
                  >
                    <option value="general">Geral</option>
                    <option value="bug">Bug</option>
                    <option value="feature">Sugestão</option>
                    <option value="billing">Cobrança</option>
                  </Select>
                </div>
                <div className="field">
                  <label className="label">Prioridade</label>
                  <Select
                    value={form.priority}
                    onChange={(e) => updateForm("priority", e.target.value as TicketForm["priority"])}
                    className="control"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </Select>
                </div>
              </div>

              <div className="field">
                <label className="label">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  placeholder="Descreva o problema ou pedido..."
                  className="control w-full rounded-md border border-gray-300 p-3"
                  rows={4}
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                >
                  {isSubmitting ? "Enviando..." : "Enviar ticket"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title">Meus tickets</CardTitle>
          </CardHeader>
          <CardContent className="admin-card__content">
            {isLoading ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Carregando tickets...
              </div>
            ) : sortedTickets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                Nenhum ticket enviado até o momento.
              </div>
            ) : (
              <div className="space-y-4">
                {sortedTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-800">
                        {ticket.title}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(ticket.status)}`}
                      >
                        {statusLabels[ticket.status]}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {categoryLabels[ticket.category]} • {priorityLabels[ticket.priority]} • {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {ticket.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

type SupportTicket = {
  id: string;
  title: string;
  description: string;
  category: "bug" | "feature" | "billing" | "general";
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "resolved" | "closed";
  createdAt: string;
  updatedAt?: string | null;
  userId: string;
  userEmail?: string;
};

const categoryLabels: Record<SupportTicket["category"], string> = {
  bug: "Bug",
  feature: "Sugestão",
  billing: "Cobrança",
  general: "Geral",
};

const priorityLabels: Record<SupportTicket["priority"], string> = {
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

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadTickets() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/support");
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

  useEffect(() => {
    loadTickets();
  }, []);

  const sortedTickets = useMemo(() => {
    return [...tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [tickets]);

  async function updateStatus(ticketId: string, status: SupportTicket["status"]) {
    setUpdatingId(ticketId);
    try {
      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketId, status }),
      });

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error || "Falha ao atualizar ticket.");
        return;
      }

      const data = (await res.json()) as { ticket: { id: string; status: SupportTicket["status"]; updatedAt?: string } };
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === data.ticket.id
            ? { ...ticket, status: data.ticket.status, updatedAt: data.ticket.updatedAt }
            : ticket
        )
      );
    } catch {
      setError("Falha ao atualizar ticket.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suporte</h1>
          <p className="text-sm text-slate-500">Gerencie tickets e responda demandas do tenant.</p>
        </div>
        <Button
          type="button"
          onClick={loadTickets}
          disabled={isLoading}
          variant="secondary"
        >
          {isLoading ? "Atualizando..." : "Atualizar"}
        </Button>
      </div>

      {error && (
        <Card className="admin-card border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      <Card className="admin-card">
        <CardHeader className="admin-card__header">
          <CardTitle className="admin-card__title">Tickets</CardTitle>
        </CardHeader>
        <CardContent className="admin-card__content">
          {isLoading ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Carregando tickets...
            </div>
          ) : sortedTickets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Nenhum ticket recebido até o momento.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedTickets.map((ticket) => (
                <div key={ticket.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{ticket.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {categoryLabels[ticket.category]} • {priorityLabels[ticket.priority]}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {ticket.userEmail || "Usuário"} • {new Date(ticket.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(ticket.status)}`}>
                        {statusLabels[ticket.status]}
                      </span>
                      <Select
                        value={ticket.status}
                        onChange={(e) => updateStatus(ticket.id, e.target.value as SupportTicket["status"])}
                        className="control w-44"
                        disabled={updatingId === ticket.id}
                      >
                        <option value="open">Aberto</option>
                        <option value="in_progress">Em andamento</option>
                        <option value="resolved">Resolvido</option>
                        <option value="closed">Fechado</option>
                      </Select>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{ticket.description}</p>
                  {ticket.updatedAt && (
                    <div className="mt-3 text-xs text-slate-400">
                      Atualizado em {new Date(ticket.updatedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

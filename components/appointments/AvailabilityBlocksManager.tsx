"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface AvailabilityBlockItem {
  id: string;
  starts_at: string;
  ends_at: string;
  reason?: string | null;
}

interface AvailabilityBlocksManagerProps {
  blocks: AvailabilityBlockItem[];
  onCreateBlock: (data: { starts_at: string; ends_at: string; reason?: string }) => Promise<boolean | void>;
  onDeleteBlock: (id: string) => Promise<boolean | void>;
  isSavingBlock?: boolean;
  isDeletingBlockId?: string | null;
  errorMessage?: string | null;
  successMessage?: string | null;
  className?: string;
}

function formatPeriod(startsAt: string, endsAt: string): { dateStr: string; timeStr: string; isMultiDay: boolean } {
  try {
    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return { dateStr: "Data não definida", timeStr: "--:--", isMultiDay: false };
    }

    const startDay = startDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });

    const endDay = endDate.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });

    const startTime = startDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    const endTime = endDate.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });

    const isMultiDay = startDay !== endDay;

    if (isMultiDay) {
      return {
        dateStr: `${startDay} às ${startTime} até ${endDay} às ${endTime}`,
        timeStr: "Período estendido",
        isMultiDay: true,
      };
    }

    return {
      dateStr: startDay,
      timeStr: `${startTime} às ${endTime}`,
      isMultiDay: false,
    };
  } catch {
    return { dateStr: startsAt, timeStr: endsAt, isMultiDay: false };
  }
}

export function AvailabilityBlocksManager({
  blocks,
  onCreateBlock,
  onDeleteBlock,
  isSavingBlock = false,
  isDeletingBlockId = null,
  errorMessage = null,
  successMessage = null,
  className,
}: AvailabilityBlocksManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<AvailabilityBlockItem | null>(null);

  // Form state
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const now = new Date();

  // Sort blocks chronologically
  const sortedBlocks = [...blocks].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  const upcomingBlocks = sortedBlocks.filter((b) => new Date(b.ends_at).getTime() >= now.getTime());
  const pastBlocks = sortedBlocks.filter((b) => new Date(b.ends_at).getTime() < now.getTime());

  const handleOpenModal = () => {
    setFormError(null);
    setStart("");
    setEnd("");
    setReason("");
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!start || !end) {
      setFormError("Informe a data e horário de início e término.");
      return;
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setFormError("Formato de data e horário inválido.");
      return;
    }

    if (endDate <= startDate) {
      setFormError("O horário final deve ser posterior ao horário inicial.");
      return;
    }

    try {
      const result = await onCreateBlock({
        starts_at: startDate.toISOString(),
        ends_at: endDate.toISOString(),
        reason: reason.trim() ? reason.trim() : undefined,
      });

      if (result !== false) {
        setIsModalOpen(false);
      }
    } catch {
      setFormError("Erro ao salvar bloqueio. Verifique os dados e tente novamente.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!blockToDelete) return;
    try {
      await onDeleteBlock(blockToDelete.id);
      setBlockToDelete(null);
    } catch {
      // Error handled in parent
    }
  };

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className ?? ""}`}>
      <Card className="rounded-xl border border-border/80 bg-card shadow-xs">
        {/* Header */}
        <CardHeader className="border-b border-border/70 p-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Bloqueios & ausências
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Defina períodos em que você não estará disponível para atendimentos.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleOpenModal}
              className="h-9 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold gap-1.5 shadow-xs self-start sm:self-auto"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Adicionar bloqueio</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Feedback messages */}
          {errorMessage && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
              {successMessage}
            </div>
          )}

          {/* Empty State */}
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 py-7 text-center px-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-700 mb-2 border border-teal-200/60">
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-foreground">Nenhum bloqueio cadastrado.</h4>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                Sua disponibilidade está livre para os períodos cadastrados.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleOpenModal}
                className="mt-3 text-xs font-semibold"
              >
                Adicionar primeiro bloqueio
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upcoming Blocks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                    Bloqueios Programados & Vigentes ({upcomingBlocks.length})
                  </span>
                </div>

                {upcomingBlocks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">
                    Nenhum bloqueio futuro programado.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {upcomingBlocks.map((block) => {
                      const { dateStr, timeStr, isMultiDay } = formatPeriod(block.starts_at, block.ends_at);
                      const isDeleting = isDeletingBlockId === block.id;

                      return (
                        <div
                          key={block.id}
                          className="rounded-xl border border-border/80 bg-white p-4 shadow-2xs space-y-3 hover:border-teal-200 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/70">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Bloqueio Ativo
                              </span>
                              <h4 className="text-xs font-bold text-foreground mt-1">
                                {dateStr}
                              </h4>
                              {!isMultiDay && (
                                <p className="text-xs text-muted-foreground font-medium">
                                  {timeStr}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isDeleting}
                              onClick={() => setBlockToDelete(block)}
                              className="h-8 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            >
                              Remover
                            </Button>
                          </div>

                          {block.reason ? (
                            <p className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2 border border-border/40 italic">
                              “{block.reason}”
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Past Blocks */}
              {pastBlocks.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border/60">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Bloqueios Anteriores ({pastBlocks.length})
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {pastBlocks.map((block) => {
                      const { dateStr, timeStr, isMultiDay } = formatPeriod(block.starts_at, block.ends_at);
                      const isDeleting = isDeletingBlockId === block.id;

                      return (
                        <div
                          key={block.id}
                          className="rounded-xl border border-border/50 bg-muted/10 p-3.5 opacity-70 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                                Encerrado
                              </span>
                              <div className="text-xs font-semibold text-foreground mt-0.5">
                                {dateStr}
                              </div>
                              {!isMultiDay && (
                                <div className="text-[11px] text-muted-foreground">
                                  {timeStr}
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isDeleting}
                              onClick={() => setBlockToDelete(block)}
                              className="h-7 text-[11px] font-semibold text-muted-foreground hover:text-rose-600"
                            >
                              Remover
                            </Button>
                          </div>
                          {block.reason ? (
                            <p className="text-[11px] text-muted-foreground italic">
                              “{block.reason}”
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação de Bloqueio */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Novo Bloqueio de Agenda</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Indique o período em que nenhum atendimento poderá ser agendado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Início do Bloqueio *</label>
                  <Input
                    type="datetime-local"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="h-10 text-xs bg-white"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Término do Bloqueio *</label>
                  <Input
                    type="datetime-local"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="h-10 text-xs bg-white"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Motivo (opcional)</label>
                <Input
                  type="text"
                  placeholder="Ex: Férias, consulta médica, compromisso pessoal"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-10 text-xs bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSavingBlock}
                  className="h-10 text-xs font-semibold px-4"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={!start || !end || isSavingBlock}
                  className="h-10 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-5 shadow-xs"
                >
                  {isSavingBlock ? "Salvando bloqueio..." : "Salvar Bloqueio"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      {blockToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Remover Bloqueio</h3>
            <p className="text-xs text-muted-foreground">
              Deseja realmente remover este bloqueio de agenda? Os horários correspondentes voltarão a ficar disponíveis na sua Agenda conforme sua disponibilidade semanal.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setBlockToDelete(null)}
                className="text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                className="text-xs font-semibold"
              >
                Sim, remover
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

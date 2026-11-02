"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { PLANS_CATALOG, type PlanId } from "@/lib/plans/catalog";

const serif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-landing-serif",
});
const manrope = Manrope({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-landing-sans",
});

// ─── Types ───────────────────────────────────────────────────────────────────

type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";
type Step = 1 | 2;

interface FormData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  password: string;
  confirmPassword: string;
  billingType: BillingType;
  card: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}

function maskCardNumber(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})/g, "$1 ")
    .trim();
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isTrialMode = searchParams.get("trial") === "true";
  const planParam = searchParams.get("plan");

  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(() => {
    if (planParam === "essencial") return "essencial";
    if (planParam === "premium") return "premium";
    return "profissional";
  });

  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    password: "",
    confirmPassword: "",
    billingType: "PIX",
    card: {
      holderName: "",
      number: "",
      expiryMonth: "",
      expiryYear: "",
      ccv: "",
    },
  });

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setCardField(key: keyof FormData["card"], value: string) {
    setForm((prev) => ({ ...prev, card: { ...prev.card, [key]: value } }));
  }

  // ── Validação do Step 1 ───────────────────────────────────────────────────

  function validateStep1(): string | null {
    if (form.name.trim().length < 2) return "Nome deve ter pelo menos 2 caracteres.";
    if (!form.email.includes("@")) return "Email inválido.";
    if (!isTrialMode && onlyDigits(form.cpf).length !== 11) return "CPF inválido (11 dígitos).";
    const phoneDigits = onlyDigits(form.phone);
    if (phoneDigits.length < 10) return "Telefone inválido com DDD.";
    if (form.password.length < 8) return "Senha mínima de 8 caracteres.";
    if (form.password !== form.confirmPassword) return "As senhas não coincidem.";
    return null;
  }

  function handleNextStep() {
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep(2);
  }

  // ── Submit do Trial de 7 Dias (Sem Cartão) ────────────────────────────────

  async function handleTrialSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateStep1();
    if (err) {
      setError(err);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: onlyDigits(form.phone),
          password: form.password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Não foi possível iniciar o teste gratuito.");
        return;
      }

      // Redireciona para login informando sucesso na ativação do trial
      router.push("/login?trial_started=true");
    } catch {
      setError("Erro de conexão ao ativar teste gratuito. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Submit de Assinatura Paga Regular (Via Asaas) ─────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.billingType === "CREDIT_CARD") {
      const { holderName, number, expiryMonth, expiryYear, ccv } = form.card;
      if (!holderName || onlyDigits(number).length < 13 || !expiryMonth || !expiryYear || !ccv) {
        setError("Preencha todos os dados do cartão.");
        return;
      }
    }

    setIsLoading(true);

    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        cpf: onlyDigits(form.cpf),
        phone: onlyDigits(form.phone),
        password: form.password,
        billingType: form.billingType,
        planId: selectedPlanId,
      };

      if (form.billingType === "CREDIT_CARD") {
        body.card = {
          holderName: form.card.holderName.trim(),
          number: onlyDigits(form.card.number),
          expiryMonth: form.card.expiryMonth,
          expiryYear: form.card.expiryYear,
          ccv: form.card.ccv,
        };
      }

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as {
        error?: string;
        billingType?: BillingType;
        asaasSubscriptionId?: string;
        activated?: boolean;
        pixQrCode?: { encodedImage: string; payload: string };
        bankSlipUrl?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Erro ao processar. Tente novamente.");
        return;
      }

      // Persistir dados de pagamento para a página de pendente
      if (data.billingType !== "CREDIT_CARD") {
        sessionStorage.setItem(
          "cliniva_checkout",
          JSON.stringify({
            billingType: data.billingType,
            pixEncodedImage: data.pixQrCode?.encodedImage ?? null,
            pixPayload: data.pixQrCode?.payload ?? null,
            bankSlipUrl: data.bankSlipUrl ?? null,
            email: form.email,
          })
        );
        router.push("/checkout/pendente");
      } else if (data.activated) {
        router.push("/checkout/sucesso");
      } else {
        router.push("/checkout/pendente");
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const plan = PLANS_CATALOG[selectedPlanId] || PLANS_CATALOG.profissional;

  return (
    <main
      className={`${serif.variable} ${manrope.variable} min-h-screen bg-[#eef7f4] text-slate-900`}
      style={{ fontFamily: "var(--font-landing-sans)" }}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(20,184,166,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.14),transparent_50%)]" />

        {/* Header */}
        <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/planos">
            <img src="/img/logo3.png" alt="Cliniva" className="h-[65px] w-[140px] object-contain" />
          </Link>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <Link href="/planos" className="hover:text-emerald-700">
              Ver todos os planos
            </Link>
            <Link href="/login" className="rounded-full bg-white px-4 py-2 shadow-sm hover:bg-slate-50">
              Já tenho conta
            </Link>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <div className="relative z-10 mx-auto max-w-5xl px-6 pb-20 pt-4">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Coluna da Esquerda: Formulário */}
            <div className="rounded-[28px] border border-emerald-100 bg-white/95 p-8 shadow-xl">
              {isTrialMode ? (
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-800 mb-3">
                    Teste Gratuito • 7 Dias
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
                    Crie sua conta para começar
                  </h1>
                  <p className="text-xs text-slate-600 mb-6">
                    Acesso imediato ao plano Profissional com página pública, agendamento e análises assistivas. Sem cartão de crédito.
                  </p>

                  <form onSubmit={handleTrialSubmit} className="space-y-4">
                    <Field label="Nome completo do profissional *">
                      <input
                        className={inputCls}
                        placeholder="Ex: Dra. Cristiane Alcântara"
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                        required
                      />
                    </Field>

                    <Field label="E-mail profissional *">
                      <input
                        type="email"
                        className={inputCls}
                        placeholder="seu.email@exemplo.com"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        required
                      />
                    </Field>

                    <Field label="WhatsApp com DDD *">
                      <input
                        className={inputCls}
                        placeholder="(11) 99999-0000"
                        value={form.phone}
                        onChange={(e) => setField("phone", maskPhone(e.target.value))}
                        required
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Senha *">
                        <input
                          type="password"
                          className={inputCls}
                          placeholder="Mínimo 8 dígitos"
                          value={form.password}
                          onChange={(e) => setField("password", e.target.value)}
                          required
                        />
                      </Field>

                      <Field label="Confirmar Senha *">
                        <input
                          type="password"
                          className={inputCls}
                          placeholder="Repita a senha"
                          value={form.confirmPassword}
                          onChange={(e) => setField("confirmPassword", e.target.value)}
                          required
                        />
                      </Field>
                    </div>

                    {error && <ErrorBox message={error} />}

                    <p className="text-[11px] text-slate-500 pt-2">
                      Ao iniciar o teste, você concorda com os Termos de Uso e Política de Privacidade do Cliniva. Seus dados clínicos permanecem confidenciais.
                    </p>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-md transition text-sm"
                    >
                      {isLoading ? "Ativando teste gratuito..." : "Começar 7 Dias Grátis Agora"}
                    </button>
                  </form>
                </div>
              ) : (
                <div>
                  {/* Seletor de Plano Rápido */}
                  <div className="mb-6 border-b border-slate-100 pb-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Plano Selecionado:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["essencial", "premium", "profissional"] as const).map((pId) => {
                        const pInfo = PLANS_CATALOG[pId];
                        const isSel = selectedPlanId === pId;
                        return (
                          <button
                            key={pId}
                            type="button"
                            onClick={() => setSelectedPlanId(pId)}
                            className={`p-2.5 rounded-xl border text-left transition ${
                              isSel
                                ? "border-teal-600 bg-teal-50/70 shadow-sm"
                                : "border-slate-200 bg-white hover:border-slate-300"
                            }`}
                          >
                            <p className="text-xs font-bold text-slate-900 truncate">{pInfo.name.replace("Cliniva ", "")}</p>
                            <p className="text-xs font-semibold text-teal-800">{pInfo.priceFormatted}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {step === 1 ? (
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 mb-4">1. Identificação Profissional</h2>
                      <Step1
                        form={form}
                        setField={setField}
                        error={error}
                        onNext={handleNextStep}
                      />
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 mb-4">2. Pagamento Seguro Asaas</h2>
                      <form onSubmit={handleSubmit}>
                        <Step2
                          form={form}
                          setField={setField}
                          setCardField={setCardField}
                          error={error}
                          isLoading={isLoading}
                          onBack={() => setStep(1)}
                        />
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Coluna da Direita: Resumo do Plano Contratado */}
            <div>
              <PlanSummary plan={plan} isTrial={isTrialMode} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#eef7f4] flex items-center justify-center p-8">Carregando checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function Step1({
  form,
  setField,
  error,
  onNext,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  error: string | null;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Nome completo *">
        <input
          className={inputCls}
          placeholder="Ex: Dra. Cristiane Alcântara"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          required
        />
      </Field>

      <Field label="E-mail profissional *">
        <input
          type="email"
          className={inputCls}
          placeholder="seu.email@exemplo.com"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="CPF (somente números) *">
          <input
            className={inputCls}
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={(e) => setField("cpf", maskCpf(e.target.value))}
            maxLength={14}
            required
          />
        </Field>

        <Field label="WhatsApp com DDD *">
          <input
            className={inputCls}
            placeholder="(11) 99999-0000"
            value={form.phone}
            onChange={(e) => setField("phone", maskPhone(e.target.value))}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Senha *">
          <input
            type="password"
            className={inputCls}
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            required
          />
        </Field>

        <Field label="Confirmar Senha *">
          <input
            type="password"
            className={inputCls}
            placeholder="Repita a senha"
            value={form.confirmPassword}
            onChange={(e) => setField("confirmPassword", e.target.value)}
            required
          />
        </Field>
      </div>

      {error && <ErrorBox message={error} />}

      <button
        type="button"
        onClick={onNext}
        className="w-full mt-2 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow transition text-sm"
      >
        Continuar para Pagamento →
      </button>
    </div>
  );
}

function Step2({
  form,
  setField,
  setCardField,
  error,
  isLoading,
  onBack,
}: {
  form: FormData;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  setCardField: (k: keyof FormData["card"], v: string) => void;
  error: string | null;
  isLoading: boolean;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-2">Forma de Pagamento</label>
        <div className="grid grid-cols-3 gap-2">
          {(["PIX", "CREDIT_CARD", "BOLETO"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setField("billingType", type)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition text-center ${
                form.billingType === type
                  ? "border-teal-600 bg-teal-50 text-teal-900 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {type === "PIX" ? "PIX Imediato" : type === "CREDIT_CARD" ? "Cartão" : "Boleto"}
            </button>
          ))}
        </div>
      </div>

      {form.billingType === "CREDIT_CARD" && (
        <div className="space-y-3 pt-2 animate-in fade-in">
          <Field label="Nome impresso no cartão *">
            <input
              className={inputCls}
              placeholder="Ex: CRISTIANE ALCANTARA"
              value={form.card.holderName}
              onChange={(e) => setCardField("holderName", e.target.value.toUpperCase())}
            />
          </Field>

          <Field label="Número do cartão *">
            <input
              className={inputCls}
              placeholder="0000 0000 0000 0000"
              value={form.card.number}
              onChange={(e) => setCardField("number", maskCardNumber(e.target.value))}
              maxLength={19}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Mês (MM)">
              <input
                className={inputCls}
                placeholder="MM"
                maxLength={2}
                value={form.card.expiryMonth}
                onChange={(e) => setCardField("expiryMonth", onlyDigits(e.target.value).slice(0, 2))}
              />
            </Field>
            <Field label="Ano (AAAA)">
              <input
                className={inputCls}
                placeholder="AAAA"
                maxLength={4}
                value={form.card.expiryYear}
                onChange={(e) => setCardField("expiryYear", onlyDigits(e.target.value).slice(0, 4))}
              />
            </Field>
            <Field label="CVV">
              <input
                className={inputCls}
                placeholder="000"
                maxLength={4}
                value={form.card.ccv}
                onChange={(e) => setCardField("ccv", onlyDigits(e.target.value).slice(0, 4))}
              />
            </Field>
          </div>
        </div>
      )}

      {error && <ErrorBox message={error} />}

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          ← Voltar
        </button>

        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold rounded-xl shadow text-sm transition"
        >
          {isLoading ? "Processando..." : "Confirmar Assinatura"}
        </button>
      </div>
    </div>
  );
}

function PlanSummary({ plan, isTrial }: { plan: any; isTrial: boolean }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-teal-100 bg-white/95 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-teal-600">
            {isTrial ? "Degustação Experimental" : "Assinatura Mensal"}
          </p>
          {isTrial && (
            <span className="text-[10px] font-extrabold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
              7 DIAS GRÁTIS
            </span>
          )}
        </div>

        <h3 className="text-2xl font-bold text-slate-900 mt-2">{plan.name}</h3>

        <div className="mt-3">
          {isTrial ? (
            <div>
              <span className="text-3xl font-extrabold text-slate-900">R$ 0,00</span>
              <p className="text-xs text-slate-500 mt-1">
                Acesso gratuito por 7 dias. Ao final, escolha se deseja assinar.
              </p>
            </div>
          ) : (
            <div>
              <span className="text-3xl font-extrabold text-slate-900">{plan.priceFormatted}</span>
              <span className="text-xs font-medium text-slate-500"> / mês</span>
              <p className="text-xs text-slate-500 mt-1">Cobrado mensalmente via Asaas. Cancele quando quiser.</p>
            </div>
          )}
        </div>

        <hr className="my-4 border-slate-100" />

        <ul className="space-y-2.5 text-xs text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Prontuário clínico estruturado e anamnese</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Análises com IA Corporativa Cliniva</span>
          </li>
          {plan.features.realtime_audio_stt && (
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Transcrição contínua e Copiloto ao vivo</span>
            </li>
          )}
          {plan.features.public_landing_page && (
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Página pública personalizada e chat IA</span>
            </li>
          )}
          {plan.features.public_slot_booking && (
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold">✓</span>
              <span>Agendamento automático direto na agenda</span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="text-emerald-600 font-bold">✓</span>
            <span>Exportação irrestrita de dados e prontuários (LGPD)</span>
          </li>
        </ul>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-xs text-amber-800">
        <p className="font-bold mb-1">Privacidade & Responsabilidade</p>
        <p className="leading-relaxed">
          O Cliniva Copilot não realiza diagnósticos médicos nem prescreve medicamentos. Seus dados e prontuários estão sob sigilo ético profissional.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
      {message}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500";

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DM_Serif_Display, Manrope } from "next/font/google";

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();

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
    if (onlyDigits(form.cpf).length !== 11) return "CPF inválido (11 dígitos).";
    const phoneDigits = onlyDigits(form.phone);
    if (phoneDigits.length < 10) return "Telefone inválido.";
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

  // ── Submit ────────────────────────────────────────────────────────────────

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

  return (
    <main
      className={`${serif.variable} ${manrope.variable} min-h-screen bg-[#eef7f4] text-slate-900`}
      style={{ fontFamily: "var(--font-landing-sans)" }}
    >
      {/* Gradientes decorativos */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(20,184,166,0.15),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(59,130,246,0.12),transparent_50%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/">
          <img src="/img/Logo.png" alt="Cliniva" className="h-[65px] w-[140px] object-contain" />
        </Link>
        <Link
          href="/planos"
          className="rounded-full border border-emerald-200 bg-white/80 px-5 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-white"
        >
          ← Voltar aos planos
        </Link>
      </header>

      {/* Corpo */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-2">
        {/* Stepper */}
        <div className="mb-6 flex items-center gap-3">
          <StepBadge n={1} active={step === 1} done={step > 1} label="Dados pessoais" />
          <div className="h-px flex-1 bg-slate-200" />
          <StepBadge n={2} active={step === 2} done={false} label="Pagamento" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Formulário */}
          <form
            onSubmit={handleSubmit}
            className="rounded-[28px] border border-emerald-100 bg-white/95 p-8 shadow-xl"
          >
            {step === 1 && (
              <Step1
                form={form}
                setField={setField}
                error={error}
                onNext={handleNextStep}
              />
            )}
            {step === 2 && (
              <Step2
                form={form}
                setField={setField}
                setCardField={setCardField}
                error={error}
                isLoading={isLoading}
                onBack={() => { setError(null); setStep(1); }}
              />
            )}
          </form>

          {/* Resumo do plano */}
          <PlanSummary />
        </div>
      </div>
    </main>
  );
}

// ─── Step badge ──────────────────────────────────────────────────────────────

function StepBadge({
  n,
  active,
  done,
  label,
}: {
  n: number;
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition ${
          done
            ? "bg-emerald-600 text-white"
            : active
              ? "bg-emerald-600 text-white"
              : "bg-slate-200 text-slate-500"
        }`}
      >
        {done ? "✓" : n}
      </div>
      <span
        className={`text-sm font-semibold ${active || done ? "text-slate-900" : "text-slate-400"}`}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Step 1: Dados pessoais ──────────────────────────────────────────────────

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
    <div className="space-y-5">
      <div>
        <h2
          className="text-2xl font-semibold text-slate-900"
          style={{ fontFamily: "var(--font-landing-serif)" }}
        >
          Crie sua conta
        </h2>
        <p className="mt-1 text-sm text-slate-500">Seus dados de acesso ao Cliniva.</p>
      </div>

      <Field label="Nome completo">
        <input
          className={inputCls}
          placeholder="Dra. Maria Silva"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          required
        />
      </Field>

      <Field label="Email profissional">
        <input
          type="email"
          className={inputCls}
          placeholder="voce@clinica.com.br"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="CPF">
          <input
            className={inputCls}
            placeholder="000.000.000-00"
            value={form.cpf}
            onChange={(e) => setField("cpf", maskCpf(e.target.value))}
            required
          />
        </Field>

        <Field label="Telefone / WhatsApp">
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
        <Field label="Senha">
          <input
            type="password"
            className={inputCls}
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            required
          />
        </Field>

        <Field label="Confirmar senha">
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
        className="mt-2 w-full rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700"
      >
        Continuar →
      </button>
    </div>
  );
}

// ─── Step 2: Pagamento ───────────────────────────────────────────────────────

const BILLING_LABELS: Record<BillingType, string> = {
  PIX: "PIX",
  BOLETO: "Boleto bancário",
  CREDIT_CARD: "Cartão de crédito",
};

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
    <div className="space-y-5">
      <div>
        <h2
          className="text-2xl font-semibold text-slate-900"
          style={{ fontFamily: "var(--font-landing-serif)" }}
        >
          Forma de pagamento
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Escolha como prefere pagar a assinatura mensal.
        </p>
      </div>

      {/* Seleção de método */}
      <div className="grid grid-cols-3 gap-3">
        {(["PIX", "BOLETO", "CREDIT_CARD"] as BillingType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setField("billingType", type)}
            className={`rounded-xl border px-3 py-2.5 text-center text-sm font-semibold transition ${
              form.billingType === type
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            {BILLING_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Informativo por método */}
      {form.billingType === "PIX" && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm text-emerald-700">
          Após confirmar, você receberá um QR Code PIX para pagar. Sua conta é ativada
          automaticamente após a confirmação do pagamento.
        </div>
      )}
      {form.billingType === "BOLETO" && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-700">
          O boleto vence em 1 dia útil. Sua conta será ativada após a compensação (pode levar até 3
          dias úteis).
        </div>
      )}

      {/* Formulário do cartão */}
      {form.billingType === "CREDIT_CARD" && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-5">
          <Field label="Nome no cartão">
            <input
              className={inputCls}
              placeholder="Como impresso no cartão"
              value={form.card.holderName}
              onChange={(e) => setCardField("holderName", e.target.value.toUpperCase())}
            />
          </Field>

          <Field label="Número do cartão">
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

          <p className="text-xs text-slate-400">
            Seus dados são transmitidos de forma segura (TLS) e processados pelo Asaas.
            Não armazenamos dados do cartão.
          </p>
        </div>
      )}

      {error && <ErrorBox message={error} />}

      {/* Termos */}
      <p className="text-xs text-slate-500">
        Ao confirmar, você concorda com os{" "}
        <Link href="/termos" className="underline hover:text-slate-700">
          Termos de Uso
        </Link>{" "}
        e a{" "}
        <Link href="/privacidade" className="underline hover:text-slate-700">
          Política de Privacidade
        </Link>{" "}
        do Cliniva.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          ← Voltar
        </button>

        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {isLoading ? "Processando…" : "Finalizar assinatura"}
        </button>
      </div>
    </div>
  );
}

// ─── Plan Summary ─────────────────────────────────────────────────────────────

function PlanSummary() {
  const features = [
    "Insights estruturados por sessão",
    "Resumo com evidências e perguntas sugeridas",
    "Histórico completo por paciente",
    "Hipóteses clínicas assistivas, sem diagnósticos",
    "Organização de anotações e transcrições",
    "Ambiente seguro com controle de acesso",
    "Suporte assistido com IA",
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-emerald-100 bg-white/95 p-6 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          Plano Pro
        </p>
        <p className="mt-3 text-3xl font-semibold text-slate-900">
          {formatPrice(29990)}{" "}
          <span className="text-base font-medium text-slate-400">/ mês</span>
        </p>
        <p className="mt-1 text-sm text-slate-500">Cobrado mensalmente. Cancele quando quiser.</p>

        <hr className="my-4 border-slate-100" />

        <ul className="space-y-2.5">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-[20px] border border-amber-100 bg-amber-50/80 p-4">
        <p className="text-xs font-semibold text-amber-800">Aviso clínico</p>
        <p className="mt-1.5 text-xs text-amber-700">
          O Cliniva é uma ferramenta de apoio. Não substitui o julgamento clínico profissional e não
          realiza diagnósticos.
        </p>
      </div>
    </div>
  );
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

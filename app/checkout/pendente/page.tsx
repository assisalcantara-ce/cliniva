"use client";

import { useEffect, useState } from "react";
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

interface CheckoutSession {
  billingType: "PIX" | "BOLETO" | "CREDIT_CARD";
  pixEncodedImage?: string | null;
  pixPayload?: string | null;
  bankSlipUrl?: string | null;
  email?: string | null;
}

export default function CheckoutPendentePage() {
  const [data, setData] = useState<CheckoutSession | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("cliniva_checkout");
    if (raw) {
      try {
        setData(JSON.parse(raw) as CheckoutSession);
      } catch {
        // dado corrompido — ignora
      }
    }
  }, []);

  async function handleCopyPix() {
    if (!data?.pixPayload) return;
    await navigator.clipboard.writeText(data.pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <main
      className={`${serif.variable} ${manrope.variable} min-h-screen bg-[#eef7f4] text-slate-900`}
      style={{ fontFamily: "var(--font-landing-sans)" }}
    >
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.15),transparent_55%)]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
        <Link href="/">
          <img src="/img/logo3.png" alt="Cliniva" className="h-[65px] w-[140px] object-contain" />
        </Link>
        <Link
          href="/checkout"
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          ← Voltar ao formulário
        </Link>
      </header>

      <div className="relative z-10 mx-auto w-full max-w-xl px-6 pb-16 pt-4">
        <div className="rounded-[28px] border border-emerald-100 bg-white/95 p-8 shadow-xl">
          {!data && <LoadingState />}

          {data?.billingType === "PIX" && (
            <PixPanel
              encodedImage={data.pixEncodedImage ?? null}
              payload={data.pixPayload ?? null}
              email={data.email ?? null}
              copied={copied}
              onCopy={handleCopyPix}
            />
          )}

          {data?.billingType === "BOLETO" && (
            <BoletoPanel bankSlipUrl={data.bankSlipUrl ?? null} email={data.email ?? null} />
          )}

          {data?.billingType === "CREDIT_CARD" && (
            <CardPendingPanel email={data.email ?? null} />
          )}
        </div>
      </div>
    </main>
  );
}

// ─── PIX Panel ───────────────────────────────────────────────────────────────

function PixPanel({
  encodedImage,
  payload,
  email,
  copied,
  onCopy,
}: {
  encodedImage: string | null;
  payload: string | null;
  email: string | null;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
        <span className="text-2xl">📱</span>
      </div>

      <div>
        <h1
          className="text-2xl font-semibold text-slate-900"
          style={{ fontFamily: "var(--font-landing-serif)" }}
        >
          Pague com PIX
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Escaneie o QR Code ou copie o código para pagar.
        </p>
      </div>

      {encodedImage ? (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${encodedImage}`}
            alt="QR Code PIX"
            className="h-52 w-52 rounded-xl border border-slate-200 p-2"
          />
        </div>
      ) : (
        <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
          QR Code indisponível. Use o código abaixo.
        </div>
      )}

      {payload && (
        <div className="space-y-2">
          <div className="break-all rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left font-mono text-xs text-slate-600">
            {payload}
          </div>
          <button
            onClick={onCopy}
            className="w-full rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            {copied ? "✓ Copiado!" : "Copiar código PIX"}
          </button>
        </div>
      )}

      <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-700">
        Após o pagamento, sua conta será ativada automaticamente. Você receberá um email de
        confirmação{email ? ` em ${email}` : ""}.
      </div>

      <p className="text-xs text-slate-400">
        O QR Code expira em 24 horas. Em caso de dúvidas,{" "}
        <a href="mailto:contato@cliniva.com.br" className="underline hover:text-slate-600">
          fale conosco
        </a>
        .
      </p>
    </div>
  );
}

// ─── Boleto Panel ─────────────────────────────────────────────────────────────

function BoletoPanel({
  bankSlipUrl,
  email,
}: {
  bankSlipUrl: string | null;
  email: string | null;
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
        <span className="text-2xl">🏦</span>
      </div>

      <div>
        <h1
          className="text-2xl font-semibold text-slate-900"
          style={{ fontFamily: "var(--font-landing-serif)" }}
        >
          Boleto gerado
        </h1>
        <p className="mt-1 text-sm text-slate-500">Pague o boleto até a data de vencimento.</p>
      </div>

      {bankSlipUrl ? (
        <a
          href={bankSlipUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700"
        >
          Abrir boleto bancário ↗
        </a>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Link do boleto indisponível. Verifique seu email{email ? ` (${email})` : ""} ou entre em
          contato com o suporte.
        </div>
      )}

      <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-700">
        Após a compensação bancária (até 3 dias úteis), sua conta será ativada. Você receberá um
        email de confirmação{email ? ` em ${email}` : ""}.
      </div>

      <p className="text-xs text-slate-400">
        Dúvidas?{" "}
        <a href="mailto:contato@cliniva.com.br" className="underline hover:text-slate-600">
          fale conosco
        </a>
        .
      </p>
    </div>
  );
}

// ─── Cartão pendente ──────────────────────────────────────────────────────────

function CardPendingPanel({ email }: { email: string | null }) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <span className="text-2xl">⏳</span>
      </div>

      <div>
        <h1
          className="text-2xl font-semibold text-slate-900"
          style={{ fontFamily: "var(--font-landing-serif)" }}
        >
          Pagamento em análise
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Seu cartão está sendo processado. Isso leva apenas alguns minutos.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm text-emerald-700">
        Assim que o pagamento for aprovado, sua conta será ativada automaticamente
        {email ? ` e você receberá um email em ${email}` : ""}.
      </div>

      <p className="text-xs text-slate-400">
        Dúvidas?{" "}
        <a href="mailto:contato@cliniva.com.br" className="underline hover:text-slate-600">
          fale conosco
        </a>
        .
      </p>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
      <p className="text-sm text-slate-500">Carregando informações de pagamento…</p>
    </div>
  );
}

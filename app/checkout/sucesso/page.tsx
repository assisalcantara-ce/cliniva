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

export default function CheckoutSucessoPage() {
  return (
    <main
      className={`${serif.variable} ${manrope.variable} flex min-h-screen items-center justify-center bg-[#eef7f4] px-6 text-slate-900`}
      style={{ fontFamily: "var(--font-landing-sans)" }}
    >
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(20,184,166,0.18),transparent_55%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-[28px] border border-emerald-100 bg-white/95 p-10 text-center shadow-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <span className="text-3xl">✅</span>
        </div>

        <h1
          className="text-2xl font-semibold text-slate-900"
          style={{ fontFamily: "var(--font-landing-serif)" }}
        >
          Assinatura ativada!
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Seu pagamento foi aprovado. Sua conta Cliniva está pronta para uso.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700"
        >
          Acessar o sistema
        </Link>

        <p className="mt-4 text-xs text-slate-400">
          Dúvidas?{" "}
          <a href="mailto:contato@cliniva.com.br" className="underline hover:text-slate-600">
            contato@cliniva.com.br
          </a>
        </p>
      </div>
    </main>
  );
}

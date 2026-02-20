import Link from "next/link";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-emerald-100 bg-white/70">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-4 md:grid-cols-[1.2fr_0.8fr_1fr]">
        <div className="space-y-3">
          <img src="/img/Logo.png" alt="Cliniva" className="h-[75px] w-[160px] object-contain" />
          <p className="text-sm text-slate-600">
            Copiloto profissional para terapeutas, com apoio de inteligência artificial e foco
            humano.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
            Menu
          </p>
          <div className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <Link href="/" className="hover:text-emerald-700">
              Home
            </Link>
            <Link href="/planos" className="hover:text-emerald-700">
              Planos
            </Link>
            <Link href="/termos" className="hover:text-emerald-700">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-emerald-700">
              Privacidade
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
            Contato
          </p>
          <div className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
            <a href="mailto:contato@cliniva.com.br" className="hover:text-emerald-700">
              contato@cliniva.com.br
            </a>
            <a
              href="https://wa.me/5591981755021"
              className="hover:text-emerald-700"
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp: (91) 98175-5021
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-emerald-100 bg-white/60">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-xs text-slate-500">
          <p>Cliniva. Todos os direitos reservados.</p>
          <p>{year}</p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const slides = [
  {
    eyebrow: "Saúde mental + IA",
    title: "Apoio clínico inteligente para cada sessão.",
    description:
      "Integre inteligência artificial ao seu atendimento com foco em acolhimento, clareza e continuidade.",
    image: "/img/slide1.png",
    cta: "Assinar agora",
  },
  {
    eyebrow: "Copiloto profissional",
    title: "Sugestões que organizam e ampliam suas reflexões.",
    description:
      "Receba temas, perguntas e hipóteses para conduzir conversas mais profundas.",
    image: "/img/slide2.png",
    cta: "Assinar agora",
  },
  {
    eyebrow: "Integração com IA",
    title: "Tecnologia discreta, impacto real no cuidado.",
    description:
      "Insights com evidências, sem diagnósticos, para manter a ética em primeiro lugar.",
    image: "/img/slide3.png",
    cta: "Assinar agora",
  },
];

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(media.matches);

    update();

    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const id = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => window.clearInterval(id);
  }, [reduceMotion]);

  function goTo(index: number) {
    setCurrent((index + slides.length) % slides.length);
  }

  function goNext() {
    goTo(current + 1);
  }

  function goPrev() {
    goTo(current - 1);
  }

  return (
    <div className="relative overflow-hidden rounded-[36px] border border-emerald-100 bg-white/90 shadow-2xl">
      <div className="relative min-h-[420px]">
        {slides.map((slide, index) => (
          <div
            key={slide.title}
            className={`absolute inset-0 grid items-center gap-8 p-8 transition-opacity duration-700 lg:grid-cols-[1.05fr_0.95fr] ${
              index === current ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">
                {slide.eyebrow}
              </p>
              <h1
                className="text-3xl font-semibold text-slate-900 sm:text-4xl"
                style={{ fontFamily: "var(--font-landing-serif)" }}
              >
                {slide.title}
              </h1>
              <p className="text-base text-slate-600">{slide.description}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/planos"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30"
                  aria-label="Ir para planos"
                >
                  {slide.cta}
                </Link>
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                  A Tecnologia a seu favor!
                </span>
              </div>
            </div>
            <div className="relative h-64 overflow-hidden rounded-[28px] border border-emerald-100 sm:h-80">
              <img
                src={slide.image}
                alt="Profissional de saúde mental com tecnologia"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-emerald-100 bg-white/80 px-6 py-4">
        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => goTo(index)}
              className={`h-2.5 w-8 rounded-full transition ${
                index === current ? "bg-emerald-600" : "bg-emerald-200"
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700"
            aria-label="Slide anterior"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700"
            aria-label="Próximo slide"
          >
            Avançar
          </button>
        </div>
      </div>
    </div>
  );
}

import { animate, inView, scroll, stagger } from "motion";
import Lenis from "lenis";

/**
 * Motor de scroll + animaciones DealStudio (Motion + Lenis)
 * ---------------------------------------------------------
 * Uso declarativo desde el HTML:
 *
 *   data-anim="up|down|left|right|fade|zoom|blur"   -> reveal al entrar en viewport
 *   data-anim-delay="0.15"                          -> retraso individual (s)
 *   data-anim-group                                 -> anima a sus hijos [data-anim] en cascada (stagger)
 *   data-parallax="0.2"                             -> parallax vertical ligado al scroll
 *   data-count="1200" [data-count-suffix="+"]       -> contador numérico animado
 *   data-scan-progress                              -> barra que se llena con el scroll de la sección
 *
 * Scroll suave con inercia (Lenis), navegación por anclas suave,
 * barra de progreso global y resaltado de la sección activa en el menú.
 * Respeta prefers-reduced-motion (sin smooth scroll ni animaciones).
 */

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.documentElement.classList.remove("no-js");

let lenis: Lenis | null = null;

/** Scroll suave con inercia (nivel estudio). */
function initSmoothScroll() {
  lenis = new Lenis({
    duration: 1.15,
    // ease-out exponencial: arranca rápido y aterriza suave
    easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.6,
    lerp: 0.1,
  });

  function raf(time: number) {
    lenis!.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

/** Navegación por anclas con desplazamiento suave (respeta el header fijo). */
function initAnchorNav() {
  const headerOffset = -84;
  document.querySelectorAll<HTMLAnchorElement>('a[href*="#"]').forEach((a) => {
    const raw = a.getAttribute("href") || "";
    const hashIndex = raw.indexOf("#");
    if (hashIndex === -1) return;
    const hash = raw.slice(hashIndex); // "#seccion"
    if (hash.length < 2) return;
    const target = document.querySelector(hash);
    if (!target) return;

    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target as HTMLElement, { offset: headerOffset, duration: 1.25 });
      } else {
        (target as HTMLElement).scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      }
      history.pushState(null, "", hash);
    });
  });

  // Si la página carga con un #ancla, aterrizamos ahí de forma controlada.
  if (location.hash.length > 1) {
    const target = document.querySelector(location.hash);
    if (target) {
      requestAnimationFrame(() => {
        if (lenis) lenis.scrollTo(target as HTMLElement, { offset: -84, immediate: true });
      });
    }
  }
}

/** Barra de progreso de lectura ligada al scroll de toda la página. */
function initProgressBar() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;
  scroll(animate(bar, { scaleX: [0, 1] }, { ease: "linear" }));
}

/** Resalta en el menú la sección visible actualmente. */
function initActiveSection() {
  const ids = ["inicio", "servicios", "paquetes", "beneficios", "proceso", "faq"];
  const links = new Map<string, Element>();
  document.querySelectorAll<HTMLAnchorElement>("#navlinks a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const id = href.slice(href.indexOf("#") + 1);
    if (ids.includes(id)) links.set(id, a);
  });

  const setActive = (id: string) => {
    links.forEach((el, key) =>
      el.toggleAttribute("data-active", key === id),
    );
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    },
    { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
  );

  ids.forEach((id) => {
    const sec = document.getElementById(id);
    if (sec) observer.observe(sec);
  });
}

const offsets: Record<string, { x?: number; y?: number; scale?: number; filter?: string }> = {
  up: { y: 40 },
  down: { y: -40 },
  left: { x: 40 },
  right: { x: -40 },
  fade: {},
  zoom: { scale: 0.9 },
  blur: { y: 24, filter: "blur(12px)" },
};

function revealKeyframes(kind: string) {
  const from = offsets[kind] ?? offsets.up;
  const kf: Record<string, unknown> = { opacity: [0, 1] };
  if (from.y != null) kf.transform = [`translateY(${from.y}px)`, "translateY(0px)"];
  if (from.x != null) kf.transform = [`translateX(${from.x}px)`, "translateX(0px)"];
  if (from.scale != null) kf.transform = [`scale(${from.scale})`, "scale(1)"];
  if (from.filter) kf.filter = [from.filter, "blur(0px)"];
  return kf;
}

function initReveals() {
  // Elementos individuales (no dentro de un grupo con stagger)
  const singles = Array.from(
    document.querySelectorAll<HTMLElement>("[data-anim]"),
  ).filter((el) => !el.closest("[data-anim-group]") || el.hasAttribute("data-anim-group"));

  singles.forEach((el) => {
    if (el.hasAttribute("data-anim-group")) return; // los grupos se manejan aparte
    const kind = el.dataset.anim || "up";
    const delay = parseFloat(el.dataset.animDelay || "0");
    inView(
      el,
      () => {
        animate(el, revealKeyframes(kind), {
          duration: 0.7,
          delay,
          ease: [0.16, 1, 0.3, 1], // ease-out expresivo
        });
      },
      { amount: 0.2 },
    );
  });

  // Grupos con cascada
  document.querySelectorAll<HTMLElement>("[data-anim-group]").forEach((group) => {
    // El contenedor del grupo es solo un envoltorio: lo hacemos visible de inmediato
    // (los hijos siguen en opacity:0 hasta que su reveal se dispara).
    group.style.opacity = "1";
    group.style.transform = "none";
    group.style.filter = "none";

    // Solo hijos directos del grupo (evita capturar hijos de grupos anidados)
    const children = Array.from(group.querySelectorAll<HTMLElement>("[data-anim]")).filter(
      (child) => child.closest("[data-anim-group]") === group,
    );
    if (!children.length) return;
    const kind = group.dataset.anim || "up";
    inView(
      group,
      () => {
        animate(children, revealKeyframes(kind), {
          duration: 0.65,
          delay: stagger(0.08),
          ease: [0.16, 1, 0.3, 1],
        });
      },
      { amount: 0.15 },
    );
  });
}

function initParallax() {
  document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    const depth = parseFloat(el.dataset.parallax || "0.2");
    scroll(animate(el, { transform: ["translateY(0px)", `translateY(${depth * -160}px)`] }), {
      target: el,
      offset: ["start end", "end start"],
    });
  });
}

function initCounters() {
  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count || "0");
    const suffix = el.dataset.countSuffix || "";
    const prefix = el.dataset.countPrefix || "";
    const decimals = parseInt(el.dataset.countDecimals || "0", 10);
    el.textContent = `${prefix}0${suffix}`;
    inView(
      el,
      () => {
        animate(0, end, {
          duration: 1.6,
          ease: [0.16, 1, 0.3, 1],
          onUpdate: (v) => {
            el.textContent = `${prefix}${v.toLocaleString("es-MX", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })}${suffix}`;
          },
        });
      },
      { amount: 0.6 },
    );
  });
}

function initScrollProgress() {
  document.querySelectorAll<HTMLElement>("[data-scan-progress]").forEach((el) => {
    scroll(animate(el, { scaleX: [0, 1] }), {
      target: el.closest("[data-scan-section]") || el,
      offset: ["start end", "end start"],
    });
  });
}

/** Efectos cinematográficos ligados al progreso del scroll. */
function initScrollEffects() {
  // Salida del hero: al bajar, el contenido se eleva y se desvanece.
  document.querySelectorAll<HTMLElement>("[data-scroll-out]").forEach((el) => {
    scroll(
      animate(
        el,
        { opacity: [1, 0], transform: ["translateY(0px)", "translateY(-80px)"] },
        { ease: "linear" },
      ),
      { target: el, offset: ["start start", "end start"] },
    );
  });

  // Zoom lento de imágenes conforme su sección atraviesa la pantalla.
  document.querySelectorAll<HTMLElement>("[data-scroll-zoom]").forEach((el) => {
    scroll(
      animate(el, { transform: ["scale(1.05)", "scale(1.25)"] }, { ease: "linear" }),
      {
        target: el.closest("[data-scroll-zoom-section]") || el,
        offset: ["start end", "end start"],
      },
    );
  });
}

function boot() {
  // La navegación por anclas funciona en ambos modos.
  initAnchorNav();

  if (reduce) {
    document.querySelectorAll<HTMLElement>("[data-anim]").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    // Contadores: mostramos directamente el valor final, sin animar.
    document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
      const end = parseFloat(el.dataset.count || "0");
      const decimals = parseInt(el.dataset.countDecimals || "0", 10);
      el.textContent = `${el.dataset.countPrefix || ""}${end.toLocaleString("es-MX", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${el.dataset.countSuffix || ""}`;
    });
    initActiveSection();
    return;
  }

  initSmoothScroll();
  initReveals();
  initParallax();
  initCounters();
  initScrollProgress();
  initScrollEffects();
  initProgressBar();
  initActiveSection();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

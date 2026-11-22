/* ==========================================================================
   APP.JS — PORTADA ALEATORIA, CATÁLOGO, CONFIGURADOR, CARRITO Y NAVEGACIÓN
   Incluye URL con #hash, historial del navegador, gesto táctil para volver
   y clic en toda la tarjeta del producto.
   ========================================================================== */

let CATALOGO = [];
let SELECCION_ALEATORIA_PORTADA = [];

let consolaPortada = "PS5"; // "PS5" | "PS4"
const homeConsoleTabsEl = document.getElementById("homeConsoleTabs");

function generarSeleccionPortada(consola) {
  const disponibles = CATALOGO.filter((juego) =>
    consolasDisponiblesJuego(juego).includes(consola)
  );
  return barajarLista(disponibles).slice(0, CONFIG.cantidadPortadaAleatoria);
}

function sincronizarBotonesConsolaPortada() {
  if (!homeConsoleTabsEl) return;
  homeConsoleTabsEl.querySelectorAll("[data-home-console]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.homeConsole === consolaPortada);
  });
}

let catalogoCompletoAbierto = false;
let sincronizandoHistorial = false;

// Estado de filtros del catálogo completo
let filtroConsola = "TODOS";
let filtroEtiqueta = null; // "PREVENTA" | "OFERTA" | null
let ordenActual = null;     // "AZ" | "MIN" | "MAX" | null
let precioMaximo = 100;
let filtroGenero = "TODAS";

// Estado del configurador activo
let juegoActivo = null;
let versionActivaIdx = 0;
let consolaActiva = null;
let cuentaActiva = "secundaria"; // "primaria" | "secundaria"

let carrito = cargarCarrito();

// Referencias del DOM
const storeNameEl = document.getElementById("storeName");
const catalogViewEl = document.getElementById("catalogView");
const detailViewEl = document.getElementById("detailView");
const filtersPanelEl = document.getElementById("filtersPanel");
const gamesGridEl = document.getElementById("gamesGrid");
const toggleCatalogBtn = document.getElementById("toggleCatalogBtn");
const catalogHeadingEl = document.getElementById("catalogHeading");
const catalogSubheadingEl = document.getElementById("catalogSubheading");
const detailContentEl = document.getElementById("detailContent");
const backToCatalogBtn = document.getElementById("backToCatalogBtn");
const brandHomeBtn = document.getElementById("brandHomeBtn");

const maxPriceRangeEl = document.getElementById("maxPriceRange");
const maxPriceLabelEl = document.getElementById("maxPriceLabel");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const openCartBtn = document.getElementById("openCartBtn");
const cartCountEl = document.getElementById("cartCount");
const cartModalBackdrop = document.getElementById("cartModalBackdrop");
const cartModalBody = document.getElementById("cartModalBody");
const closeCartModalBtn = document.getElementById("closeCartModalBtn");
const toastEl = document.getElementById("toastMsg");

storeNameEl.textContent = CONFIG.nombreTienda;

/* --------------------------------------------------------------------------
   UTILIDADES DE PRECIOS, ALEATORIEDAD Y NAVEGACIÓN (#HASH)
   -------------------------------------------------------------------------- */
function barajarLista(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function actualizarHash(nuevoHash) {
  if (sincronizandoHistorial) return;
  if (window.location.hash !== nuevoHash) {
    window.location.hash = nuevoHash;
  }
}

function obtenerConsolasDeVersion(version, consolaPreferida = null) {
  const consolas = Object.keys(version.consolas || {});
  if (consolaPreferida && consolas.includes(consolaPreferida)) {
    return { consolas, elegida: consolaPreferida };
  }
  return { consolas, elegida: consolas[0] || "PS4" };
}

function precioMinimoJuego(juego, consolaFiltro = "TODOS") {
  let min = Infinity;
  (juego.versiones || []).forEach((ver) => {
    const consolasObj = ver.consolas || {};
    Object.entries(consolasObj).forEach(([cons, precios]) => {
      if (consolaFiltro !== "TODOS" && cons !== consolaFiltro) return;
      const pPrim = parseFloat(precios.primario?.actual ?? Infinity);
      const pSec = parseFloat(precios.secundario?.actual ?? Infinity);
      const candidato = Math.min(pPrim, pSec);
      if (!Number.isNaN(candidato) && candidato < min) {
        min = candidato;
      }
    });
  });
  return min === Infinity ? 0 : min;
}

function consolasDisponiblesJuego(juego) {
  const set = new Set();
  (juego.versiones || []).forEach((ver) => {
    Object.keys(ver.consolas || {}).forEach((c) => set.add(c));
  });
  return Array.from(set);
}

function iconoControlSvg() {
  return `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="2" y="6" width="20" height="12" rx="4"></rect>
      <path d="M8 10v4M6 12h4"></path>
      <circle cx="15" cy="11" r="1"></circle>
      <circle cx="18" cy="13" r="1"></circle>
    </svg>
  `;
}

/* --------------------------------------------------------------------------
   FILTRADO DEL CATÁLOGO COMPLETO
   -------------------------------------------------------------------------- */
function obtenerJuegosFiltrados() {
  let lista = CATALOGO.filter((juego) => {
    const consolas = consolasDisponiblesJuego(juego);

    if (filtroConsola !== "TODOS" && !consolas.includes(filtroConsola)) {
      return false;
    }

    if (filtroEtiqueta === "PREVENTA" && !juego.esPreventa) {
      return false;
    }

    if (filtroEtiqueta === "OFERTA" && !juego.esOferta) {
      return false;
    }

    if (filtroGenero !== "TODAS" && (juego.genero || "") !== filtroGenero) {
      return false;
    }

    const minPrecio = precioMinimoJuego(
      juego,
      filtroConsola === "TODOS" ? "TODOS" : filtroConsola
    );

    if (Number(maxPriceRangeEl.value) < Number(maxPriceRangeEl.max) && minPrecio > precioMaximo) {
      return false;
    }

    return true;
  });

  if (ordenActual === "AZ") {
    lista.sort((a, b) => a.titulo.localeCompare(b.titulo));
  } else if (ordenActual === "MIN") {
    lista.sort((a, b) => precioMinimoJuego(a, filtroConsola) - precioMinimoJuego(b, filtroConsola));
  } else if (ordenActual === "MAX") {
    lista.sort((a, b) => precioMinimoJuego(b, filtroConsola) - precioMinimoJuego(a, filtroConsola));
  }

  return lista;
}

/* --------------------------------------------------------------------------
   RENDERIZADO DE TARJETAS Y CATÁLOGO
   -------------------------------------------------------------------------- */
function renderizarTarjetaJuego(juego, consolaReferencia = "TODOS") {
  const consolas = consolasDisponiblesJuego(juego);
  const etiquetaConsola = consolas.length > 1 ? consolas.join(" / ") : (consolas[0] || "PS4");

  // CAMBIO: antes usaba filtroConsola directo; ahora recibe consolaReferencia
  // para que en portada calcule el "Desde" según PS5 o PS4 elegida.
  const desdePrecio = precioMinimoJuego(juego, consolaReferencia);

  let badgeTop = "";
  if (juego.esOferta) {
    badgeTop = `<span class="badge-top-left badge-oferta">${juego.descuento || "OFERTA"}</span>`;
  } else if (juego.esPreventa) {
    badgeTop = `<span class="badge-top-left badge-preventa">PREVENTA</span>`;
  }

  return `
    <article class="game-card" data-open-game="${juego.id}">
      <div class="cover-box">
        ${badgeTop}
        <span class="badge-console">${etiquetaConsola}</span>
        <img src="${juego.imagen}" alt="${juego.titulo}" loading="lazy" />
      </div>
      <div class="card-content">
        <div>
          <h3 class="card-title">${juego.titulo}</h3>
        </div>
        <div>
          <div class="card-from">Desde</div>
          <div class="card-price-row">
            <span class="card-price">${CONFIG.moneda}${desdePrecio.toFixed(2)}</span>
          </div>
          <div class="card-accounts-hint">${etiquetaConsola} · Primaria o secundaria</div>
          <button type="button" class="details-btn">
            ${iconoControlSvg()}
            <span>Ver Detalles</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function mostrarCatalogo({ actualizarUrl = true } = {}) {
  juegoActivo = null;
  detailViewEl.style.display = "none";
  catalogViewEl.style.display = "block";

  if (actualizarUrl) {
    actualizarHash(catalogoCompletoAbierto ? "#catalogo" : "");
  }

  let listaMostrar = [];
  let consolaPrecio = "TODOS"; // <-- NUEVO: define qué consola usar para mostrar el precio "Desde"

  if (!catalogoCompletoAbierto) {
    // Estamos en la pantalla principal (portada):
    // 1. Mostramos la barra PS5 / PS4 de portada y ocultamos el panel de filtros completo.
    if (homeConsoleTabsEl) homeConsoleTabsEl.style.display = "grid"; // <-- NUEVO
    filtersPanelEl.style.display = "none";
    sincronizarBotonesConsolaPortada(); // <-- NUEVO: marca activo PS5 o PS4 según corresponda

    catalogHeadingEl.textContent = `DESTACADOS ${consolaPortada}`; // <-- CAMBIO
    catalogSubheadingEl.textContent =
      "Alterná entre PS5 y PS4 o recargá para ver una selección aleatoria de 4 juegos.";
    toggleCatalogBtn.textContent = "Abrir catálogo completo y filtros →";
    listaMostrar = SELECCION_ALEATORIA_PORTADA; // <-- CAMBIO: usa los 4 aleatorios de la consola elegida
    consolaPrecio = consolaPortada; // <-- NUEVO
  } else {
    // Estamos en el catálogo completo:
    // 1. Ocultamos la barra de portada y mostramos los filtros avanzados.
    if (homeConsoleTabsEl) homeConsoleTabsEl.style.display = "none"; // <-- NUEVO
    filtersPanelEl.style.display = "block";
    catalogHeadingEl.textContent = "CATÁLOGO COMPLETO";
    catalogSubheadingEl.textContent =
      "Filtrá por consola, estado, precio o género y elegí la configuración de tu juego.";
    toggleCatalogBtn.textContent = "↑ Volver a portada aleatoria";
    listaMostrar = obtenerJuegosFiltrados();
    consolaPrecio = filtroConsola === "TODOS" ? "TODOS" : filtroConsola; // <-- NUEVO
  }

  if (listaMostrar.length === 0) {
    gamesGridEl.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1;">No hay juegos que coincidan con esos filtros.</p>`;
  } else {
    // <-- CAMBIO: pasamos consolaPrecio a renderizarTarjetaJuego
    gamesGridEl.innerHTML = listaMostrar
      .map((juego) => renderizarTarjetaJuego(juego, consolaPrecio))
      .join("");
  }

  // Hace que toda la tarjeta abra el configurador al hacer clic en cualquier parte
  gamesGridEl.querySelectorAll(".game-card[data-open-game]").forEach((card) => {
    card.addEventListener("click", () => {
      const juegoId = card.dataset.openGame;
      if (juegoId) {
        abrirConfiguradorJuego(juegoId);
      }
    });
  });
}

/* --------------------------------------------------------------------------
   CONFIGURADOR DEL JUEGO (01 VERSIÓN → 02 CONSOLA → 03 CUENTA)
   -------------------------------------------------------------------------- */
function abrirConfiguradorJuego(juegoId, { actualizarUrl = true } = {}) {
  const juego = CATALOGO.find((j) => j.id === juegoId);
  if (!juego) {
    mostrarCatalogo({ actualizarUrl: true });
    return;
  }

  juegoActivo = juego;
  versionActivaIdx = 0;
  const primeraVersion = juego.versiones[0];
  consolaActiva = obtenerConsolasDeVersion(primeraVersion).elegida;
  cuentaActiva = "secundaria";

  catalogViewEl.style.display = "none";
  detailViewEl.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (actualizarUrl) {
    actualizarHash(`#juego=${encodeURIComponent(juego.id)}`);
  }

  renderizarConfigurador();
}

function renderizarConfigurador() {
  if (!juegoActivo) return;

  const version = juegoActivo.versiones[versionActivaIdx] || juegoActivo.versiones[0];
  const imagenActual = version.imagen || juegoActivo.imagen;
   const { consolas, elegida } = obtenerConsolasDeVersion(version, consolaActiva);
   
  consolaActiva = elegida;

  const preciosConsola = version.consolas[consolaActiva];
  const precioPrimaria = parseFloat(preciosConsola.primario.actual);
  const precioSecundaria = parseFloat(preciosConsola.secundario.actual);
  const totalActual = cuentaActiva === "primaria" ? precioPrimaria : precioSecundaria;

  const consolasJuego = consolasDisponiblesJuego(juegoActivo);
  const urlWhatsapp = crearUrlWhatsappConfigurado(
    juegoActivo,
    version,
    consolaActiva,
    cuentaActiva,
    totalActual
  );

  const versionesHtml = juegoActivo.versiones
    .map((ver, idx) => {
      const minVer = precioMinimoJuego({ versiones: [ver] }, "TODOS");
      return `
        <button type="button" class="version-option ${idx === versionActivaIdx ? "active" : ""}" data-ver-idx="${idx}">
          <div>
            <strong>${ver.nombre}</strong>
            ${ver.subtitulo ? `<span class="version-sub">${ver.subtitulo}</span>` : ""}
          </div>
          <span class="version-from">desde ${CONFIG.moneda}${minVer.toFixed(0)}</span>
        </button>
      `;
    })
    .join("");

  const consolasHtml = consolas
    .map(
      (cons) => `
      <button type="button" class="console-choice-btn ${cons === consolaActiva ? "active" : ""}" data-cons-val="${cons}">
        ${cons}
      </button>
    `
    )
    .join("");

  const bPrim = CONFIG.beneficiosCuenta.primaria;
  const bSec = CONFIG.beneficiosCuenta.secundaria;

  detailContentEl.innerHTML = `
   <img class="detail-hero-img" src="${imagenActual}" alt="${juegoActivo.titulo}" />
    <h1 class="detail-title">${juegoActivo.titulo}</h1>
    <div class="meta-tags">
      ${consolasJuego.map((c) => `<span class="meta-tag">${c}</span>`).join("")}
      ${juegoActivo.genero ? `<span class="meta-tag">${juegoActivo.genero}</span>` : ""}
      ${juegoActivo.info?.tamano ? `<span class="meta-tag">${juegoActivo.info.tamano}</span>` : ""}
    </div>

    ${juegoActivo.info?.sinopsis ? `<p style="color: var(--text-muted); margin-bottom: 18px;">${juegoActivo.info.sinopsis}</p>` : ""}

    <div class="config-box">
      <h2>Configurá tu compra</h2>

      <div class="step-label">01 · ELEGÍ TU VERSIÓN</div>
      <div class="version-list">${versionesHtml}</div>

      <div class="step-label">02 · ELEGÍ TU CONSOLA</div>
      <div class="console-choice-grid">${consolasHtml}</div>

      <div class="step-label">03 · ELEGÍ TU CUENTA</div>

      <div class="account-card ${cuentaActiva === "primaria" ? "active" : ""}" data-cuenta="primaria">
        <div class="account-top">
          <span class="account-name">Primaria</span>
          <span class="account-pill pill-primaria">${bPrim.etiqueta}</span>
        </div>
        <ul class="account-bullets">
          ${bPrim.puntos.map((p) => `<li><span style="color:${p.ok ? "var(--ok-color)" : "var(--no-color)"}">${p.ok ? "✓" : "✕"}</span> ${p.texto}</li>`).join("")}
        </ul>
        <div class="account-price">${CONFIG.moneda}${precioPrimaria.toFixed(2)}</div>
      </div>

      <div class="account-card ${cuentaActiva === "secundaria" ? "active" : ""}" data-cuenta="secundaria">
        <div class="account-top">
          <span class="account-name">Secundaria</span>
          <span class="account-pill pill-secundaria">${bSec.etiqueta}</span>
        </div>
        <ul class="account-bullets">
          ${bSec.puntos.map((p) => `<li><span style="color:${p.ok ? "var(--ok-color)" : "var(--no-color)"}">${p.ok ? "✓" : "✕"}</span> ${p.texto}</li>`).join("")}
        </ul>
        <div class="account-price">${CONFIG.moneda}${precioSecundaria.toFixed(2)}</div>
      </div>

      <p class="account-help">${CONFIG.ayudaCuentas}</p>

      <div class="total-bar">
        <span>Total:</span>
        <span class="total-amount">${CONFIG.moneda}${totalActual.toFixed(2)}</span>
      </div>

      <div class="detail-actions">
        <button type="button" class="add-cart-btn" id="configAddCartBtn">Añadir al Carrito</button>
        <a class="buy-now-btn" href="${urlWhatsapp}" target="_blank" rel="noopener noreferrer">⚡ COMPRAR AHORA</a>
      </div>
    </div>
  `;

  detailContentEl.querySelectorAll("[data-ver-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      versionActivaIdx = Number(btn.dataset.verIdx);
      consolaActiva = obtenerConsolasDeVersion(juegoActivo.versiones[versionActivaIdx], consolaActiva).elegida;
      renderizarConfigurador();
    });
  });

  detailContentEl.querySelectorAll("[data-cons-val]").forEach((btn) => {
    btn.addEventListener("click", () => {
      consolaActiva = btn.dataset.consVal;
      renderizarConfigurador();
    });
  });

  detailContentEl.querySelectorAll("[data-cuenta]").forEach((card) => {
    card.addEventListener("click", () => {
      cuentaActiva = card.dataset.cuenta;
      renderizarConfigurador();
    });
  });

  document.getElementById("configAddCartBtn").addEventListener("click", () => {
    agregarConfiguracionAlCarrito(juegoActivo, version, consolaActiva, cuentaActiva, totalActual);
  });
}

/* --------------------------------------------------------------------------
   GESTO TÁCTIL DE DESLIZAR PARA VOLVER ATRÁS EN MÓVIL
   -------------------------------------------------------------------------- */
let touchStartX = 0;
let touchStartY = 0;

detailViewEl.addEventListener(
  "touchstart",
  (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  },
  { passive: true }
);

detailViewEl.addEventListener(
  "touchend",
  (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (dx > 85 && Math.abs(dy) < 55) {
      mostrarCatalogo({ actualizarUrl: true });
    }
  },
  { passive: true }
);

/* --------------------------------------------------------------------------
   CARRITO Y WHATSAPP
   -------------------------------------------------------------------------- */
function crearUrlWhatsappConfigurado(juego, version, consola, cuenta, precio) {
  const cuentaTexto = cuenta === "primaria" ? "Primaria" : "Secundaria";
  const msg = encodeURIComponent(
    `Hola ${CONFIG.nombreTienda}! Quiero comprar:\n• ${juego.titulo}\n• Versión: ${version.nombre}\n• Consola: ${consola}\n• Cuenta: ${cuentaTexto}\n• Total: ${CONFIG.moneda}${precio.toFixed(2)}`
  );
  return `https://wa.me/${CONFIG.whatsappNumero}?text=${msg}`;
}

function cargarCarrito() {
  try {
    return JSON.parse(localStorage.getItem("geekstop_v2_carrito") || "[]");
  } catch (e) {
    return [];
  }
}

function guardarCarrito() {
  try {
    localStorage.setItem("geekstop_v2_carrito", JSON.stringify(carrito));
  } catch (e) {}
  actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
  const totalUnidades = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  cartCountEl.textContent = totalUnidades;
}

function mostrarToast(texto) {
  toastEl.textContent = texto;
  toastEl.classList.add("show");
  clearTimeout(mostrarToast.t);
  mostrarToast.t = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function agregarConfiguracionAlCarrito(juego, version, consola, cuenta, precio) {
  const cuentaTexto = cuenta === "primaria" ? "Primaria" : "Secundaria";
  const clave = `${juego.id}__${version.id}__${consola}__${cuenta}`;
  const existente = carrito.find((i) => i.clave === clave);

  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({
      clave,
      titulo: juego.titulo,
      versionNombre: version.nombre,
      consola,
      cuentaTexto,
      precio,
      cantidad: 1
    });
  }

  guardarCarrito();
  mostrarToast(`Añadido: ${juego.titulo} (${consola} · ${cuentaTexto})`);
}

function renderizarCarrito() {
  if (carrito.length === 0) {
    cartModalBody.innerHTML = `<p style="color: var(--text-muted);">Tu carrito está vacío.</p>`;
    return;
  }

  let total = 0;
  const itemsHtml = carrito
    .map((item, idx) => {
      const sub = item.precio * item.cantidad;
      total += sub;
      return `
        <div class="cart-item">
          <div>
            <div class="cart-item-title">${item.titulo}</div>
            <div class="cart-item-meta">${item.versionNombre} · ${item.consola} · ${item.cuentaTexto} (${CONFIG.moneda}${item.precio.toFixed(2)})</div>
          </div>
          <div class="cart-qty-controls">
            <button type="button" class="qty-btn" data-d="-1" data-i="${idx}">-</button>
            <span>${item.cantidad}</span>
            <button type="button" class="qty-btn" data-d="1" data-i="${idx}">+</button>
          </div>
        </div>
      `;
    })
    .join("");

  const lineasWa = carrito
    .map(
      (item, i) =>
        `${i + 1}. ${item.titulo} [${item.versionNombre} | ${item.consola} | ${item.cuentaTexto}] x${item.cantidad} = ${CONFIG.moneda}${(item.precio * item.cantidad).toFixed(2)}`
    )
    .join("\n");

  const urlWa = `https://wa.me/${CONFIG.whatsappNumero}?text=${encodeURIComponent(
    `Hola ${CONFIG.nombreTienda}! Quiero enviar este pedido:\n\n${lineasWa}\n\nTotal: ${CONFIG.moneda}${total.toFixed(2)}`
  )}`;

  cartModalBody.innerHTML = `
    ${itemsHtml}
    <div class="total-bar" style="margin-top:12px;">
      <span>Total:</span>
      <span class="total-amount">${CONFIG.moneda}${total.toFixed(2)}</span>
    </div>
    <a class="buy-now-btn" style="width:100%;" href="${urlWa}" target="_blank" rel="noopener noreferrer">
      Enviar pedido por WhatsApp
    </a>
  `;

  cartModalBody.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.i);
      const delta = Number(btn.dataset.d);
      carrito[idx].cantidad += delta;
      if (carrito[idx].cantidad <= 0) carrito.splice(idx, 1);
      guardarCarrito();
      renderizarCarrito();
    });
  });
}

/* --------------------------------------------------------------------------
   EVENTOS DE NAVEGACIÓN, HASH Y FILTROS
   -------------------------------------------------------------------------- */
function aplicarEstadoDesdeHash() {
  sincronizandoHistorial = true;
  const hash = window.location.hash || "";
   
if (homeConsoleTabsEl) {
  homeConsoleTabsEl.querySelectorAll("[data-home-console]").forEach((btn) => {
    btn.addEventListener("click", () => {
      consolaPortada = btn.dataset.homeConsole;
      SELECCION_ALEATORIA_PORTADA = generarSeleccionPortada(consolaPortada);
      mostrarCatalogo({ actualizarUrl: false });
    });
  });
}
   
  if (hash.startsWith("#juego=")) {
    const idJuego = decodeURIComponent(hash.replace("#juego=", ""));
    abrirConfiguradorJuego(idJuego, { actualizarUrl: false });
  } else if (hash === "#catalogo") {
    catalogoCompletoAbierto = true;
    mostrarCatalogo({ actualizarUrl: false });
  } else {
    catalogoCompletoAbierto = false;
    mostrarCatalogo({ actualizarUrl: false });
  }

  sincronizandoHistorial = false;
}

window.addEventListener("hashchange", aplicarEstadoDesdeHash);

toggleCatalogBtn.addEventListener("click", () => {
  catalogoCompletoAbierto = !catalogoCompletoAbierto;
  mostrarCatalogo({ actualizarUrl: true });
});

backToCatalogBtn.addEventListener("click", () => mostrarCatalogo({ actualizarUrl: true }));
brandHomeBtn.addEventListener("click", () => {
  catalogoCompletoAbierto = false;
  mostrarCatalogo({ actualizarUrl: true });
});

document.querySelectorAll("#consoleFilters .pill-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#consoleFilters .pill-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    filtroConsola = btn.dataset.console;
    mostrarCatalogo({ actualizarUrl: false });
  });
});

document.querySelectorAll("#tagFilters .pill-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tag = btn.dataset.tag;
    if (filtroEtiqueta === tag) {
      filtroEtiqueta = null;
      btn.classList.remove("active");
    } else {
      document.querySelectorAll("#tagFilters .pill-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filtroEtiqueta = tag;
    }
    mostrarCatalogo({ actualizarUrl: false });
  });
});

document.querySelectorAll("#sortFilters .pill-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sort = btn.dataset.sort;
    if (ordenActual === sort) {
      ordenActual = null;
      btn.classList.remove("active");
    } else {
      document.querySelectorAll("#sortFilters .pill-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      ordenActual = sort;
    }
    mostrarCatalogo({ actualizarUrl: false });
  });
});

document.querySelectorAll("#genreBar .genre-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("#genreBar .genre-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    filtroGenero = chip.dataset.genre;
    mostrarCatalogo({ actualizarUrl: false });
  });
});

maxPriceRangeEl.addEventListener("input", () => {
  precioMaximo = Number(maxPriceRangeEl.value);
  maxPriceLabelEl.textContent =
    precioMaximo >= Number(maxPriceRangeEl.max) ? "sin límite" : `${CONFIG.moneda}${precioMaximo}`;
  mostrarCatalogo({ actualizarUrl: false });
});

clearFiltersBtn.addEventListener("click", () => {
  filtroConsola = "TODOS";
  filtroEtiqueta = null;
  ordenActual = null;
  filtroGenero = "TODAS";
  maxPriceRangeEl.value = maxPriceRangeEl.max;
  precioMaximo = Number(maxPriceRangeEl.max);
  maxPriceLabelEl.textContent = "sin límite";

  document.querySelectorAll("#consoleFilters .pill-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.console === "TODOS");
  });
  document.querySelectorAll("#tagFilters .pill-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll("#sortFilters .pill-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll("#genreBar .genre-chip").forEach((c) => {
    c.classList.toggle("active", c.dataset.genre === "TODAS");
  });

  mostrarCatalogo({ actualizarUrl: false });
});

openCartBtn.addEventListener("click", () => {
  renderizarCarrito();
  cartModalBackdrop.classList.add("open");
  cartModalBackdrop.setAttribute("aria-hidden", "false");
});

closeCartModalBtn.addEventListener("click", () => {
  cartModalBackdrop.classList.remove("open");
  cartModalBackdrop.setAttribute("aria-hidden", "true");
});

cartModalBackdrop.addEventListener("click", (e) => {
  if (e.target === cartModalBackdrop) {
    cartModalBackdrop.classList.remove("open");
    cartModalBackdrop.setAttribute("aria-hidden", "true");
  }
});

/* --------------------------------------------------------------------------
   CARGA INICIAL
   -------------------------------------------------------------------------- */
async function iniciarTienda() {
  try {
    const resp = await fetch(FUENTES_DATOS.juegos, { cache: "no-store" });
    if (!resp.ok) throw new Error("Error cargando JSON");
    CATALOGO = await resp.json();

    // Selecciona 4 productos al azar en cada recarga
    SELECCION_ALEATORIA_PORTADA = generarSeleccionPortada(consolaPortada);

    actualizarContadorCarrito();
    aplicarEstadoDesdeHash();
  } catch (err) {
    gamesGridEl.innerHTML = `<p style="color: var(--no-color); grid-column: 1 / -1;">No se pudo cargar <strong>productosjuegos.json</strong>. Revisá que exista y tenga JSON válido.</p>`;
  }
}

iniciarTienda();

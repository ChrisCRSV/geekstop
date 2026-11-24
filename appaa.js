/* ==========================================================================
   APP.JS — PORTADA ALEATORIA, CATÁLOGO, CONFIGURADOR DINÁMICO, CARRITO Y WA
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
   UTILIDADES DE PRECIOS, IMÁGENES, VERSIONES Y NAVEGACIÓN (#HASH)
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

function parsePrecio(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const num = parseFloat(String(valor).replace(",", "."));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function resolverImagenValida(rutaVersion, rutaBase) {
  const limpia = (rutaVersion || "").trim();
  if (limpia && !limpia.endsWith("/")) {
    return limpia;
  }
  return (rutaBase || "").trim();
}

function obtenerVersionesJuego(juego) {
  if (Array.isArray(juego?.versiones) && juego.versiones.length > 0) {
    return juego.versiones;
  }
  // Respaldo seguro si un producto no trae arreglo versiones
  return [
    {
      id: "standard",
      titulo: juego?.titulo || "Juego",
      nombre: "Standard Edition",
      consolas: juego?.consolas || {}
    }
  ];
}

function tieneMultiplesVersiones(juego) {
  return obtenerVersionesJuego(juego).length > 1;
}

function obtenerTituloActivo(juego, version) {
  const tituloVer = (version?.titulo || "").trim();
  if (tituloVer) return tituloVer;
  return juego?.titulo || "";
}

function obtenerConsolasDeVersion(version, consolaPreferida = null) {
  const consolas = Object.keys(version?.consolas || {}).filter((cons) => {
    const datos = version.consolas[cons];
    return datos && (parsePrecio(datos.primario?.actual) !== null || parsePrecio(datos.secundario?.actual) !== null);
  });

  if (consolaPreferida && consolas.includes(consolaPreferida)) {
    return { consolas, elegida: consolaPreferida };
  }
  return { consolas, elegida: consolas[0] || "PS4" };
}

function resumenPreciosMinimosJuego(juego, consolaFiltro = "TODOS") {
  let minActual = Infinity;
  let anteriorAsociado = null;

  obtenerVersionesJuego(juego).forEach((ver) => {
    const consolasObj = ver.consolas || {};
    Object.entries(consolasObj).forEach(([cons, precios]) => {
      if (consolaFiltro !== "TODOS" && cons !== consolaFiltro) return;

      ["secundario", "primario"].forEach((tipo) => {
        const actual = parsePrecio(precios?.[tipo]?.actual);
        const anterior = parsePrecio(precios?.[tipo]?.anterior);
        if (actual !== null && actual < minActual) {
          minActual = actual;
          anteriorAsociado = anterior && anterior > actual ? anterior : null;
        }
      });
    });
  });

  return {
    actual: minActual === Infinity ? 0 : minActual,
    anterior: anteriorAsociado
  };
}

function precioMinimoJuego(juego, consolaFiltro = "TODOS") {
  return resumenPreciosMinimosJuego(juego, consolaFiltro).actual;
}

function consolasDisponiblesJuego(juego) {
  const set = new Set();
  obtenerVersionesJuego(juego).forEach((ver) => {
    const { consolas } = obtenerConsolasDeVersion(ver);
    consolas.forEach((c) => set.add(c));
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
  const { actual: desdePrecio, anterior: desdeAnterior } = resumenPreciosMinimosJuego(juego, consolaReferencia);

  let badgeTop = "";
  if (juego.esOferta) {
    badgeTop = `<span class="badge-top-left badge-oferta">${juego.descuento || "OFERTA"}</span>`;
  } else if (juego.esPreventa) {
    badgeTop = `<span class="badge-top-left badge-preventa">PREVENTA</span>`;
  }

  const precioAnteriorHtml = desdeAnterior
    ? `<span class="card-price-old">${CONFIG.moneda}${desdeAnterior.toFixed(2)}</span>`
    : "";

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
            ${precioAnteriorHtml}
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
  let consolaPrecio = "TODOS";

  if (!catalogoCompletoAbierto) {
    if (homeConsoleTabsEl) homeConsoleTabsEl.style.display = "grid";
    filtersPanelEl.style.display = "none";
    sincronizarBotonesConsolaPortada();

    catalogHeadingEl.textContent = `DESTACADOS ${consolaPortada}`;
    catalogSubheadingEl.textContent =
      "Alterná entre PS5 y PS4 o recargá para ver una selección aleatoria de 4 juegos.";
    toggleCatalogBtn.textContent = "Abrir catálogo completo y filtros →";
    listaMostrar = SELECCION_ALEATORIA_PORTADA;
    consolaPrecio = consolaPortada;
  } else {
    if (homeConsoleTabsEl) homeConsoleTabsEl.style.display = "none";
    filtersPanelEl.style.display = "block";
    catalogHeadingEl.textContent = "CATÁLOGO COMPLETO";
    catalogSubheadingEl.textContent =
      "Filtrá por consola, estado, precio o género y elegí la configuración de tu juego.";
    toggleCatalogBtn.textContent = "↑ Volver a portada aleatoria";
    listaMostrar = obtenerJuegosFiltrados();
    consolaPrecio = filtroConsola === "TODOS" ? "TODOS" : filtroConsola;
  }

  if (listaMostrar.length === 0) {
    gamesGridEl.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1;">No hay juegos que coincidan con esos filtros.</p>`;
  } else {
    gamesGridEl.innerHTML = listaMostrar
      .map((juego) => renderizarTarjetaJuego(juego, consolaPrecio))
      .join("");
  }

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
   CONFIGURADOR DINÁMICO DEL JUEGO
   - Oculta versión si solo hay 1
   - Cambia título e imagen al cambiar de versión
   - Muestra solo la consola disponible si es una sola
   - Muestra precios anteriores tachados y oculta cuentas no disponibles
   -------------------------------------------------------------------------- */
function abrirConfiguradorJuego(juegoId, { actualizarUrl = true } = {}) {
  const juego = CATALOGO.find((j) => j.id === juegoId);
  if (!juego) {
    mostrarCatalogo({ actualizarUrl: true });
    return;
  }

  juegoActivo = juego;
  versionActivaIdx = 0;
  const versiones = obtenerVersionesJuego(juego);
  const primeraVersion = versiones[0];
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

function construirIncluyeHtml(version) {
  const incluyeItems = Array.isArray(version?.incluye)
    ? version.incluye.filter(Boolean)
    : [];
  if (!incluyeItems.length) return "";
  return `
    <div class="edition-includes-box">
      <div class="edition-includes-title">Esta edición incluye</div>
      <ul class="edition-includes-list">
        ${incluyeItems.map((item) => `<li class="edition-includes-item">${item}</li>`).join("")}
      </ul>
    </div>
  `;
}

function animarElementosConfigurador(selector) {
  detailContentEl.querySelectorAll(selector).forEach((el) => {
    el.classList.remove("edicion-animada");
    void el.offsetWidth;
    el.classList.add("edicion-animada");
  });
}

function obtenerDatosSeleccionConfigurador() {
  const versiones = obtenerVersionesJuego(juegoActivo);
  const version = versiones[versionActivaIdx] || versiones[0];
  const { consolas, elegida } = obtenerConsolasDeVersion(version, consolaActiva);
  consolaActiva = elegida;

  const tituloActivo = obtenerTituloActivo(juegoActivo, version);
  const preciosConsola = version?.consolas?.[consolaActiva] || {};

  const precioPrimaria = parsePrecio(preciosConsola.primario?.actual);
  const anteriorPrimaria = parsePrecio(preciosConsola.primario?.anterior);
  const tienePrimaria = precioPrimaria !== null;

  const precioSecundaria = parsePrecio(preciosConsola.secundario?.actual);
  const anteriorSecundaria = parsePrecio(preciosConsola.secundario?.anterior);
  const tieneSecundaria = precioSecundaria !== null;

  // Asegurar que cuentaActiva siempre apunte a una opción disponible
  if (cuentaActiva === "secundaria" && !tieneSecundaria && tienePrimaria) {
    cuentaActiva = "primaria";
  } else if (cuentaActiva === "primaria" && !tienePrimaria && tieneSecundaria) {
    cuentaActiva = "secundaria";
  }

  const totalActual =
    cuentaActiva === "primaria"
      ? (precioPrimaria ?? 0)
      : (precioSecundaria ?? 0);

  const urlWhatsapp = crearUrlWhatsappConfigurado(
    tituloActivo,
    version,
    consolaActiva,
    cuentaActiva,
    totalActual,
    tieneMultiplesVersiones(juegoActivo)
  );

  return {
    version,
    tituloActivo,
    consolas,
    precioPrimaria,
    anteriorPrimaria,
    tienePrimaria,
    precioSecundaria,
    anteriorSecundaria,
    tieneSecundaria,
    totalActual,
    urlWhatsapp
  };
}

function renderizarBloquePreciosCuenta(actual, anterior) {
  if (actual === null) return "";
  const tachado =
    anterior !== null && anterior > actual
      ? `<span class="account-price-old">${CONFIG.moneda}${anterior.toFixed(2)}</span>`
      : "";
  return `
    <span class="account-price">${CONFIG.moneda}${actual.toFixed(2)}</span>
    ${tachado}
  `;
}

// Actualiza precios, cuentas disponibles, total, carrito y WhatsApp sin recargar la imagen
function actualizarPreciosYSeleccion({ animar = true } = {}) {
  if (!juegoActivo) return;

  const {
    version,
    tituloActivo,
    precioPrimaria,
    anteriorPrimaria,
    tienePrimaria,
    precioSecundaria,
    anteriorSecundaria,
    tieneSecundaria,
    totalActual,
    urlWhatsapp
  } = obtenerDatosSeleccionConfigurador();

  // Botón de consola activo
  detailContentEl.querySelectorAll("[data-cons-val]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.consVal === consolaActiva);
  });

  // Tarjeta Primaria
  const cardPrim = detailContentEl.querySelector('[data-cuenta="primaria"]');
  if (cardPrim) {
    cardPrim.style.display = tienePrimaria ? "block" : "none";
    cardPrim.classList.toggle("active", cuentaActiva === "primaria");
    const rowPrim = cardPrim.querySelector(".account-price-row");
    if (rowPrim && tienePrimaria) {
      rowPrim.innerHTML = renderizarBloquePreciosCuenta(precioPrimaria, anteriorPrimaria);
    }
  }

  // Tarjeta Secundaria
  const cardSec = detailContentEl.querySelector('[data-cuenta="secundaria"]');
  if (cardSec) {
    cardSec.style.display = tieneSecundaria ? "block" : "none";
    cardSec.classList.toggle("active", cuentaActiva === "secundaria");
    const rowSec = cardSec.querySelector(".account-price-row");
    if (rowSec && tieneSecundaria) {
      rowSec.innerHTML = renderizarBloquePreciosCuenta(precioSecundaria, anteriorSecundaria);
    }
  }

  // Total
  const totalEl = detailContentEl.querySelector(".total-amount");
  if (totalEl) {
    totalEl.textContent = `${CONFIG.moneda}${totalActual.toFixed(2)}`;
  }

  // Enlace de WhatsApp
  const buyBtn = detailContentEl.querySelector(".buy-now-btn");
  if (buyBtn) {
    buyBtn.setAttribute("href", urlWhatsapp);
  }

  // Re-enlazar botón "Añadir al Carrito" con los valores vigentes
  const oldAddBtn = document.getElementById("configAddCartBtn");
  if (oldAddBtn) {
    const newAddBtn = oldAddBtn.cloneNode(true);
    oldAddBtn.replaceWith(newAddBtn);
    newAddBtn.addEventListener("click", () => {
      agregarConfiguracionAlCarrito(
        juegoActivo,
        tituloActivo,
        version,
        consolaActiva,
        cuentaActiva,
        totalActual
      );
    });
  }

  if (animar) {
    animarElementosConfigurador(".account-price-row, .total-amount");
  }
}

function renderizarConfigurador({ animarEdicion = false } = {}) {
  if (!juegoActivo) return;

  const {
    version,
    tituloActivo,
    consolas,
    precioPrimaria,
    anteriorPrimaria,
    tienePrimaria,
    precioSecundaria,
    anteriorSecundaria,
    tieneSecundaria,
    totalActual,
    urlWhatsapp
  } = obtenerDatosSeleccionConfigurador();

  const versiones = obtenerVersionesJuego(juegoActivo);
  const mostrarVersiones = versiones.length > 1;
  const imagenActual = resolverImagenValida(version?.imagen, juegoActivo.imagen);
  const incluyeHtml = construirIncluyeHtml(version);
  const consolasJuego = consolasDisponiblesJuego(juegoActivo);

  // Numeración dinámica de pasos (01, 02, 03)
  let numeroPaso = 1;
  const formatoPaso = () => String(numeroPaso++).padStart(2, "0");

  // Paso de versión (solo si hay más de 1 versión)
  let bloqueVersionesHtml = "";
  if (mostrarVersiones) {
    const pasoVer = formatoPaso();
    const versionesItemsHtml = versiones
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

    bloqueVersionesHtml = `
      <div class="step-label">${pasoVer} · ELEGÍ TU VERSIÓN</div>
      <div class="version-list">${versionesItemsHtml}</div>
      <div id="editionIncludesSlot">${incluyeHtml}</div>
    `;
  } else if (incluyeHtml) {
    // Si tiene 1 sola versión pero incluye listado de contenido extra, lo mostramos limpio sin selector
    bloqueVersionesHtml = `<div id="editionIncludesSlot">${incluyeHtml}</div>`;
  }

  // Paso de consola (1 botón si solo hay 1 consola disponible, o 2 si hay PS4 y PS5)
  const pasoConsola = formatoPaso();
  const etiquetaPasoConsola =
    consolas.length === 1
      ? `${pasoConsola} · CONSOLA DISPONIBLE`
      : `${pasoConsola} · ELEGÍ TU CONSOLA`;

  const consolasHtml = consolas
    .map(
      (cons) => `
      <button type="button" class="console-choice-btn ${cons === consolaActiva ? "active" : ""}" data-cons-val="${cons}">
        ${cons}
      </button>
    `
    )
    .join("");

  // Paso de cuenta
  const pasoCuenta = formatoPaso();
  const bPrim = CONFIG.beneficiosCuenta.primaria;
  const bSec = CONFIG.beneficiosCuenta.secundaria;

  let badgeEstadoHtml = "";
  if (juegoActivo.esOferta) {
    badgeEstadoHtml = `<span class="meta-tag meta-tag-oferta">${juegoActivo.descuento || "OFERTA"}</span>`;
  } else if (juegoActivo.esPreventa) {
    badgeEstadoHtml = `<span class="meta-tag meta-tag-preventa">PREVENTA</span>`;
  }

  detailContentEl.innerHTML = `
    <img class="detail-hero-img" src="${imagenActual}" alt="${tituloActivo}" />
    <h1 class="detail-title" id="detailGameTitle">${tituloActivo}</h1>
    <div class="meta-tags">
      ${badgeEstadoHtml}
      ${consolasJuego.map((c) => `<span class="meta-tag">${c}</span>`).join("")}
      ${juegoActivo.genero ? `<span class="meta-tag">${juegoActivo.genero}</span>` : ""}
    </div>

    ${juegoActivo.info?.sinopsis ? `<p style="color: var(--text-muted); margin-bottom: 18px;">${juegoActivo.info.sinopsis}</p>` : ""}

    <div class="config-box">
      <h2>Configurá tu compra</h2>

      ${bloqueVersionesHtml}

      <div class="step-label">${etiquetaPasoConsola}</div>
      <div class="console-choice-grid ${consolas.length === 1 ? "single-console" : ""}">${consolasHtml}</div>

      <div class="step-label">${pasoCuenta} · ELEGÍ TU CUENTA</div>

      <div class="account-card ${cuentaActiva === "primaria" ? "active" : ""}" data-cuenta="primaria" style="display: ${tienePrimaria ? "block" : "none"};">
        <div class="account-top">
          <span class="account-name">Primaria</span>
          <span class="account-pill pill-primaria">${bPrim.etiqueta}</span>
        </div>
        <ul class="account-bullets">
          ${bPrim.puntos.map((p) => `<li><span style="color:${p.ok ? "var(--ok-color)" : "var(--no-color)"}">${p.ok ? "✓" : "✕"}</span> ${p.texto}</li>`).join("")}
        </ul>
        <div class="account-price-row">
          ${renderizarBloquePreciosCuenta(precioPrimaria, anteriorPrimaria)}
        </div>
      </div>

      <div class="account-card ${cuentaActiva === "secundaria" ? "active" : ""}" data-cuenta="secundaria" style="display: ${tieneSecundaria ? "block" : "none"};">
        <div class="account-top">
          <span class="account-name">Secundaria</span>
          <span class="account-pill pill-secundaria">${bSec.etiqueta}</span>
        </div>
        <ul class="account-bullets">
          ${bSec.puntos.map((p) => `<li><span style="color:${p.ok ? "var(--ok-color)" : "var(--no-color)"}">${p.ok ? "✓" : "✕"}</span> ${p.texto}</li>`).join("")}
        </ul>
        <div class="account-price-row">
          ${renderizarBloquePreciosCuenta(precioSecundaria, anteriorSecundaria)}
        </div>
      </div>

      <p class="account-help">${CONFIG.ayudaCuentas}</p>
      ${CONFIG.notaEntrega ? `<p class="delivery-note">${CONFIG.notaEntrega}</p>` : ""}

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

  // 1. Cambio de VERSIÓN: actualiza título, imagen, "Esta edición incluye", consolas y precios
  detailContentEl.querySelectorAll("[data-ver-idx]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nuevoIdx = Number(btn.dataset.verIdx);
      if (nuevoIdx === versionActivaIdx) return;
      versionActivaIdx = nuevoIdx;
      consolaActiva = obtenerConsolasDeVersion(
        versiones[versionActivaIdx],
        consolaActiva
      ).elegida;
      renderizarConfigurador({ animarEdicion: true });
    });
  });

  // 2. Cambio de CONSOLA
  detailContentEl.querySelectorAll("[data-cons-val]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.consVal === consolaActiva) return;
      consolaActiva = btn.dataset.consVal;
      actualizarPreciosYSeleccion({ animar: true });
    });
  });

  // 3. Cambio de CUENTA
  detailContentEl.querySelectorAll("[data-cuenta]").forEach((card) => {
    card.addEventListener("click", () => {
      if (card.dataset.cuenta === cuentaActiva) return;
      cuentaActiva = card.dataset.cuenta;
      actualizarPreciosYSeleccion({ animar: true });
    });
  });

  // 4. Botón Añadir al Carrito
  document.getElementById("configAddCartBtn").addEventListener("click", () => {
    const actual = obtenerDatosSeleccionConfigurador();
    agregarConfiguracionAlCarrito(
      juegoActivo,
      actual.tituloActivo,
      actual.version,
      consolaActiva,
      cuentaActiva,
      actual.totalActual
    );
  });

  if (animarEdicion) {
    animarElementosConfigurador(
      ".detail-hero-img, #detailGameTitle, #editionIncludesSlot, .console-choice-grid, .account-price-row, .total-amount"
    );
  }
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
   CARRITO Y WHATSAPP (USA EL TÍTULO ACTUALIZADO DE LA VERSIÓN ELEGIDA)
   -------------------------------------------------------------------------- */
function crearUrlWhatsappConfigurado(tituloFinal, version, consola, cuenta, precio, conMultiplesVersiones) {
  const cuentaTexto = cuenta === "primaria" ? "Primaria" : "Secundaria";
  const lineas = [
    `Hola ${CONFIG.nombreTienda}! Quiero comprar:`,
    `• ${tituloFinal}`
  ];

  if (conMultiplesVersiones && version?.nombre) {
    lineas.push(`• Edición: ${version.nombre}`);
  }

  lineas.push(`• Consola: ${consola}`);
  lineas.push(`• Cuenta: ${cuentaTexto}`);
  lineas.push(`• Total: ${CONFIG.moneda}${precio.toFixed(2)}`);

  const msg = encodeURIComponent(lineas.join("\n"));
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

function agregarConfiguracionAlCarrito(juego, tituloFinal, version, consola, cuenta, precio) {
  const cuentaTexto = cuenta === "primaria" ? "Primaria" : "Secundaria";
  const conMultiplesVersiones = tieneMultiplesVersiones(juego);
  const clave = `${juego.id}__${version.id}__${consola}__${cuenta}`;
  const existente = carrito.find((i) => i.clave === clave);

  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({
      clave,
      titulo: tituloFinal,
      versionNombre: conMultiplesVersiones ? version.nombre : "",
      consola,
      cuentaTexto,
      precio,
      cantidad: 1
    });
  }

  guardarCarrito();
  mostrarToast(`Añadido: ${tituloFinal} (${consola} · ${cuentaTexto})`);
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
      const detalleMeta = [
        item.versionNombre,
        item.consola,
        item.cuentaTexto
      ]
        .filter(Boolean)
        .join(" · ");

      return `
        <div class="cart-item">
          <div>
            <div class="cart-item-title">${item.titulo}</div>
            <div class="cart-item-meta">${detalleMeta} (${CONFIG.moneda}${item.precio.toFixed(2)})</div>
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
    .map((item, i) => {
      const partes = [item.versionNombre, item.consola, item.cuentaTexto].filter(Boolean).join(" | ");
      return `${i + 1}. ${item.titulo} [${partes}] x${item.cantidad} = ${CONFIG.moneda}${(item.precio * item.cantidad).toFixed(2)}`;
    })
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
if (homeConsoleTabsEl) {
  homeConsoleTabsEl.querySelectorAll("[data-home-console]").forEach((btn) => {
    btn.addEventListener("click", () => {
      consolaPortada = btn.dataset.homeConsole;
      SELECCION_ALEATORIA_PORTADA = generarSeleccionPortada(consolaPortada);
      mostrarCatalogo({ actualizarUrl: false });
    });
  });
}

function aplicarEstadoDesdeHash() {
  sincronizandoHistorial = true;
  const hash = window.location.hash || "";

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

    SELECCION_ALEATORIA_PORTADA = generarSeleccionPortada(consolaPortada);

    actualizarContadorCarrito();
    aplicarEstadoDesdeHash();
  } catch (err) {
    gamesGridEl.innerHTML = `<p style="color: var(--no-color); grid-column: 1 / -1;">No se pudo cargar <strong>productosjuegos.json</strong>. Revisá que exista y tenga JSON válido.</p>`;
  }
}

iniciarTienda();

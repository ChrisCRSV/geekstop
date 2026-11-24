/* ==========================================================================
   APP.JS — PORTADA ALEATORIA, CATÁLOGO JUEGOS + STREAMING, CARRITO Y WA
   ========================================================================== */

let CATALOGO_JUEGOS = [];
let CATALOGO_STREAMING = [];
let SELECCION_ALEATORIA_PORTADA = [];

let consolaPortada = "PS5"; // "PS5" | "PS4"
const homeConsoleTabsEl = document.getElementById("homeConsoleTabs");

let catalogoCompletoAbierto = false;
let categoriaCatalogoActiva = "juego"; // "juego" | "streaming"
let sincronizandoHistorial = false;

// Estado de filtros de JUEGOS
let filtroConsola = "TODOS";
let filtroEtiqueta = null; // "PREVENTA" | "OFERTA" | null
let ordenActual = null;     // "AZ" | "MIN" | "MAX" | null
let precioMaximo = 100;
let filtroGenero = "TODAS";

// Estado de filtros de STREAMING
let filtroPlataformaStreaming = "TODAS";

// Estado del configurador activo (JUEGO)
let juegoActivo = null;
let versionActivaIdx = 0;
let consolaActiva = null;
let cuentaActiva = "secundaria"; // "primaria" | "secundaria"

// Estado del configurador activo (STREAMING)
let streamingActivo = null;
let planStreamingIdx = 0;
let extrasComboSeleccionados = new Set();

let carrito = cargarCarrito();

// Referencias del DOM
const storeNameEl = document.getElementById("storeName");
const catalogViewEl = document.getElementById("catalogView");
const homeStreamingSectionEl = document.getElementById("homeStreamingSection");
const homeStreamingGridEl = document.getElementById("homeStreamingGrid");
const openStreamingCatalogBtn = document.getElementById("openStreamingCatalogBtn");

const detailViewEl = document.getElementById("detailView");
const filtersPanelEl = document.getElementById("filtersPanel");
const gameOnlyFiltersEl = document.getElementById("gameOnlyFilters");
const streamingOnlyFiltersEl = document.getElementById("streamingOnlyFilters");
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
   UTILIDADES GENERALES
   -------------------------------------------------------------------------- */
function generarSeleccionPortada(consola) {
  const disponibles = CATALOGO_JUEGOS.filter((juego) =>
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
   FILTRADO DE JUEGOS Y STREAMING
   -------------------------------------------------------------------------- */
function obtenerJuegosFiltrados() {
  let lista = CATALOGO_JUEGOS.filter((juego) => {
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

function obtenerStreamingFiltrado() {
  if (filtroPlataformaStreaming === "TODAS") {
    return CATALOGO_STREAMING;
  }
  return CATALOGO_STREAMING.filter(
    (s) => (s.plataforma || s.titulo) === filtroPlataformaStreaming
  );
}

/* --------------------------------------------------------------------------
   TARJETAS DE JUEGOS Y TARJETAS DE STREAMING (CON TU BOCETO)
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

function obtenerPlanMasBajoStreaming(servicio) {
  const planes = Array.isArray(servicio?.planes) ? servicio.planes : [];
  if (planes.length === 0) {
    return { precio: 0, anterior: null, subtitulo: "1 Perfil · 1 Mes", esMultiple: false };
  }
  let menor = planes[0];
  planes.forEach((p) => {
    if ((parsePrecio(p.precio) ?? Infinity) < (parsePrecio(menor.precio) ?? Infinity)) {
      menor = p;
    }
  });
  return {
    precio: parsePrecio(menor.precio) ?? 0,
    anterior: parsePrecio(menor.precioAnterior),
    subtitulo: menor.subtitulo || `1 Perfil · ${menor.duracion || "1 Mes"}`,
    esMultiple: planes.length > 1
  };
}

function crearUrlWhatsappStreaming(servicio, plan, extrasList, totalFinal) {
  const precioBaseStr = `*${CONFIG.moneda}${(parsePrecio(plan.precio) ?? 0).toFixed(2)}*`;
  const lineas = [
    `Hola ${CONFIG.nombreTienda}! Quiero comprar:`,
    `• _${servicio.titulo}_ (${plan.subtitulo || plan.duracion}) — ${precioBaseStr}`
  ];

  extrasList.forEach((ex) => {
    const precioExtraStr = `*${CONFIG.moneda}${(parsePrecio(ex.precioCombo) ?? 0).toFixed(2)}*`;
    lineas.push(`• Extra combo: _${ex.nombre}_ (${ex.detalle}) — ${precioExtraStr}`);
  });

  lineas.push(`• Total: *${CONFIG.moneda}${totalFinal.toFixed(2)}*`);
  return `https://wa.me/${CONFIG.whatsappNumero}?text=${encodeURIComponent(lineas.join("\n\n"))}`;
}
function renderizarTarjetaStreaming(servicio) {
  const infoBase = obtenerPlanMasBajoStreaming(servicio);
  const planInicial = (servicio.planes && servicio.planes[0]) || {
    duracion: "1 Mes",
    subtitulo: infoBase.subtitulo,
    precio: String(infoBase.precio)
  };
  const urlWaDirecto = crearUrlWhatsappStreaming(servicio, planInicial, [], infoBase.precio);

  const badgeTop = servicio.esOferta
    ? `<span class="badge-top-left badge-oferta">${servicio.descuento || "OFERTA"}</span>`
    : "";

  const precioAnteriorHtml = infoBase.anterior
    ? `<span class="card-price-old">${CONFIG.moneda}${infoBase.anterior.toFixed(2)}</span>`
    : "";

  return `
    <article class="game-card" data-open-streaming="${servicio.id}">
      <div class="cover-box">
        ${badgeTop}
        <span class="badge-console">STREAMING</span>
        <img src="${servicio.imagen}" alt="${servicio.titulo}" loading="lazy" />
      </div>
      <div class="card-content">
        <div>
          <h3 class="card-title">${servicio.titulo}</h3>
          <div class="card-accounts-hint" style="margin-top:4px;">${infoBase.subtitulo}</div>
        </div>
        <div>
          ${infoBase.esMultiple ? `<div class="card-from">Desde</div>` : ""}
          <div class="card-price-row">
            <span class="card-price">${CONFIG.moneda}${infoBase.precio.toFixed(2)}</span>
            ${precioAnteriorHtml}
          </div>
          <div class="streaming-card-actions">
            <button type="button" class="details-btn-secondary" data-ver-detalles-streaming="${servicio.id}">
              Ver detalles
            </button>
            <a class="buy-now-card-btn" href="${urlWaDirecto}" target="_blank" rel="noopener noreferrer" data-stop-card-click="1">
              Comprar Ahora
            </a>
          </div>
        </div>
      </div>
    </article>
  `;
}

function enlazarEventosTarjetas(contenedor) {
  if (!contenedor) return;

  contenedor.querySelectorAll("[data-stop-card-click]").forEach((el) => {
    el.addEventListener("click", (e) => e.stopPropagation());
  });

  contenedor.querySelectorAll(".game-card[data-open-game]").forEach((card) => {
    card.addEventListener("click", () => {
      const juegoId = card.dataset.openGame;
      if (juegoId) abrirConfiguradorJuego(juegoId);
    });
  });

  contenedor.querySelectorAll(".game-card[data-open-streaming]").forEach((card) => {
    card.addEventListener("click", () => {
      const servicioId = card.dataset.openStreaming;
      if (servicioId) abrirConfiguradorStreaming(servicioId);
    });
  });
}

function renderizarStreamingPortada() {
  if (!homeStreamingGridEl) return;
  if (CATALOGO_STREAMING.length === 0) {
    if (homeStreamingSectionEl) homeStreamingSectionEl.style.display = "none";
    return;
  }
  homeStreamingGridEl.innerHTML = CATALOGO_STREAMING
    .slice(0, 4)
    .map((s) => renderizarTarjetaStreaming(s))
    .join("");
  enlazarEventosTarjetas(homeStreamingGridEl);
}

/* --------------------------------------------------------------------------
   CONTROL DE CATÁLOGO PRINCIPAL Y ALTERNANCIA DE FILTROS JUEGOS / STREAMING
   -------------------------------------------------------------------------- */
function sincronizarTabsCategoriaCatalogo() {
  document.querySelectorAll("#categorySwitchBar [data-cat-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.catTab === categoriaCatalogoActiva);
  });

  if (gameOnlyFiltersEl) {
    gameOnlyFiltersEl.style.display = categoriaCatalogoActiva === "juego" ? "block" : "none";
  }
  if (streamingOnlyFiltersEl) {
    streamingOnlyFiltersEl.style.display = categoriaCatalogoActiva === "streaming" ? "block" : "none";
  }
}

function mostrarCatalogo({ actualizarUrl = true } = {}) {
  juegoActivo = null;
  streamingActivo = null;
  detailViewEl.style.display = "none";
  catalogViewEl.style.display = "block";

  if (actualizarUrl) {
    if (!catalogoCompletoAbierto) {
      actualizarHash("");
    } else {
      actualizarHash(categoriaCatalogoActiva === "streaming" ? "#streaming" : "#catalogo");
    }
  }

  if (!catalogoCompletoAbierto) {
    if (homeConsoleTabsEl) homeConsoleTabsEl.style.display = "grid";
    filtersPanelEl.style.display = "none";
    if (homeStreamingSectionEl && CATALOGO_STREAMING.length > 0) {
      homeStreamingSectionEl.style.display = "block";
    }
    sincronizarBotonesConsolaPortada();

    catalogHeadingEl.textContent = `DESTACADOS ${consolaPortada}`;
    catalogSubheadingEl.textContent =
      "Alterná entre PS5 y PS4 o recargá para ver una selección aleatoria de 4 juegos.";
    toggleCatalogBtn.textContent = "Ver más juegos y filtros →";

    if (SELECCION_ALEATORIA_PORTADA.length === 0) {
      gamesGridEl.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1;">No hay juegos disponibles.</p>`;
    } else {
      gamesGridEl.innerHTML = SELECCION_ALEATORIA_PORTADA
        .map((juego) => renderizarTarjetaJuego(juego, consolaPortada))
        .join("");
    }

    renderizarStreamingPortada();
    enlazarEventosTarjetas(gamesGridEl);
    return;
  }

  // MODO CATÁLOGO COMPLETO ABIERTO
  if (homeConsoleTabsEl) homeConsoleTabsEl.style.display = "none";
  if (homeStreamingSectionEl) homeStreamingSectionEl.style.display = "none";
  filtersPanelEl.style.display = "block";
  sincronizarTabsCategoriaCatalogo();
  toggleCatalogBtn.textContent = "↑ Volver a portada principal";

  if (categoriaCatalogoActiva === "juego") {
    catalogHeadingEl.textContent = "CATÁLOGO DE JUEGOS";
    catalogSubheadingEl.textContent =
      "Filtrá por consola, estado, precio o género y elegí la configuración de tu juego.";
    const listaJuegos = obtenerJuegosFiltrados();
    const consolaPrecio = filtroConsola === "TODOS" ? "TODOS" : filtroConsola;

    if (listaJuegos.length === 0) {
      gamesGridEl.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1;">No hay juegos que coincidan con esos filtros.</p>`;
    } else {
      gamesGridEl.innerHTML = listaJuegos
        .map((juego) => renderizarTarjetaJuego(juego, consolaPrecio))
        .join("");
    }
  } else {
    catalogHeadingEl.textContent = "CUENTAS DE STREAMING";
    catalogSubheadingEl.textContent =
      "Elegí tu plataforma favorita y aprovechá los descuentos en combo al entrar a ver detalles.";
    const listaStreaming = obtenerStreamingFiltrado();

    if (listaStreaming.length === 0) {
      gamesGridEl.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1;">No hay servicios de streaming en esta categoría.</p>`;
    } else {
      gamesGridEl.innerHTML = listaStreaming
        .map((servicio) => renderizarTarjetaStreaming(servicio))
        .join("");
    }
  }

  enlazarEventosTarjetas(gamesGridEl);
}

/* --------------------------------------------------------------------------
   CONFIGURADOR DE STREAMING (CON PLANES Y COMBOS CON CHECK VERDE)
   -------------------------------------------------------------------------- */
function abrirConfiguradorStreaming(servicioId, { actualizarUrl = true } = {}) {
  const servicio = CATALOGO_STREAMING.find((s) => s.id === servicioId);
  if (!servicio) {
    mostrarCatalogo({ actualizarUrl: true });
    return;
  }

  juegoActivo = null;
  streamingActivo = servicio;
  planStreamingIdx = 0;
  extrasComboSeleccionados = new Set(); // Siempre desactivados por defecto

  catalogViewEl.style.display = "none";
  if (homeStreamingSectionEl) homeStreamingSectionEl.style.display = "none";
  detailViewEl.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (actualizarUrl) {
    actualizarHash(`#streaming=${encodeURIComponent(servicio.id)}`);
  }

  renderizarConfiguradorStreaming();
}

function renderizarConfiguradorStreaming() {
  if (!streamingActivo) return;

  const planes = Array.isArray(streamingActivo.planes) ? streamingActivo.planes : [];
  const planActual = planes[planStreamingIdx] || planes[0] || {
    id: "1-mes",
    duracion: "1 Mes",
    subtitulo: "1 Perfil · 1 Mes",
    precio: "0"
  };

  const precioBase = parsePrecio(planActual.precio) ?? 0;
  const extrasDisponibles = Array.isArray(streamingActivo.extrasCombo) ? streamingActivo.extrasCombo : [];

  let sumaExtras = 0;
  let ahorroExtras = 0;
  const extrasElegidosObjs = [];

  extrasDisponibles.forEach((ex) => {
    if (extrasComboSeleccionados.has(ex.id)) {
      const pCombo = parsePrecio(ex.precioCombo) ?? 0;
      const pNormal = parsePrecio(ex.precioNormal) ?? pCombo;
      sumaExtras += pCombo;
      if (pNormal > pCombo) {
        ahorroExtras += (pNormal - pCombo);
      }
      extrasElegidosObjs.push(ex);
    }
  });

  const totalFinal = precioBase + sumaExtras;
  const urlWa = crearUrlWhatsappStreaming(streamingActivo, planActual, extrasElegidosObjs, totalFinal);

  const caracteristicasHtml = (streamingActivo.caracteristicas || [])
    .map((c) => `<li class="edition-includes-item">${c}</li>`)
    .join("");

  // Si hay más de 1 plan (ej. Spotify 1, 6 y 12 meses), mostramos selector; si solo hay 1 (Netflix/Prime), viene ya fijo en 1 Mes
  const selectorPlanesHtml =
    planes.length > 1
      ? `
        <div class="step-label">ELEGÍ LA DURACIÓN</div>
        <div class="plan-choice-grid">
          ${planes
            .map(
              (p, idx) => `
              <button type="button" class="plan-choice-btn ${idx === planStreamingIdx ? "active" : ""}" data-stream-plan="${idx}">
                <strong>${p.duracion}</strong>
                <span>${CONFIG.moneda}${(parsePrecio(p.precio) ?? 0).toFixed(2)}</span>
              </button>
            `
            )
            .join("")}
        </div>
      `
      : "";

  const extrasHtml =
    extrasDisponibles.length > 0
      ? `
        <div class="step-label">EXTRAS EN COMBO (PRECIO ESPECIAL SOLO AQUÍ)</div>
        <div class="combo-extras-list">
          ${extrasDisponibles
            .map((ex) => {
              const marcado = extrasComboSeleccionados.has(ex.id);
              const pCombo = parsePrecio(ex.precioCombo) ?? 0;
              const pNormal = parsePrecio(ex.precioNormal);
              return `
                <div class="combo-extra-card ${marcado ? "selected" : ""}" data-toggle-combo="${ex.id}" role="checkbox" aria-checked="${marcado}">
                  <div class="combo-extra-info">
                    <strong>+ ${ex.nombre}</strong>
                    <small>${ex.detalle}</small>
                  </div>
                  <div class="combo-extra-right">
                    <div class="combo-prices">
                      <span class="combo-price-new">${CONFIG.moneda}${pCombo.toFixed(2)}</span>
                      ${pNormal && pNormal > pCombo ? `<span class="combo-price-old">Normal ${CONFIG.moneda}${pNormal.toFixed(2)}</span>` : ""}
                    </div>
                    <span class="combo-check-box">${marcado ? "✓" : ""}</span>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      `
      : "";

  detailContentEl.innerHTML = `
    <img class="detail-hero-img" src="${streamingActivo.imagen}" alt="${streamingActivo.titulo}" />
    <h1 class="detail-title">${streamingActivo.titulo} · ${planActual.subtitulo}</h1>
    <div class="meta-tags">
      <span class="meta-tag">STREAMING</span>
      <span class="meta-tag">${planActual.duracion}</span>
    </div>

    ${
      caracteristicasHtml
        ? `<div class="edition-includes-box" style="margin-bottom: 18px;">
            <div class="edition-includes-title">Lo que incluye tu suscripción</div>
            <ul class="edition-includes-list">${caracteristicasHtml}</ul>
          </div>`
        : ""
    }

    <div class="config-box">
      <h2>Armá tu plan</h2>

      ${selectorPlanesHtml}

      ${extrasHtml}

      <div class="total-bar">
        <span>Total:</span>
        <span class="total-amount">${CONFIG.moneda}${totalFinal.toFixed(2)}</span>
      </div>
      ${ahorroExtras > 0 ? `<div class="combo-savings-note">¡Ahorrás ${CONFIG.moneda}${ahorroExtras.toFixed(2)} llevando el combo!</div>` : ""}

      <div class="detail-actions">
        <button type="button" class="add-cart-btn" id="streamAddCartBtn">Añadir al Carrito</button>
        <a class="buy-now-btn" href="${urlWa}" target="_blank" rel="noopener noreferrer">⚡ COMPRA AHORA</a>
      </div>
    </div>
  `;

  // Cambio de duración (ej. Spotify 1 / 6 / 12 meses)
  detailContentEl.querySelectorAll("[data-stream-plan]").forEach((btn) => {
    btn.addEventListener("click", () => {
      planStreamingIdx = Number(btn.dataset.streamPlan);
      renderizarConfiguradorStreaming();
    });
  });

  // Activar / desactivar check verde de extras en combo
  detailContentEl.querySelectorAll("[data-toggle-combo]").forEach((card) => {
    card.addEventListener("click", () => {
      const idCombo = card.dataset.toggleCombo;
      if (extrasComboSeleccionados.has(idCombo)) {
        extrasComboSeleccionados.delete(idCombo);
      } else {
        extrasComboSeleccionados.add(idCombo);
      }
      renderizarConfiguradorStreaming();
    });
  });

  // Añadir al carrito global (servicio principal + extras marcados)
  document.getElementById("streamAddCartBtn").addEventListener("click", () => {
    agregarStreamingAlCarrito(streamingActivo, planActual, extrasElegidosObjs);
  });
}

function agregarStreamingAlCarrito(servicio, plan, extrasElegidos) {
  const precioBase = parsePrecio(plan.precio) ?? 0;
  const claveBase = `stream__${servicio.id}__${plan.id}`;
  const existenteBase = carrito.find((i) => i.clave === claveBase);

  if (existenteBase) {
    existenteBase.cantidad += 1;
  } else {
    carrito.push({
      clave: claveBase,
      titulo: servicio.titulo,
      versionNombre: plan.subtitulo || plan.duracion,
      consola: "Streaming",
      cuentaTexto: plan.duracion,
      precio: precioBase,
      cantidad: 1
    });
  }

  extrasElegidos.forEach((ex) => {
    const claveExtra = `stream_combo__${servicio.id}__${ex.id}`;
    const existenteEx = carrito.find((i) => i.clave === claveExtra);
    const precioEx = parsePrecio(ex.precioCombo) ?? 0;
    if (existenteEx) {
      existenteEx.cantidad += 1;
    } else {
      carrito.push({
        clave: claveExtra,
        titulo: `${ex.nombre} (Combo)`,
        versionNombre: ex.detalle,
        consola: "Streaming",
        cuentaTexto: "Precio Combo",
        precio: precioEx,
        cantidad: 1
      });
    }
  });

  guardarCarrito();
  const textoExtra = extrasElegidos.length > 0 ? ` + ${extrasElegidos.length} extra(s) en combo` : "";
  mostrarToast(`Añadido: ${servicio.titulo} (${plan.duracion})${textoExtra}`);
}

/* --------------------------------------------------------------------------
   CONFIGURADOR DINÁMICO DEL JUEGO (SIN CAMBIOS EN TU LÓGICA)
   -------------------------------------------------------------------------- */
function abrirConfiguradorJuego(juegoId, { actualizarUrl = true } = {}) {
  const juego = CATALOGO_JUEGOS.find((j) => j.id === juegoId);
  if (!juego) {
    mostrarCatalogo({ actualizarUrl: true });
    return;
  }

  streamingActivo = null;
  juegoActivo = juego;
  versionActivaIdx = 0;
  const versiones = obtenerVersionesJuego(juego);
  const primeraVersion = versiones[0];
  consolaActiva = obtenerConsolasDeVersion(primeraVersion).elegida;
  cuentaActiva = "secundaria";

  catalogViewEl.style.display = "none";
  if (homeStreamingSectionEl) homeStreamingSectionEl.style.display = "none";
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

  detailContentEl.querySelectorAll("[data-cons-val]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.consVal === consolaActiva);
  });

  const cardPrim = detailContentEl.querySelector('[data-cuenta="primaria"]');
  if (cardPrim) {
    cardPrim.style.display = tienePrimaria ? "block" : "none";
    cardPrim.classList.toggle("active", cuentaActiva === "primaria");
    const rowPrim = cardPrim.querySelector(".account-price-row");
    if (rowPrim && tienePrimaria) {
      rowPrim.innerHTML = renderizarBloquePreciosCuenta(precioPrimaria, anteriorPrimaria);
    }
  }

  const cardSec = detailContentEl.querySelector('[data-cuenta="secundaria"]');
  if (cardSec) {
    cardSec.style.display = tieneSecundaria ? "block" : "none";
    cardSec.classList.toggle("active", cuentaActiva === "secundaria");
    const rowSec = cardSec.querySelector(".account-price-row");
    if (rowSec && tieneSecundaria) {
      rowSec.innerHTML = renderizarBloquePreciosCuenta(precioSecundaria, anteriorSecundaria);
    }
  }

  const totalEl = detailContentEl.querySelector(".total-amount");
  if (totalEl) {
    totalEl.textContent = `${CONFIG.moneda}${totalActual.toFixed(2)}`;
  }

  const buyBtn = detailContentEl.querySelector(".buy-now-btn");
  if (buyBtn) {
    buyBtn.setAttribute("href", urlWhatsapp);
  }

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

  let numeroPaso = 1;
  const formatoPaso = () => String(numeroPaso++).padStart(2, "0");

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
    bloqueVersionesHtml = `<div id="editionIncludesSlot">${incluyeHtml}</div>`;
  }

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

  detailContentEl.querySelectorAll("[data-cons-val]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.consVal === consolaActiva) return;
      consolaActiva = btn.dataset.consVal;
      actualizarPreciosYSeleccion({ animar: true });
    });
  });

  detailContentEl.querySelectorAll("[data-cuenta]").forEach((card) => {
    card.addEventListener("click", () => {
      if (card.dataset.cuenta === cuentaActiva) return;
      cuentaActiva = card.dataset.cuenta;
      actualizarPreciosYSeleccion({ animar: true });
    });
  });

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
   CARRITO GLOBAL Y WHATSAPP
   -------------------------------------------------------------------------- */
function crearUrlWhatsappConfigurado(tituloFinal, version, consola, cuenta, precio, conMultiplesVersiones) {
  const cuentaTexto = cuenta === "primaria" ? "Primaria" : "Secundaria";
  const lineas = [
    `Hola ${CONFIG.nombreTienda}! Quiero comprar:`,
    `• _${tituloFinal}_`
  ];

  if (conMultiplesVersiones && version?.nombre) {
    lineas.push(`• Edición: ${version.nombre}`);
  }

  lineas.push(`• Consola: ${consola}`);
  lineas.push(`• Cuenta: ${cuentaTexto}`);
  lineas.push(`• Total: *${CONFIG.moneda}${precio.toFixed(2)}*`);

  const msg = encodeURIComponent(lineas.join("\n\n"));
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
            <div class="cart-item-meta">${detalleMeta} (<strong>${CONFIG.moneda}${item.precio.toFixed(2)}</strong>)</div>
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
      const partes = [item.versionNombre, item.consola, item.cuentaTexto].filter(Boolean).join(" · ");
      const subtotalItem = (item.precio * item.cantidad).toFixed(2);
      return `${i + 1}. _${item.titulo}_ [${partes}] x${item.cantidad} = *${CONFIG.moneda}${subtotalItem}*`;
    })
    .join("\n\n");

  const urlWa = `https://wa.me/${CONFIG.whatsappNumero}?text=${encodeURIComponent(
    `Hola ${CONFIG.nombreTienda}! Quiero enviar este pedido:\n\n${lineasWa}\n\nTotal: *${CONFIG.moneda}${total.toFixed(2)}*`
  )}`;

  cartModalBody.innerHTML = `
    ${itemsHtml}
    <div class="total-bar" style="margin-top:12px;">
      <span>Total:</span>
      <span class="total-amount">${CONFIG.moneda}${total.toFixed(2)}</span>
    </div>
    <a class="buy-now-btn" id="sendOrderWhatsappBtn" style="width:100%;" href="${urlWa}" target="_blank" rel="noopener noreferrer">
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

  const sendOrderBtn = document.getElementById("sendOrderWhatsappBtn");
  if (sendOrderBtn) {
    sendOrderBtn.addEventListener("click", () => {
      setTimeout(() => {
        carrito = [];
        guardarCarrito();
        renderizarCarrito();
        mostrarToast("Pedido listo · Carrito vaciado");
      }, 150);
    });
  }
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
  } else if (hash.startsWith("#streaming=")) {
    const idServicio = decodeURIComponent(hash.replace("#streaming=", ""));
    abrirConfiguradorStreaming(idServicio, { actualizarUrl: false });
  } else if (hash === "#streaming") {
    catalogoCompletoAbierto = true;
    categoriaCatalogoActiva = "streaming";
    mostrarCatalogo({ actualizarUrl: false });
  } else if (hash === "#catalogo") {
    catalogoCompletoAbierto = true;
    categoriaCatalogoActiva = "juego";
    mostrarCatalogo({ actualizarUrl: false });
  } else {
    catalogoCompletoAbierto = false;
    mostrarCatalogo({ actualizarUrl: false });
  }

  sincronizandoHistorial = false;
}

window.addEventListener("hashchange", aplicarEstadoDesdeHash);

// Botón "Ver más juegos y filtros"
toggleCatalogBtn.addEventListener("click", () => {
  if (!catalogoCompletoAbierto) {
    catalogoCompletoAbierto = true;
    categoriaCatalogoActiva = "juego";
  } else {
    catalogoCompletoAbierto = false;
  }
  mostrarCatalogo({ actualizarUrl: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Botón "Ver más servicios de streaming"
if (openStreamingCatalogBtn) {
  openStreamingCatalogBtn.addEventListener("click", () => {
    catalogoCompletoAbierto = true;
    categoriaCatalogoActiva = "streaming";
    mostrarCatalogo({ actualizarUrl: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// Alternar pestañas principales Juegos / Streaming dentro del panel de filtros
document.querySelectorAll("#categorySwitchBar [data-cat-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    categoriaCatalogoActiva = btn.dataset.catTab;
    mostrarCatalogo({ actualizarUrl: true });
  });
});

// Filtros por plataforma dentro de Streaming
document.querySelectorAll("#streamingPlatformBar .genre-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll("#streamingPlatformBar .genre-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    filtroPlataformaStreaming = chip.dataset.platform;
    mostrarCatalogo({ actualizarUrl: false });
  });
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
   CARGA INICIAL DE JUEGOS Y STREAMING
   -------------------------------------------------------------------------- */
async function iniciarTienda() {
  try {
    const [respJuegos, respStreaming] = await Promise.all([
      fetch(FUENTES_DATOS.juegos, { cache: "no-store" }),
      fetch(FUENTES_DATOS.streaming, { cache: "no-store" }).catch(() => null)
    ]);

    if (!respJuegos.ok) throw new Error("Error cargando productosjuegos.json");
    CATALOGO_JUEGOS = await respJuegos.json();

    if (respStreaming && respStreaming.ok) {
      CATALOGO_STREAMING = await respStreaming.json();
    } else {
      CATALOGO_STREAMING = [];
    }

    SELECCION_ALEATORIA_PORTADA = generarSeleccionPortada(consolaPortada);

    actualizarContadorCarrito();
    aplicarEstadoDesdeHash();
  } catch (err) {
    gamesGridEl.innerHTML = `<p style="color: var(--no-color); grid-column: 1 / -1;">No se pudo cargar <strong>productosjuegos.json</strong>. Revisá que exista y tenga JSON válido.</p>`;
  }
}

iniciarTienda();

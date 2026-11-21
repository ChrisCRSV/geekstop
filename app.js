/* ==========================================================================
   APP.JS — LÓGICA DEL CATÁLOGO, MODAL DE INFO Y CARRITO DE PEDIDOS
   ========================================================================== */

document.getElementById("storeName").innerHTML =
  `${CONFIG.nombreTiendaParte1} <span>${CONFIG.nombreTiendaParte2}</span>`;
document.getElementById("storeFooter").textContent = CONFIG.textoFooter;

let PRODUCTOS = [];
let filtroActual = "TODOS";
let textoBusqueda = "";
let limiteVisible = CONFIG.productosPorPagina;
let carrito = cargarCarritoGuardado();

const grid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const resultCount = document.getElementById("resultCount");
const loadMoreWrap = document.getElementById("loadMoreWrap");
const loadMoreBtn = document.getElementById("loadMoreBtn");

const openCartBtn = document.getElementById("openCartBtn");
const cartCountEl = document.getElementById("cartCount");
const infoModalBackdrop = document.getElementById("infoModalBackdrop");
const infoModalTitle = document.getElementById("infoModalTitle");
const infoModalContent = document.getElementById("infoModalContent");
const closeInfoModalBtn = document.getElementById("closeInfoModal");

const cartModalBackdrop = document.getElementById("cartModalBackdrop");
const cartModalContent = document.getElementById("cartModalContent");
const closeCartModalBtn = document.getElementById("closeCartModal");
const toastEl = document.getElementById("toastMsg");

function mostrarAviso(texto) {
  toastEl.textContent = texto;
  toastEl.classList.add("show");
  clearTimeout(mostrarAviso.timer);
  mostrarAviso.timer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1800);
}

function cargarCarritoGuardado() {
  try {
    const guardado = localStorage.getItem("geekstop_carrito");
    return guardado ? JSON.parse(guardado) : [];
  } catch (e) {
    return [];
  }
}

function guardarCarrito() {
  try {
    localStorage.setItem("geekstop_carrito", JSON.stringify(carrito));
  } catch (e) {}
  actualizarContadorCarrito();
}

function actualizarContadorCarrito() {
  const totalUnidades = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  cartCountEl.textContent = totalUnidades;
}

function crearUrlWhatsappCompraDirecta(producto, modalidad, precio) {
  const textoModalidad = modalidad ? ` - Edición: ${modalidad}` : "";
  const mensaje = encodeURIComponent(
    `Hola! Quiero comprar:\n• ${producto.titulo} (${producto.plataforma})${textoModalidad} - ${precio} ${CONFIG.moneda}`
  );
  return `https://wa.me/${CONFIG.whatsappNumero}?text=${mensaje}`;
}

function crearUrlWhatsappCarrito() {
  let total = 0;
  const lineas = carrito.map((item, index) => {
    const subtotal = parseFloat(item.precio) * item.cantidad;
    total += subtotal;
    return `${index + 1}. ${item.titulo} (${item.plataforma}) - ${item.modalidad} x${item.cantidad} = ${subtotal.toFixed(2)} ${CONFIG.moneda}`;
  });

  const mensaje = encodeURIComponent(
    `Hola ${CONFIG.nombreTiendaParte1} ${CONFIG.nombreTiendaParte2}! Quiero realizar el siguiente pedido:\n\n${lineas.join("\n")}\n\nTotal a pagar: ${total.toFixed(2)} ${CONFIG.moneda}`
  );
  return `https://wa.me/${CONFIG.whatsappNumero}?text=${mensaje}`;
}

function obtenerFiltrados() {
  return PRODUCTOS.filter((producto) => {
    const coincidePlataforma =
      filtroActual === "TODOS" ||
      (producto.plataforma || "").toUpperCase() === filtroActual;

    const coincideTexto =
      (producto.titulo || "").toLowerCase().includes(textoBusqueda) ||
      (producto.categoria || "").toLowerCase().includes(textoBusqueda) ||
      (producto.plataforma || "").toLowerCase().includes(textoBusqueda);

    return coincidePlataforma && coincideTexto;
  });
}

function renderizarProductos() {
  const filtrados = obtenerFiltrados();

  if (filtrados.length === 0) {
    resultCount.textContent = "Mostrando 0 producto(s)";
    loadMoreWrap.style.display = "none";
    grid.innerHTML = `<p style="color: var(--muted);">No se encontraron productos con ese filtro o búsqueda.</p>`;
    return;
  }

  const visibles = filtrados.slice(0, limiteVisible);
  resultCount.textContent = `Mostrando ${visibles.length} de ${filtrados.length} producto(s)`;

  grid.innerHTML = visibles
    .map((producto, idx) => {
      const badgeHtml = producto.descuento
        ? `<span class="badge">${producto.descuento}</span>`
        : "";

      // FUTURO: Aquí podrás agregar otros "case" (por ejemplo "antivirus" o "streaming")
      switch (producto.tipo) {
        case "juego":
        default: {
          const radioName = `edicion_${producto.id}_${idx}`;
          const linkDirecto = crearUrlWhatsappCompraDirecta(
            producto,
            "Primario",
            producto.primario.actual
          );

          return `
            <article class="card" data-id="${producto.id}">
              ${badgeHtml}
              <span class="platform-tag">${producto.plataforma}</span>
              <img src="${producto.imagen}" alt="${producto.titulo}" loading="lazy" />
              <div class="card-body">
                <div>
                  <div class="card-category">${producto.categoria}</div>
                  <h3 class="card-title">${producto.titulo}</h3>

                  <div class="edition-options">
                    <label class="edition-option">
                      <input
                        type="radio"
                        name="${radioName}"
                        value="Primario"
                        data-precio="${producto.primario.actual}"
                        checked
                      />
                      <div class="edition-details">
                        <span class="edition-label">Primario</span>
                        <div class="edition-prices">
                          <span class="price-now">${producto.primario.actual}<sup>${CONFIG.moneda}</sup></span>
                          ${producto.primario.anterior ? `<span class="price-old">${producto.primario.anterior}<sup>${CONFIG.moneda}</sup></span>` : ""}
                        </div>
                      </div>
                    </label>

                    <label class="edition-option">
                      <input
                        type="radio"
                        name="${radioName}"
                        value="Secundario"
                        data-precio="${producto.secundario.actual}"
                      />
                      <div class="edition-details">
                        <span class="edition-label">Secundario</span>
                        <div class="edition-prices">
                          <span class="price-now">${producto.secundario.actual}<sup>${CONFIG.moneda}</sup></span>
                          ${producto.secundario.anterior ? `<span class="price-old">${producto.secundario.anterior}<sup>${CONFIG.moneda}</sup></span>` : ""}
                        </div>
                      </div>
                    </label>
                  </div>

                  <button type="button" class="info-link-btn" data-open-info="${producto.id}">
                    Ver información del juego
                  </button>
                </div>

                <div class="card-actions">
                  <button type="button" class="add-cart-btn" data-add-cart="${producto.id}">
                    Agregar al carrito
                  </button>
                  <a class="buy-btn" href="${linkDirecto}" target="_blank" rel="noopener noreferrer">
                    Comprar por WhatsApp
                  </a>
                </div>
              </div>
            </article>
          `;
        }
      }
    })
    .join("");

  if (visibles.length < filtrados.length) {
    const restantes = filtrados.length - visibles.length;
    loadMoreBtn.textContent = `Cargar más productos (${restantes} restante${restantes === 1 ? "" : "s"})`;
    loadMoreWrap.style.display = "flex";
  } else {
    loadMoreWrap.style.display = "none";
  }

  activarEventosTarjetas();
}

function obtenerSeleccionTarjeta(card) {
  const seleccionado = card.querySelector('input[type="radio"]:checked');
  return {
    modalidad: seleccionado ? seleccionado.value : "Primario",
    precio: seleccionado ? seleccionado.dataset.precio : "0.00"
  };
}

function agregarAlCarrito(producto, modalidad, precio) {
  const clave = `${producto.id}__${modalidad}`;
  const existente = carrito.find((item) => item.clave === clave);

  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({
      clave,
      id: producto.id,
      titulo: producto.titulo,
      plataforma: producto.plataforma,
      modalidad,
      precio,
      cantidad: 1
    });
  }

  guardarCarrito();
  mostrarAviso(`Agregado: ${producto.titulo} (${modalidad})`);
}

function abrirModalInfo(productoId) {
  const producto = PRODUCTOS.find((p) => p.id === productoId);
  if (!producto) return;

  const info = producto.info || {};
  infoModalTitle.textContent = producto.titulo;

  infoModalContent.innerHTML = `
    <p style="color: var(--muted); font-size: 0.85rem; margin-bottom: 10px;">
      ${producto.plataforma} • ${producto.categoria}
    </p>
    <p style="font-size: 0.92rem; line-height: 1.5; margin-bottom: 12px;">
      ${info.sinopsis || "Juego digital disponible para entrega coordinada por WhatsApp."}
    </p>

    <div class="detail-list">
      <div class="detail-item"><strong>Tamaño aproximado:</strong> ${info.tamano || "Consultar"}</div>
      <div class="detail-item"><strong>Idiomas:</strong> ${info.idiomas || "Español / Inglés"}</div>
      <div class="detail-item"><strong>Modo de juego:</strong> ${info.modo || "Un jugador / Online"}</div>
      <div class="detail-item"><strong>Nota:</strong> ${info.nota || "Entrega digital."}</div>
    </div>

    <div class="diff-box-modal">
      <div style="font-weight: 800; color: #93c5fd; margin-bottom: 6px;">
        ¿Cuál es la diferencia entre Primario y Secundario?
      </div>
      ${CONFIG.explicacionPrimarioSecundario}
    </div>

    <div class="card-actions">
      <button type="button" class="add-cart-btn" id="modalAddPrimario">
        Agregar Primario al carrito (${producto.primario.actual} ${CONFIG.moneda})
      </button>
      <button type="button" class="add-cart-btn" style="background: #1e293b; border: 1px solid var(--accent);" id="modalAddSecundario">
        Agregar Secundario al carrito (${producto.secundario.actual} ${CONFIG.moneda})
      </button>
    </div>
  `;

  document.getElementById("modalAddPrimario").addEventListener("click", () => {
    agregarAlCarrito(producto, "Primario", producto.primario.actual);
  });

  document.getElementById("modalAddSecundario").addEventListener("click", () => {
    agregarAlCarrito(producto, "Secundario", producto.secundario.actual);
  });

  infoModalBackdrop.classList.add("open");
  infoModalBackdrop.setAttribute("aria-hidden", "false");
}

function cerrarModalInfo() {
  infoModalBackdrop.classList.remove("open");
  infoModalBackdrop.setAttribute("aria-hidden", "true");
}

function renderizarCarrito() {
  if (carrito.length === 0) {
    cartModalContent.innerHTML = `
      <p style="color: var(--muted); padding: 14px 0;">
        Tu carrito está vacío. Agrega uno o más juegos para armar tu pedido.
      </p>
    `;
    return;
  }

  let total = 0;
  const itemsHtml = carrito
    .map((item, idx) => {
      const subtotal = parseFloat(item.precio) * item.cantidad;
      total += subtotal;
      return `
        <div class="cart-item">
          <div>
            <div class="cart-item-title">${item.titulo}</div>
            <div class="cart-item-meta">${item.plataforma} • ${item.modalidad} • ${item.precio} ${CONFIG.moneda} c/u</div>
          </div>
          <div class="cart-item-actions">
            <button type="button" class="qty-btn" data-qty="-1" data-idx="${idx}">-</button>
            <span style="min-width: 20px; text-align: center; font-weight: 700;">${item.cantidad}</span>
            <button type="button" class="qty-btn" data-qty="1" data-idx="${idx}">+</button>
            <button type="button" class="remove-btn" data-remove="${idx}">✕</button>
          </div>
        </div>
      `;
    })
    .join("");

  const urlWhatsapp = crearUrlWhatsappCarrito();

  cartModalContent.innerHTML = `
    <div class="cart-items">${itemsHtml}</div>
    <div class="cart-summary">
      <span>Total estimado:</span>
      <span style="color: var(--green);">${total.toFixed(2)} ${CONFIG.moneda}</span>
    </div>
    <div class="cart-footer-actions">
      <button type="button" class="clear-cart-btn" id="clearCartBtn">Vaciar</button>
      <a href="${urlWhatsapp}" target="_blank" rel="noopener noreferrer" class="send-wa-btn">
        Enviar pedido por WhatsApp
      </a>
    </div>
  `;

  cartModalContent.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.idx);
      const cambio = Number(btn.dataset.qty);
      carrito[idx].cantidad += cambio;
      if (carrito[idx].cantidad <= 0) {
        carrito.splice(idx, 1);
      }
      guardarCarrito();
      renderizarCarrito();
    });
  });

  cartModalContent.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.remove);
      carrito.splice(idx, 1);
      guardarCarrito();
      renderizarCarrito();
    });
  });

  document.getElementById("clearCartBtn").addEventListener("click", () => {
    carrito = [];
    guardarCarrito();
    renderizarCarrito();
  });
}

function abrirModalCarrito() {
  renderizarCarrito();
  cartModalBackdrop.classList.add("open");
  cartModalBackdrop.setAttribute("aria-hidden", "false");
}

function cerrarModalCarrito() {
  cartModalBackdrop.classList.remove("open");
  cartModalBackdrop.setAttribute("aria-hidden", "true");
}

function activarEventosTarjetas() {
  grid.querySelectorAll(".card").forEach((card) => {
    const producto = PRODUCTOS.find((p) => p.id === card.dataset.id);
    if (!producto) return;

    const buyBtn = card.querySelector(".buy-btn");
    const addBtn = card.querySelector(".add-cart-btn");
    const infoBtn = card.querySelector(".info-link-btn");

    card.querySelectorAll('input[type="radio"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const sel = obtenerSeleccionTarjeta(card);
        buyBtn.href = crearUrlWhatsappCompraDirecta(producto, sel.modalidad, sel.precio);
      });
    });

    addBtn.addEventListener("click", () => {
      const sel = obtenerSeleccionTarjeta(card);
      agregarAlCarrito(producto, sel.modalidad, sel.precio);
    });

    if (infoBtn) {
      infoBtn.addEventListener("click", () => {
        abrirModalInfo(producto.id);
      });
    }
  });
}

loadMoreBtn.addEventListener("click", () => {
  limiteVisible += CONFIG.productosPorPagina;
  renderizarProductos();
});

filterButtons.forEach((boton) => {
  boton.addEventListener("click", () => {
    filterButtons.forEach((b) => b.classList.remove("active"));
    boton.classList.add("active");
    filtroActual = boton.dataset.filter;
    limiteVisible = CONFIG.productosPorPagina;
    renderizarProductos();
  });
});

searchInput.addEventListener("input", (evento) => {
  textoBusqueda = evento.target.value.toLowerCase().trim();
  limiteVisible = CONFIG.productosPorPagina;
  renderizarProductos();
});

openCartBtn.addEventListener("click", abrirModalCarrito);
closeInfoModalBtn.addEventListener("click", cerrarModalInfo);
closeCartModalBtn.addEventListener("click", cerrarModalCarrito);

infoModalBackdrop.addEventListener("click", (e) => {
  if (e.target === infoModalBackdrop) cerrarModalInfo();
});

cartModalBackdrop.addEventListener("click", (e) => {
  if (e.target === cartModalBackdrop) cerrarModalCarrito();
});

async function cargarCatalogo() {
  try {
    const respuesta = await fetch(FUENTES_JSON.juegos, { cache: "no-store" });
    if (!respuesta.ok) throw new Error("No se pudo cargar productosjuegos.json");
    PRODUCTOS = await respuesta.json();
    actualizarContadorCarrito();
    renderizarProductos();
  } catch (error) {
    resultCount.textContent = "Error al cargar el catálogo";
    grid.innerHTML = `<p style="color: #f87171;">No se pudo cargar <strong>productosjuegos.json</strong>. Revisa que el archivo exista en la misma carpeta y tenga formato JSON válido.</p>`;
  }
}

cargarCatalogo();

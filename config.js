/* ==========================================================================
   CONFIG.JS — AJUSTES GENERALES DE LA TIENDA GEEK STOP
   Edita aquí número de WhatsApp, moneda, textos y reglas de visualización.
   ========================================================================== */

const CONFIG = {
  nombreTienda: "Geek Stop",
  whatsappNumero: "593999999999", // Cambia por tu número con código de país (sin + ni espacios)
  moneda: "$",

  // Cuántos juegos aleatorios mostrar en la vista principal antes de abrir el catálogo completo
  cantidadPortadaAleatoria: 4,

  // Explicación mostrada en el paso 03 (Cuenta)
  ayudaCuentas:
    "La cuenta Primaria te permite jugar desde tu usuario personal sin conexión constante; la Secundaria es más económica y se juega desde la cuenta entregada con conexión a internet.",

  // Reglas de beneficios por tipo de cuenta (puedes ajustar textos aquí)
  beneficiosCuenta: {
    primaria: {
      etiqueta: "TU CUENTA",
      puntos: [
        { ok: true, texto: "Jugás dentro de tu cuenta personal" },
        { ok: true, texto: "No necesitás internet para jugar" },
        { ok: true, texto: "Trofeos y partidas en tu usuario" }
      ]
    },
    secundaria: {
      etiqueta: "MÁS ECONÓMICA",
      puntos: [
        { ok: true, texto: "Juego igual de completo que Primaria" },
        { ok: true, texto: "Más barata, jugás desde nuestra cuenta" },
        { ok: false, texto: "Necesitás conexión a internet" }
      ]
    }
  }
};

// Rutas de archivos de datos (puedes sumar otros JSON aquí a futuro, ej. servicios o streaming)
const FUENTES_DATOS = {
  juegos: "./productosjuegos.json"
};

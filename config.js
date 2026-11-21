/* ==========================================================================
   CONFIG.JS — AJUSTES GENERALES DE LA TIENDA
   ========================================================================== */

const CONFIG = {
  nombreTiendaParte1: "GEEK",
  nombreTiendaParte2: "STOP",
  moneda: "USD",
  whatsappNumero: "593999999999", // Tu número con código de país sin + ni espacios

  // ========================================================================
  // AQUÍ CAMBIAR EL NÚMERO DE PRODUCTOS EN LA PAGINACIÓN
  // productosPorPagina: cuántos productos se muestran al inicio y cuántos
  // se suman cada vez que el visitante pulsa "Cargar más productos".
  // ========================================================================
  productosPorPagina: 12,

  // Texto del pie de página (puedes ajustarlo cuando quieras)
  textoFooter: "Entrega digital inmediata • Catálogo enfocado en videojuegos • Consultas y pedidos por WhatsApp.",

  // Explicación general de cuenta Primaria vs. Secundaria (usada en la modal de juegos)
  explicacionPrimarioSecundario: `
    <p><strong>Cuenta Primaria:</strong> Juegas directamente desde tu usuario personal de PlayStation, conservas tus trofeos y avances en tu cuenta y puedes jugar sin conexión a internet una vez descargado.</p>
    <p><strong>Cuenta Secundaria:</strong> Juegas ingresando al perfil/usuario entregado; requiere conexión a internet para verificar la licencia mientras juegas.</p>
  `
};

/* ==========================================================================
   FUTURO: FUENTES DE DATOS JSON
   Hoy está activo "productosjuegos.json". Más adelante podrás añadir aquí
   otros archivos como "./productosstreaming.json" o "./productosantivirus.json".
   ========================================================================== */
const FUENTES_JSON = {
  juegos: "./productosjuegos.json"
  // streaming: "./productosstreaming.json",
  // antivirus: "./productosantivirus.json"
};

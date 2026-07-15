// Punto de entrada de la aplicación.
// Este archivo solo inicializa el arranque de la app y dispara la carga del DOM.
// La lógica real está separada en módulos bajo src/ para que sea más fácil mantenerla.
fechaLunesActual = obtenerLunesDeSemana(new Date());
document.addEventListener("DOMContentLoaded", iniciarApp);

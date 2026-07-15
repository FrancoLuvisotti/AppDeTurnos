// Utilidades de fecha y formato.
// Sirven para normalizar semanas, convertir fechas a etiquetas legibles y preparar IDs de semana.
function obtenerLunesDeSemana(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const lunes = new Date(date.setDate(diff));
  lunes.setHours(0, 0, 0, 0);
  return lunes;
}

function formatearDiaMes(fecha) {
  return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
}

function obtenerFechaTurnoLabel(fechaSemanaRef, dia) {
  const nombresDias = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  const fecha = new Date(`${fechaSemanaRef}T00:00:00`);
  fecha.setDate(fecha.getDate() + dia);
  return `${nombresDias[dia]} ${formatearDiaMes(fecha)}`;
}

function formatearFechaID(fechaObj) {
  const yyyy = fechaObj.getFullYear();
  const mm = String(fechaObj.getMonth() + 1).padStart(2, "0");
  const dd = String(fechaObj.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

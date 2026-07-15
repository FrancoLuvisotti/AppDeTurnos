// Estado global compartido por la aplicación.
// Aquí viven las variables que necesitan ser accedidas desde distintos módulos.
var HORARIO_INICIO = 14;
var HORARIO_FIN = 24;
var turnos = [];
var clientesDB = {};
var fechaLunesActual = null;
var idTurnoSeleccionado = null;
var resolverModalConfirmacion = null;

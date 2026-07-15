// Servicio de persistencia y reglas de negocio del dominio.
// Aquí se cargan los datos locales, se guardan en localStorage y se resuelven
// las reglas relacionadas con turnos fijos, historial de clientes y búsqueda de turnos.
function cargarDatos() {
    const guardadoTurnos = localStorage.getItem("turnero_datos_v4_turnos");
    const guardadoClientes = localStorage.getItem("turnero_datos_v4_clientes");

    if (guardadoTurnos && guardadoClientes) {
        try {
            turnos = JSON.parse(guardadoTurnos);
            clientesDB = JSON.parse(guardadoClientes);
        } catch (e) {
            turnos = [];
            clientesDB = {};
        }
    } else {
        // Estado inicial de ejemplo para que la app no arranque vacía.
        const hoy = obtenerLunesDeSemana(new Date());
        const ref = formatearFechaID(hoy);
        clientesDB = { "1123456789": { nombre: "Marta Gómez", jugo: 3, falto: 0 } };
        turnos = [{
            id: "t-init-1",
            nombre: "Marta Gómez",
            telefono: "1123456789",
            sena: 1500,
            fijo: false,
            falto: false,
            dia: 0,
            hora: "16:00",
            fechaSemanaRef: ref,
            excepcionesCanceladas: []
        }];
        guardarDatos();
    }
}

function guardarDatos() {
    // Persiste el estado actual de turnos y clientes en localStorage.
    localStorage.setItem("turnero_datos_v4_turnos", JSON.stringify(turnos));
    localStorage.setItem("turnero_datos_v4_clientes", JSON.stringify(clientesDB));
}

function turnoFijoActivoEnSemana(turno, fechaSemanaRef) {
    // Determina si un turno fijo debe mostrarse en una semana concreta.
    if (!turno || turno.fijo !== true) return false;
    if (turno.fechaSemanaRef && fechaSemanaRef < turno.fechaSemanaRef) return false;
    if (turno.fechaUltimaSemanaFijo && fechaSemanaRef > turno.fechaUltimaSemanaFijo) return false;
    if (!turno.excepcionesCanceladas) turno.excepcionesCanceladas = [];
    return !turno.excepcionesCanceladas.includes(fechaSemanaRef);
}

function crearRegistroFaltaDeFijo(turnoFijo, fechaSemanaRef) {
    // Crea una reserva especial para registrar una falta sobre un turno fijo.
    return {
        id: 'turno-falta-' + Date.now(),
        nombre: turnoFijo.nombre,
        telefono: turnoFijo.telefono,
        sena: turnoFijo.sena,
        fijo: false,
        falto: true,
        dia: turnoFijo.dia,
        hora: turnoFijo.hora,
        fechaSemanaRef,
        origenFijoId: turnoFijo.id,
        excepcionesCanceladas: []
    };
}

function obtenerHistorialCliente(telefono) {
    // Devuelve el historial acumulado de jugadas y faltas para un cliente.
    const telLimpio = String(telefono || "").replace(/\D/g, '').trim();
    return clientesDB[telLimpio] ? { jugo: clientesDB[telLimpio].jugo || 0, falto: clientesDB[telLimpio].falto || 0 } : { jugo: 0, falto: 0 };
}

function asegurarRegistroCliente(telefono, nombre, incrementoJugo = 0, incrementoFalto = 0) {
    // Asegura que exista un registro del cliente y actualiza su historial numérico.
    const telLimpio = String(telefono || "").replace(/\D/g, '').trim();
    if (!telLimpio) return;
    if (!clientesDB[telLimpio]) clientesDB[telLimpio] = { nombre, jugo: 0, falto: 0 };
    clientesDB[telLimpio].nombre = nombre;
    clientesDB[telLimpio].jugo = Math.max(0, (clientesDB[telLimpio].jugo || 0) + incrementoJugo);
    clientesDB[telLimpio].falto = Math.max(0, (clientesDB[telLimpio].falto || 0) + incrementoFalto);
    guardarDatos();
}

function obtenerTurnoEn(dia, hora, fechaSemanaRef) {
    // Busca un turno específico en una celda concreta y resuelve si debe mostrar un turno fijo.
    const especifico = turnos.find(t => !t.fijo && t.dia === dia && t.hora === hora && t.fechaSemanaRef === fechaSemanaRef);
    if (especifico) return especifico;

    const fijoExacto = turnos.find(t => t.fijo === true && t.dia === dia && t.hora === hora && t.fechaSemanaRef === fechaSemanaRef && turnoFijoActivoEnSemana(t, fechaSemanaRef));
    if (fijoExacto) return fijoExacto;

    const fijo = turnos.find(t => t.dia === dia && t.hora === hora && turnoFijoActivoEnSemana(t, fechaSemanaRef));
    if (fijo) {
        return { ...fijo, replicaFijo: true, fechaSemanaRefActual: fechaSemanaRef };
    }
    return null;
}

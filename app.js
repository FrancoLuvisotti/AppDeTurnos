const HORARIO_INICIO = 16; 
const HORARIO_FIN = 24;    

let turnos = [];
let clientesDB = {};

let fechaLunesActual = obtenerLunesDeSemana(new Date()); 
let idTurnoSeleccionado = null; 

document.addEventListener("DOMContentLoaded", iniciarApp);

async function cargarModales() {
    const mount = document.getElementById("modalsMount");
    if (!mount) return;

    try {
        const respuesta = await fetch("modals.html");
        if (!respuesta.ok) throw new Error("No se pudo cargar modals.html");
        mount.innerHTML = await respuesta.text();
    } catch (error) {
        console.error(error);
        mount.innerHTML = `
            <div class="modal-load-error">
                No se pudieron cargar los modales. Abri la app desde un servidor local para usar archivos separados.
            </div>
        `;
    }
}

async function iniciarApp() {
    await cargarModales();
    rellenarSelectoresHoras();
    cargarDatos();
    generarControlesReagenda();
    renderizarGrilla();
    actualizarEstadisticas();
    actualizarLabelSemana();
    ejecutarIconos();
    
    // ESCUCHADOR DE EVENTOS CENTRALIZADO (Delegación)
    document.getElementById("contenedorFilas").addEventListener("click", (e) => {
        const celdaTurno = e.target.closest("[data-turno-id]");
        if (celdaTurno) {
            const dia = parseInt(celdaTurno.getAttribute("data-dia"));
            const hora = celdaTurno.getAttribute("data-hora");
            const semanaId = formatearFechaID(fechaLunesActual);
            
            const turno = obtenerTurnoEn(dia, hora, semanaId);
            if (turno) {
                abrirOpcionesTurno(turno);
            }
            return;
        }

        const celdaVacia = e.target.closest(".celda-vacia");
        if (celdaVacia) {
            const dia = parseInt(celdaVacia.getAttribute("data-dia"));
            const hora = celdaVacia.getAttribute("data-hora");
            abrirAgendarNuevo(dia, hora);
            return;
        }
    });
}

function ejecutarIconos() {
    try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch (e) {}
}

function rellenarSelectoresHoras() {
    const inputs = [document.getElementById("inputHora"), document.getElementById("selectReagendaHora")];
    inputs.forEach(input => {
        if (!input) return;
        input.innerHTML = "";
        for (let h = HORARIO_INICIO; h < HORARIO_FIN; h++) {
            const hStr = String(h).padStart(2, '0');
            ['00', '30'].forEach(m => {
                const opt = document.createElement("option");
                opt.value = `${hStr}:${m}`;
                opt.textContent = `${hStr}:${m}`;
                input.appendChild(opt);
            });
        }
    });
}

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
    localStorage.setItem("turnero_datos_v4_turnos", JSON.stringify(turnos));
    localStorage.setItem("turnero_datos_v4_clientes", JSON.stringify(clientesDB));
}

function formatearFechaID(fechaObj) {
    const yyyy = fechaObj.getFullYear();
    const mm = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const dd = String(fechaObj.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function turnoFijoActivoEnSemana(turno, fechaSemanaRef) {
    if (!turno || turno.fijo !== true) return false;
    if (turno.fechaSemanaRef && fechaSemanaRef < turno.fechaSemanaRef) return false;
    if (turno.fechaUltimaSemanaFijo && fechaSemanaRef > turno.fechaUltimaSemanaFijo) return false;
    if (!turno.excepcionesCanceladas) turno.excepcionesCanceladas = [];
    return !turno.excepcionesCanceladas.includes(fechaSemanaRef);
}

function crearRegistroFaltaDeFijo(turnoFijo, fechaSemanaRef) {
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

function cambiarSemana(direccion) {
    fechaLunesActual.setDate(fechaLunesActual.getDate() + (direccion * 7));
    actualizarLabelSemana();
    renderizarGrilla();
    actualizarEstadisticas();
}

function irSemanaActual() {
    fechaLunesActual = obtenerLunesDeSemana(new Date());
    actualizarLabelSemana();
    renderizarGrilla();
    actualizarEstadisticas();
    showToast("Volviendo a la semana actual");
}

function actualizarLabelSemana() {
    const finDeSemana = new Date(fechaLunesActual);
    finDeSemana.setDate(finDeSemana.getDate() + 6);
    
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const lbl = document.getElementById("labelSemana");
    if (lbl) lbl.textContent = `${fechaLunesActual.getDate()} de ${meses[fechaLunesActual.getMonth()]} - ${finDeSemana.getDate()} de ${meses[finDeSemana.getMonth()]} (${fechaLunesActual.getFullYear()})`;

    for (let i = 0; i < 7; i++) {
        const tempDate = new Date(fechaLunesActual);
        tempDate.setDate(tempDate.getDate() + i);
        const elHeader = document.getElementById(`fecha-${i}`);
        if (elHeader) elHeader.textContent = formatearDiaMes(tempDate);
    }
}

function generarControlesReagenda() {
    const selectSemana = document.getElementById("selectReagendaSemana");
    if (selectSemana) {
        selectSemana.innerHTML = "";
        const lunesRef = obtenerLunesDeSemana(new Date());
        for (let s = 0; s < 8; s++) {
            const tempLunes = new Date(lunesRef);
            tempLunes.setDate(tempLunes.getDate() + (s * 7));
            const opt = document.createElement("option");
            opt.value = formatearFechaID(tempLunes);
            let etiqueta = `Semana del ${tempLunes.getDate()}/${tempLunes.getMonth()+1}`;
            if (s === 0) etiqueta += " (Esta)";
            if (s === 1) etiqueta += " (Próx.)";
            opt.textContent = etiqueta;
            selectSemana.appendChild(opt);
        }
    }
}

function obtenerHistorialCliente(telefono) {
    const telLimpio = String(telefono || "").replace(/\D/g, '').trim();
    return clientesDB[telLimpio] ? { jugo: clientesDB[telLimpio].jugo || 0, falto: clientesDB[telLimpio].falto || 0 } : { jugo: 0, falto: 0 };
}

function asegurarRegistroCliente(telefono, nombre, incrementoJugo = 0, incrementoFalto = 0) {
    const telLimpio = String(telefono || "").replace(/\D/g, '').trim();
    if (!telLimpio) return;
    if (!clientesDB[telLimpio]) clientesDB[telLimpio] = { nombre, jugo: 0, falto: 0 };
    clientesDB[telLimpio].nombre = nombre;
    clientesDB[telLimpio].jugo = Math.max(0, (clientesDB[telLimpio].jugo || 0) + incrementoJugo);
    clientesDB[telLimpio].falto = Math.max(0, (clientesDB[telLimpio].falto || 0) + incrementoFalto);
    guardarDatos();
}

function obtenerTurnoEn(dia, hora, fechaSemanaRef) {
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

function renderizarGrilla() {
    const contenedor = document.getElementById("contenedorFilas");
    if (!contenedor) return;
    contenedor.innerHTML = "";
    const semanaId = formatearFechaID(fechaLunesActual);

    for (let h = HORARIO_INICIO; h < HORARIO_FIN; h++) {
        const hStr = String(h).padStart(2, '0');
        ["00", "30"].forEach(bloque => {
            const horaFormateada = `${hStr}:${bloque}`;
            const fila = document.createElement("div");
            fila.className = "schedule-row";
            
            const celdaHora = document.createElement("div");
            celdaHora.className = "time-cell";
            celdaHora.innerHTML = `<span>${horaFormateada}</span><small>hs</small>`;
            fila.appendChild(celdaHora);

            for (let dia = 0; dia < 7; dia++) {
                const celdaDia = document.createElement("div");
                const turno = obtenerTurnoEn(dia, horaFormateada, semanaId);

                if (turno) {
                    const hist = obtenerHistorialCliente(turno.telefono);
                    let statusClass = turno.falto ? "status-absence" : (turno.sena > 0 ? "status-paid" : "status-unpaid");
                    const fechaReserva = obtenerFechaTurnoLabel(turno.fechaSemanaRefActual || turno.fechaSemanaRef || semanaId, turno.dia);
                    const tipoTurno = turno.fijo ? "Fijo" : "Unico";

                    celdaDia.setAttribute("data-dia", dia);
                    celdaDia.setAttribute("data-hora", horaFormateada);
                    celdaDia.setAttribute("data-turno-id", turno.id);
                    celdaDia.className = `appointment-cell ${statusClass}`;
                    celdaDia.innerHTML = `
                        <div class="appointment-name">
                            <span>${turno.nombre}</span>
                            ${turno.fijo ? `<i data-lucide="pin"></i>` : ''}
                        </div>
                        <div class="appointment-phone">
                            <span>Tel: ${turno.telefono}</span>
                        </div>
                        <div class="appointment-meta">
                            <span>${fechaReserva}</span>
                            <strong>${tipoTurno}</strong>
                        </div>
                        <div class="appointment-history">
                            <span>Jugó: ${hist.jugo}</span>
                            <span>Faltó: ${hist.falto}</span>
                        </div>
                        <div class="appointment-footer">
                            <span>$${(turno.sena || 0).toLocaleString('es-AR')}</span>
                            <span class="appointment-badge">${turno.falto ? 'FALTÓ' : (turno.sena > 0 ? 'SEÑA' : 'S/SEÑA')}</span>
                        </div>
                    `;
                } else {
                    celdaDia.setAttribute("data-dia", dia);
                    celdaDia.setAttribute("data-hora", horaFormateada);
                    celdaDia.className = "celda-vacia empty-cell";
                    celdaDia.innerHTML = `<div class="empty-cell-action"><span><i data-lucide="plus"></i></span></div>`;
                }
                fila.appendChild(celdaDia);
            }
            contenedor.appendChild(fila);
        });
    }
    ejecutarIconos();
}

function actualizarEstadisticas() {
    const semanaId = formatearFechaID(fechaLunesActual);
    let sinSena = 0, conSena = 0, faltaron = 0;

    for (let dia = 0; dia < 7; dia++) {
        for (let h = HORARIO_INICIO; h < HORARIO_FIN; h++) {
            const hStr = String(h).padStart(2, '0');
            ["00", "30"].forEach(bl => {
                const t = obtenerTurnoEn(dia, `${hStr}:${bl}`, semanaId);
                if (t) {
                    if (t.falto) faltaron++;
                    else if (t.sena > 0) conSena++;
                    else sinSena++;
                }
            });
        }
    }
    if(document.getElementById("statSinSena")) document.getElementById("statSinSena").textContent = sinSena;
    if(document.getElementById("statConSena")) document.getElementById("statConSena").textContent = conSena;
    if(document.getElementById("statFaltaron")) document.getElementById("statFaltaron").textContent = faltaron;
}

function actualizarAlertaHistorial() {
    const telInput = document.getElementById("inputTelefono");
    const alertaBox = document.getElementById("alertaInasistencia");
    if (!telInput || !alertaBox) return;
    const hist = obtenerHistorialCliente(telInput.value);

    if (hist.falto > 0) {
        alertaBox.className = "history-alert";
        alertaBox.innerHTML = `<strong>CLIENTE CON FALTAS:</strong> Registra ${hist.falto} falta(s) en su historial permanente. Cobrar seña recomendada.`;
    } else {
        alertaBox.className = "hidden";
    }
}

function abrirAgendarNuevo(dia, hora) {
    idTurnoSeleccionado = null;
    document.getElementById("inputTurnoId").value = "";
    document.getElementById("inputDia").value = dia;
    document.getElementById("inputHora").value = hora;
    document.getElementById("inputNombre").value = "";
    document.getElementById("inputTelefono").value = "";
    document.getElementById("inputSena").value = 0;
    document.getElementById("inputFijo").checked = false;
    document.getElementById("alertaInasistencia").className = "hidden";
    document.getElementById("btnEliminar").classList.add("hidden");
    document.getElementById("modalTurno").classList.remove("hidden");
}

function abrirAgendarManual() {
    abrirAgendarNuevo(0, "16:00");
}

function cerrarModalTurno() {
    document.getElementById("modalTurno").classList.add("hidden");
}

function guardarTurno(e) {
    e.preventDefault();
    const id = document.getElementById("inputTurnoId").value;
    const dia = parseInt(document.getElementById("inputDia").value);
    const hora = document.getElementById("inputHora").value;
    const nombre = document.getElementById("inputNombre").value.trim();
    const telefono = document.getElementById("inputTelefono").value.trim();
    const sena = parseFloat(document.getElementById("inputSena").value) || 0;
    const fijo = document.getElementById("inputFijo").checked;
    const semanaId = formatearFechaID(fechaLunesActual);

    if (id) {
        const idx = turnos.findIndex(t => t.id === id);
        if (idx !== -1) {
            turnos[idx] = { ...turnos[idx], nombre, telefono, sena, fijo, dia, hora };
            showToast("Turno editado correctamente.");
        }
    } else {
        if (obtenerTurnoEn(dia, hora, semanaId)) {
            showToast("Error: Casillero ocupado.");
            return;
        }
        asegurarRegistroCliente(telefono, nombre, 1, 0);
        turnos.push({ id: 'turno-' + Date.now(), nombre, telefono, sena, fijo, falto: false, dia, hora, fechaSemanaRef: semanaId, excepcionesCanceladas: [] });
        showToast("¡Turno agendado!");
    }
    guardarDatos();
    cerrarModalTurno();
    renderizarGrilla();
    actualizarEstadisticas();
}

function abrirOpcionesTurno(turno) {
    idTurnoSeleccionado = turno.id;
    document.getElementById("opcionesCliente").textContent = turno.nombre;
    document.getElementById("txtInfoTelefono").textContent = turno.telefono;
    document.getElementById("txtInfoSena").textContent = `$ ${turno.sena}`;
    document.getElementById("inputSenaTraspaso").value = turno.sena; 

    const hist = obtenerHistorialCliente(turno.telefono);
    document.getElementById("historialJugo").textContent = `${hist.jugo} veces`;
    document.getElementById("historialFalto").textContent = `${hist.falto} veces`;

    document.getElementById("modalOpciones").classList.remove("hidden");
    ejecutarIconos();
}

function cerrarModalOpciones() {
    document.getElementById("modalOpciones").classList.add("hidden");
}

function toggleFalta() {
    const semanaIdActual = formatearFechaID(fechaLunesActual);
    const idx = turnos.findIndex(t => t.id === idTurnoSeleccionado);

    if (idx !== -1) {
        const turno = turnos[idx];

        if (turno.fijo) {
            const faltaExistente = turnos.find(t =>
                !t.fijo &&
                t.origenFijoId === turno.id &&
                t.fechaSemanaRef === semanaIdActual &&
                t.dia === turno.dia &&
                t.hora === turno.hora
            );

            if (faltaExistente) {
                faltaExistente.falto = true;
            } else {
                turnos.push(crearRegistroFaltaDeFijo(turno, semanaIdActual));
            }

            turno.fechaUltimaSemanaFijo = semanaIdActual;
            asegurarRegistroCliente(turno.telefono, turno.nombre, -1, 1);
            showToast("Falta registrada. El turno fijo deja de repetirse en las semanas proximas.");
        } else {
            const estabaFalto = turno.falto;
            turno.falto = !turno.falto;

            if (turno.origenFijoId) {
                const fijoOriginal = turnos.find(t => t.id === turno.origenFijoId);
                if (fijoOriginal) {
                    if (turno.falto) {
                        fijoOriginal.fechaUltimaSemanaFijo = semanaIdActual;
                    } else if (fijoOriginal.fechaUltimaSemanaFijo === semanaIdActual) {
                        delete fijoOriginal.fechaUltimaSemanaFijo;
                    }
                }
            }

            asegurarRegistroCliente(turno.telefono, turno.nombre, turno.falto ? -1 : 1, turno.falto ? 1 : -1);
            if (estabaFalto && turno.origenFijoId) {
                showToast("Falta revertida. El turno fijo vuelve a repetirse.");
            }
        }
    }

    guardarDatos();
    cerrarModalOpciones();
    renderizarGrilla();
    actualizarEstadisticas();
}

// NUEVA FUNCIÓN: MOVER PAGADO (Mantiene la semana actual intacta)
function ejecutarMoverPagado() {
    const semanaIdActual = formatearFechaID(fechaLunesActual);
    let turnoOrigen = turnos.find(t => t.id === idTurnoSeleccionado);

    // Si es réplica virtual, buscamos el molde real
    if (!turnoOrigen) {
        const valDia = parseInt(document.getElementById("selectReagendaDia").value);
        const valHora = document.getElementById("selectReagendaHora").value;
        turnoOrigen = obtenerTurnoEn(valDia, valHora, semanaIdActual);
    }

    if (!turnoOrigen) {
        showToast("Error al identificar el turno de origen.");
        return;
    }

    const semanaDestino = document.getElementById("selectReagendaSemana").value;
    const diaDestino = parseInt(document.getElementById("selectReagendaDia").value);
    const horaDestino = document.getElementById("selectReagendaHora").value;
    const senaDestino = parseFloat(document.getElementById("inputSenaTraspaso").value) || 0;

    if (semanaDestino === semanaIdActual && diaDestino === turnoOrigen.dia && horaDestino === turnoOrigen.hora) {
        showToast("Error: La fecha de destino no puede ser igual a la actual.");
        return;
    }

    // Validar colisiones en el destino
    if (obtenerTurnoEn(diaDestino, horaDestino, semanaDestino) !== null) {
        showToast("Error: El casillero de destino ya está ocupado.");
        return;
    }

    // ACCIÓN 1: La semana actual queda tal como está (congelada)
    // Si el origen era un turno fijo real, lo dejamos bloqueado para que no se duplique
    if (turnoOrigen.fijo) {
        const realFijo = turnos.find(t => t.id === turnoOrigen.id);
        if (realFijo) {
            if (!realFijo.excepcionesCanceladas) realFijo.excepcionesCanceladas = [];
            // Agregamos excepciones para que el molde fijo no pise el destino ni el futuro descontroladamente
            if (!realFijo.excepcionesCanceladas.includes(semanaDestino)) {
                realFijo.excepcionesCanceladas.push(semanaDestino);
            }
        }
    }

    // ACCIÓN 2: Creamos el nuevo turno hijo en la semana correspondiente
    const nuevoTurnoDestino = {
        id: 'turno-' + Date.now(),
        nombre: turnoOrigen.nombre,
        telefono: turnoOrigen.telefono,
        sena: senaDestino, // Se guarda con la seña modificada para la próxima semana
        fijo: false, // Pasa como turno único agendado
        falto: false,
        dia: diaDestino,
        hora: horaDestino,
        fechaSemanaRef: semanaDestino,
        excepcionesCanceladas: []
    };

    turnos.push(nuevoTurnoDestino);
    asegurarRegistroCliente(turnoOrigen.telefono, turnoOrigen.nombre, 1, 0);

    guardarDatos();
    cerrarModalOpciones();
    renderizarGrilla();
    actualizarEstadisticas();
    showToast(`¡Turno copiado a la fecha elegida con $${senaDestino} de seña!`);
}

// FUNCIÓN MEJORADA: CANCELAR/ELIMINAR COMPLETAMENTE CORREGIDA
function eliminarDesdeOpciones() {
    const semanaIdActual = formatearFechaID(fechaLunesActual);
    let turno = turnos.find(t => t.id === idTurnoSeleccionado);

    // Si es réplica virtual, el id seleccionado corresponde al molde original
    if (turno && turno.fijo) {
        const respuesta = confirm(
            "Este es un TURNO FIJO que se repite todas las semanas.\n\n" +
            "• Presiona [ ACEPTAR ] si quieres cancelarlo ÚNICAMENTE EN ESTA SEMANA.\n" +
            "• Presiona [ CANCELAR ] si deseas BORRARLO DE TODAS LAS SEMANAS DEFINITIVAMENTE."
        );

        if (respuesta) {
            // Acción: Cancelar solo esta semana
            if (!turno.excepcionesCanceladas) turno.excepcionesCanceladas = [];
            if (!turno.excepcionesCanceladas.includes(semanaIdActual)) {
                turno.excepcionesCanceladas.push(semanaIdActual);
            }
            asegurarRegistroCliente(turno.telefono, turno.nombre, -1, 0);
            showToast("Cancelado únicamente para esta semana en curso.");
        } else {
            // Acción: Cancelar permanentemente
            if (confirm("¿Estás 100% seguro de eliminar este turno fijo para siempre de todo el sistema?")) {
                asegurarRegistroCliente(turno.telefono, turno.nombre, -1, 0);
                turnos = turnos.filter(t => t.id !== turno.id);
                showToast("Turno fijo destruido de raíz.");
            } else {
                return;
            }
        }
    } else {
        // Si presionó una réplica pero `turno` dio null (por asincronismo del id), lo buscamos por coordenadas
        if (!turno) {
            const valDia = parseInt(document.getElementById("selectReagendaDia").value);
            const valHora = document.getElementById("selectReagendaHora").value;
            const turnoVirtual = obtenerTurnoEn(valDia, valHora, semanaIdActual);
            
            if (turnoVirtual && turnoVirtual.replicaFijo) {
                const originalFijo = turnos.find(x => x.id === turnoVirtual.id);
                if (originalFijo) {
                    if (!originalFijo.excepcionesCanceladas) originalFijo.excepcionesCanceladas = [];
                    originalFijo.excepcionesCanceladas.push(semanaIdActual);
                    asegurarRegistroCliente(originalFijo.telefono, originalFijo.nombre, -1, 0);
                    showToast("Turno fijo removido solo de esta semana.");
                    guardarDatos();
                    cerrarModalOpciones();
                    renderizarGrilla();
                    actualizarEstadisticas();
                    return;
                }
            }
        }

        // Turno normal estándar
        if (turno && confirm("¿Deseas dar de baja esta reserva?")) {
            asegurarRegistroCliente(turno.telefono, turno.nombre, -1, 0);
            turnos = turnos.filter(t => t.id !== idTurnoSeleccionado);
            showToast("Reserva eliminada.");
        }
    }

    guardarDatos();
    cerrarModalOpciones();
    renderizarGrilla();
    actualizarEstadisticas();
}

function abrirEditarDesdeOpciones() {
    let t = turnos.find(x => x.id === idTurnoSeleccionado);
    cerrarModalOpciones();
    if (t) {
        document.getElementById("inputTurnoId").value = t.id;
        document.getElementById("inputDia").value = t.dia;
        document.getElementById("inputHora").value = t.hora;
        document.getElementById("inputNombre").value = t.nombre;
        document.getElementById("inputTelefono").value = t.telefono;
        document.getElementById("inputSena").value = t.sena;
        document.getElementById("inputFijo").checked = t.fijo;
        document.getElementById("btnEliminar").classList.remove("hidden");
        document.getElementById("modalTurno").classList.remove("hidden");
        actualizarAlertaHistorial();
    }
}

function eliminarTurnoActual() {
    eliminarDesdeOpciones();
    cerrarModalTurno();
}

function limpiarTodo() {
    if (confirm("¿Borrar toda la base de datos local?")) {
        turnos = []; clientesDB = {}; guardarDatos(); renderizarGrilla(); actualizarEstadisticas();
    }
}

function showToast(m) {
    const t = document.getElementById("toast");
    document.getElementById("toastMsg").textContent = m;
    t.classList.add("toast-visible");
    setTimeout(() => t.classList.remove("toast-visible"), 2500);
}

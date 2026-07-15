// Capa de interfaz y presentación.
// Aquí viven las funciones que leen y escriben en el DOM, cargan modales y renderizan la grilla.
let diaEnfoqueMovil = null;

function esVistaMovil() {
    return window.matchMedia("(max-width: 768px)").matches;
}

function obtenerDiasVisibles() {
    if (!esVistaMovil()) return [0, 1, 2, 3, 4, 5, 6];
    if (diaEnfoqueMovil === null) {
        diaEnfoqueMovil = (new Date().getDay() + 6) % 7;
    }
    return [((diaEnfoqueMovil + 6) % 7), diaEnfoqueMovil, ((diaEnfoqueMovil + 1) % 7)];
}

function actualizarCabecerasDias() {
    const contenedor = document.querySelector(".day-header-grid");
    if (!contenedor) return;

    const headersViejos = Array.from(contenedor.querySelectorAll(".day-header"));
    headersViejos.forEach(header => header.remove());

    const diasVisibles = obtenerDiasVisibles();
    diasVisibles.forEach(dia => {
        const tempDate = new Date(fechaLunesActual);
        tempDate.setDate(tempDate.getDate() + dia);
        const header = document.createElement("div");
        const nombreDia = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][dia];
        header.className = `day-header ${dia === 5 ? "day-saturday" : dia === 6 ? "day-sunday" : ""}`.trim();
        header.innerHTML = `<div>${nombreDia}</div><div id="fecha-${dia}" class="day-date"></div>`;
        contenedor.appendChild(header);
    });
}

function actualizarEtiquetaDiaMovil() {
    const label = document.getElementById("mobileDayLabel");
    if (!label || !esVistaMovil()) return;

    const dias = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const tempDate = new Date(fechaLunesActual);
    tempDate.setDate(tempDate.getDate() + diaEnfoqueMovil);
    label.textContent = `${dias[diaEnfoqueMovil]} · ${formatearDiaMes(tempDate)}`;
}

function moverDiaVista(direccion) {
    if (!esVistaMovil()) return;
    if (diaEnfoqueMovil === null) {
        diaEnfoqueMovil = (new Date().getDay() + 6) % 7;
    }
    diaEnfoqueMovil = (diaEnfoqueMovil + direccion + 7) % 7;
    actualizarCabecerasDias();
    actualizarEtiquetaDiaMovil();
    renderizarGrilla();
}

function manejarCambioVista() {
    actualizarCabecerasDias();
    actualizarEtiquetaDiaMovil();
    renderizarGrilla();
}

async function cargarModales() {
    // Carga los modales externos desde modals.html para mantener el HTML principal más limpio.
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
    // Inicializa la aplicación completa: carga modales, datos, selecciones y grilla.
    await cargarModales();
    rellenarSelectoresHoras();
    cargarDatos();
    generarControlesReagenda();
    actualizarCabecerasDias();
    actualizarEtiquetaDiaMovil();
    renderizarGrilla();
    actualizarEstadisticas();
    actualizarLabelSemana();
    ejecutarIconos();

    document.getElementById("btnDiaAnterior")?.addEventListener("click", () => moverDiaVista(-1));
    document.getElementById("btnDiaSiguiente")?.addEventListener("click", () => moverDiaVista(1));
    window.addEventListener("resize", manejarCambioVista);

    // Delegación de eventos para que al hacer clic en una celda se abra la acción correcta.
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
    // Crea los iconos de Lucide en el DOM cuando la interfaz se renderiza o cambia.
    try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch (e) {}
}

function abrirModalConfirmacion(opciones = {}) {
    // Abre un modal genérico de confirmación reutilizable para otras acciones futuras.
    const modal = document.getElementById("modalConfirmacion");
    const titulo = document.getElementById("confirmTitulo");
    const subtitulo = document.getElementById("confirmSubtitulo");
    const mensaje = document.getElementById("confirmMensaje");
    const btnCancelar = document.getElementById("btnConfirmCancelar");
    const btnAceptar = document.getElementById("btnConfirmAceptar");

    if (!modal || !titulo || !subtitulo || !mensaje || !btnCancelar || !btnAceptar) {
        return Promise.resolve(false);
    }

    titulo.textContent = opciones.titulo || "Confirmar accion";
    subtitulo.textContent = opciones.subtitulo || "Revisa antes de continuar";
    mensaje.textContent = opciones.mensaje || "";
    btnCancelar.textContent = opciones.cancelar || "Cancelar";
    btnAceptar.textContent = opciones.aceptar || "Aceptar";
    btnAceptar.classList.toggle("danger-button", opciones.peligro === true);

    modal.classList.remove("hidden");
    ejecutarIconos();
    btnAceptar.focus();

    return new Promise(resolve => {
        resolverModalConfirmacion = resolve;
    });
}

function cerrarModalConfirmacion(resultado) {
    // Cierra el modal de confirmación y resuelve la promesa abierta.
    const modal = document.getElementById("modalConfirmacion");
    if (modal) modal.classList.add("hidden");

    if (resolverModalConfirmacion) {
        resolverModalConfirmacion(resultado);
        resolverModalConfirmacion = null;
    }
}

function rellenarSelectoresHoras() {
    // Rellena los selectores de hora con los horarios disponibles para agendar y reagendar.
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

function actualizarLabelSemana() {
    // Actualiza el texto de la semana visible y las cabeceras de los días.
    const finDeSemana = new Date(fechaLunesActual);
    finDeSemana.setDate(finDeSemana.getDate() + 6);

    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const lbl = document.getElementById("labelSemana");
    if (lbl) lbl.textContent = `${fechaLunesActual.getDate()} de ${meses[fechaLunesActual.getMonth()]} - ${finDeSemana.getDate()} de ${meses[finDeSemana.getMonth()]} (${fechaLunesActual.getFullYear()})`;

    actualizarCabecerasDias();
    actualizarEtiquetaDiaMovil();
}

function generarControlesReagenda() {
    // Carga las opciones de semana disponibles para los movimientos de turnos.
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

function renderizarGrilla() {
    // Dibuja la grilla horaria completa para la semana seleccionada.
    const contenedor = document.getElementById("contenedorFilas");
    if (!contenedor) return;
    contenedor.innerHTML = "";
    const semanaId = formatearFechaID(fechaLunesActual);
    const diasVisibles = obtenerDiasVisibles();

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

            diasVisibles.forEach(dia => {
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
            });
            contenedor.appendChild(fila);
        });
    }
    ejecutarIconos();
}

function actualizarEstadisticas() {
    // Actualiza los paneles laterales con el resumen de la semana actual.
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
    // Muestra una alerta cuando el cliente tiene historial de faltas.
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

function showToast(m) {
    // Muestra una notificación breve en la esquina para feedback de usuario.
    const t = document.getElementById("toast");
    document.getElementById("toastMsg").textContent = m;
    t.classList.add("toast-visible");
    setTimeout(() => t.classList.remove("toast-visible"), 2500);
}

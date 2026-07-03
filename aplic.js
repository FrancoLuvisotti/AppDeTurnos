// CONFIGURACIONES BÁSICAS DE OPERACIÓN (16:00 a 00:00 hs)
const HORARIO_INICIO = 16; 
const HORARIO_FIN = 24;    

// Estructura de Datos
let turnos = [];

// Base de datos de Clientes Persistente
let clientesDB = {};

// Estado inicial de navegación
let fechaLunesActual = obtenerLunesDeSemana(new Date()); 
let idTurnoSeleccionado = null; 

document.addEventListener("DOMContentLoaded", () => {
    rellenarSelectoresHoras();
    cargarDatos();
    generarControlesReagenda();
    renderizarGrilla();
    actualizarEstadisticas();
    actualizarLabelSemana();
    lucide.createIcons();
});

// Rellenar selectores de horas con intervalos de 30 minutos
function rellenarSelectoresHoras() {
    const inputHora = document.getElementById("inputHora");
    inputHora.innerHTML = "";
    for (let h = HORARIO_INICIO; h < HORARIO_FIN; h++) {
        const hStr = String(h).padStart(2, '0');
        
        const opt1 = document.createElement("option");
        opt1.value = `${hStr}:00`;
        opt1.textContent = `${hStr}:00`;
        inputHora.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = `${hStr}:30`;
        opt2.textContent = `${hStr}:30`;
        inputHora.appendChild(opt2);
    }
}

// Obtener el Lunes correspondiente a una fecha
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

// Carga y guardado de datos locales
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
        // Población inicial de prueba
        const hoy = obtenerLunesDeSemana(new Date());
        const ref = formatearFechaID(hoy);
        
        clientesDB = {
            "1123456789": { nombre: "Marta Gómez", jugo: 3, falto: 0 },
            "1198765432": { nombre: "Carlos Pérez", jugo: 1, falto: 2 }
        };

        turnos = [
            {
                id: "t-init-1",
                nombre: "Marta Gómez",
                telefono: "1123456789",
                sena: 0, 
                fijo: false,
                falto: false,
                dia: 0, 
                hora: "16:00",
                fechaSemanaRef: ref,
                excepcionesCanceladas: []
            },
            {
                id: "t-init-2",
                nombre: "Carlos Pérez",
                telefono: "1198765432",
                sena: 2500, 
                fijo: false,
                falto: false,
                dia: 1, 
                hora: "18:30",
                fechaSemanaRef: ref,
                excepcionesCanceladas: []
            }
        ];
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

// CONTROLES DE NAVEGACIÓN
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
    const txtInicio = `${fechaLunesActual.getDate()} de ${meses[fechaLunesActual.getMonth()]}`;
    const txtFin = `${finDeSemana.getDate()} de ${meses[finDeSemana.getMonth()]}`;
    
    document.getElementById("labelSemana").textContent = `${txtInicio} - ${txtFin} (${fechaLunesActual.getFullYear()})`;

    // Fechas en la cabecera
    for (let i = 0; i < 7; i++) {
        const tempDate = new Date(fechaLunesActual);
        tempDate.setDate(tempDate.getDate() + i);
        document.getElementById(`fecha-${i}`).textContent = formatearDiaMes(tempDate);
    }
}

// SELECTORES DE TRASLADO / REAGENDA
function generarControlesReagenda() {
    const selectHora = document.getElementById("selectReagendaHora");
    selectHora.innerHTML = "";
    for (let h = HORARIO_INICIO; h < HORARIO_FIN; h++) {
        const hStr = String(h).padStart(2, '0');
        
        const opt1 = document.createElement("option");
        opt1.value = `${hStr}:00`;
        opt1.textContent = `${hStr}:00`;
        selectHora.appendChild(opt1);

        const opt2 = document.createElement("option");
        opt2.value = `${hStr}:30`;
        opt2.textContent = `${hStr}:30`;
        selectHora.appendChild(opt2);
    }

    // Próximas 8 semanas
    const selectSemana = document.getElementById("selectReagendaSemana");
    selectSemana.innerHTML = "";
    const lunesRef = obtenerLunesDeSemana(new Date());
    
    for (let s = 0; s < 8; s++) {
        const tempLunes = new Date(lunesRef);
        tempLunes.setDate(tempLunes.getDate() + (s * 7));
        
        const opt = document.createElement("option");
        opt.value = formatearFechaID(tempLunes);
        
        let etiqueta = `Semana del ${tempLunes.getDate()}/${tempLunes.getMonth()+1}`;
        if (s === 0) etiqueta += " (Esta semana)";
        else if (s === 1) etiqueta += " (Próx. semana)";

        opt.textContent = etiqueta;
        selectSemana.appendChild(opt);
    }
}

// CALCULAR / OBTENER EL HISTORIAL PERSISTENTE DE UN CLIENTE
function obtenerHistorialCliente(telefono) {
    const telLimpio = String(telefono || "").replace(/\D/g, '').trim();
    
    if (clientesDB[telLimpio]) {
        return {
            jugo: clientesDB[telLimpio].jugo || 0,
            falto: clientesDB[telLimpio].falto || 0
        };
    }
    return { jugo: 0, falto: 0 };
}

// ACTUALIZAR O INSERTAR CLIENTE EN LA BASE DE DATOS PERSISTENTE
function asegurarRegistroCliente(telefono, nombre, incrementoJugo = 0, incrementoFalto = 0) {
    const telLimpio = String(telefono || "").replace(/\D/g, '').trim();
    if (!telLimpio) return;

    if (!clientesDB[telLimpio]) {
        clientesDB[telLimpio] = {
            nombre: nombre,
            jugo: 0,
            falto: 0
        };
    }

    clientesDB[telLimpio].nombre = nombre;
    clientesDB[telLimpio].jugo = Math.max(0, (clientesDB[telLimpio].jugo || 0) + incrementoJugo);
    clientesDB[telLimpio].falto = Math.max(0, (clientesDB[telLimpio].falto || 0) + incrementoFalto);
    
    guardarDatos();
}

// OBTENER TURNO ESPECÍFICO DE UNA SEMANA O TURNO FIJO NO CANCELADO
function obtenerTurnoEn(dia, hora, fechaSemanaRef) {
    const turnoEspecifico = turnos.find(t => 
        t.dia === dia && 
        t.hora === hora && 
        t.fechaSemanaRef === fechaSemanaRef
    );

    if (turnoEspecifico) {
        return turnoEspecifico;
    }

    const turnoFijo = turnos.find(t => 
        t.dia === dia && 
        t.hora === hora && 
        t.fijo === true
    );

    if (turnoFijo) {
        const excepciones = turnoFijo.excepcionesCanceladas || [];
        if (excepciones.includes(fechaSemanaRef)) {
            return null; 
        }

        return {
            ...turnoFijo,
            replicaFijo: true,
            fechaSemanaRefActual: fechaSemanaRef
        };
    }

    return null;
}

// RENDERIZAR GRILLA HORARIA (ARQUITECTURA DE CLIC CORREGIDA)
function renderizarGrilla() {
    const contenedor = document.getElementById("contenedorFilas");
    contenedor.innerHTML = "";
    const semanaId = formatearFechaID(fechaLunesActual);

    for (let h = HORARIO_INICIO; h < HORARIO_FIN; h++) {
        const hStr = String(h).padStart(2, '0');
        const bloques = ["00", "30"];
        
        bloques.forEach(bloque => {
            const horaFormateada = `${hStr}:${bloque}`;
            
            const fila = document.createElement("div");
            fila.className = "grid grid-cols-8 hover:bg-slate-50/70 transition-colors border-b border-slate-150 min-h-[62px]";
            
            // Columna de Horario
            const celdaHora = document.createElement("div");
            celdaHora.className = "text-center py-3 border-r border-slate-200 bg-slate-50/70 flex flex-col items-center justify-center font-bold text-xs text-slate-500 sticky left-0 z-10";
            celdaHora.innerHTML = `
                <span>${horaFormateada}</span>
                <span class="text-[9px] text-slate-400 font-normal">hs</span>
            `;
            fila.appendChild(celdaHora);

            // 7 Columnas para los días de la semana
            for (let dia = 0; dia < 7; dia++) {
                const celdaDia = document.createElement("div");
                celdaDia.className = "border-r border-slate-200 p-1 flex flex-col justify-stretch relative transition-all min-h-[60px]";
                
                const turno = obtenerTurnoEn(dia, horaFormateada, semanaId);

                if (turno) {
                    const hist = obtenerHistorialCliente(turno.telefono);

                    // Estilos del color según seña y faltas
                    let bgClass = "bg-yellow-100 hover:bg-yellow-200 text-yellow-950 border-yellow-300"; 
                    let badgeClass = "bg-yellow-200 text-yellow-850";
                    
                    if (turno.falto) {
                        bgClass = "bg-rose-100 hover:bg-rose-200 text-rose-955 border-rose-300 animate-pulse"; 
                        badgeClass = "bg-rose-200 text-rose-850";
                    } else if (turno.sena > 0) {
                        bgClass = "bg-emerald-100 hover:bg-emerald-200 text-emerald-955 border-emerald-300"; 
                        badgeClass = "bg-emerald-200 text-emerald-850";
                    }

                    // Crear el contenedor de la CARD del turno
                    const cardElement = document.createElement("div");
                    cardElement.className = `${bgClass} border rounded-lg shadow-sm p-1.5 flex flex-col justify-between h-full text-[11px] leading-tight cursor-pointer transform active:scale-[0.97] transition-all select-none duration-100`;
                    
                    // Evento de clic directo a la CARD
                    cardElement.onclick = (e) => {
                        e.stopPropagation(); 
                        abrirOpcionesTurno(turno);
                    };

                    cardElement.innerHTML = `
                        <div class="font-bold flex items-center justify-between gap-1 w-full">
                            <span class="truncate block max-w-[85%]">${turno.nombre}</span>
                            ${turno.fijo ? `<i data-lucide="pin" class="w-3 h-3 text-indigo-700 shrink-0" title="Turno Fijo"></i>` : ''}
                        </div>
                        
                        <div class="text-[9px] text-slate-600 truncate flex items-center gap-1 mt-0.5">
                            <i data-lucide="phone" class="w-2.5 h-2.5 opacity-70"></i>
                            <span>${turno.telefono}</span>
                        </div>

                        <!-- Resumen persistente de partidos jugados y faltas -->
                        <div class="text-[9px] bg-white/70 rounded px-1.5 py-0.5 mt-1 border border-black/5 flex items-center justify-between text-slate-700 font-bold">
                            <span>Jugó: ${hist.jugo}</span>
                            <span class="text-rose-700 font-extrabold">Faltó: ${hist.falto}</span>
                        </div>

                        <div class="mt-1 flex items-center justify-between gap-1 pt-1 border-t border-black/5">
                            <span class="font-bold text-[10px] text-slate-800">
                                $${(turno.sena || 0).toLocaleString('es-AR')}
                            </span>
                            <span class="text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase ${badgeClass}">
                                ${turno.falto ? 'FALTÓ' : (turno.sena > 0 ? 'SEÑA OK' : 'S/SEÑA')}
                            </span>
                        </div>
                    `;
                    celdaDia.appendChild(cardElement);
                } else {
                    // Celda de slot vacío para agendar
                    celdaDia.className += " hover:bg-indigo-50/50 cursor-pointer flex items-center justify-center";
                    celdaDia.onclick = () => {
                        abrirAgendarNuevo(dia, horaFormateada);
                    };
                    celdaDia.innerHTML = `
                        <div class="opacity-0 hover:opacity-100 transition-opacity duration-150">
                            <span class="bg-indigo-600 text-white rounded-full p-1 shadow-md inline-block">
                                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                            </span>
                        </div>
                    `;
                }

                fila.appendChild(celdaDia);
            }

            contenedor.appendChild(fila);
        });
    }
    
    lucide.createIcons();
}

// ACTUALIZAR ESTADÍSTICAS DEL PANEL LATERAL
function actualizarEstadisticas() {
    const semanaId = formatearFechaID(fechaLunesActual);
    let sinSena = 0;
    let conSena = 0;
    let faltaron = 0;

    for (let dia = 0; dia < 7; dia++) {
        for (let h = HORARIO_INICIO; h < HORARIO_FIN; h++) {
            const hStr = String(h).padStart(2, '0');
            const bloques = ["00", "30"];
            
            bloques.forEach(bloque => {
                const horaFormateada = `${hStr}:${bloque}`;
                const t = obtenerTurnoEn(dia, horaFormateada, semanaId);
                
                if (t) {
                    if (t.falto) {
                        faltaron++;
                    } else if (t.sena > 0) {
                        conSena++;
                    } else {
                        sinSena++;
                    }
                }
            });
        }
    }

    document.getElementById("statSinSena").textContent = sinSena;
    document.getElementById("statConSena").textContent = conSena;
    document.getElementById("statFaltaron").textContent = faltaron;
}

// ALERTA DE INASISTENCIA INSTANTÁNEA EN EL FORMULARIO
function actualizarAlertaHistorial() {
    const tel = document.getElementById("inputTelefono").value;
    const alertaBox = document.getElementById("alertaInasistencia");

    const hist = obtenerHistorialCliente(tel);

    if (hist.falto > 0) {
        alertaBox.className = "bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-800 space-y-1 block";
        alertaBox.innerHTML = `
            <div class="flex items-center gap-1.5 font-bold text-xs">
                <i data-lucide="alert-triangle" class="w-4 h-4 text-rose-600 shrink-0"></i>
                <span>CLIENTE DE RIESGO: REGISTRA FALTAS</span>
            </div>
            <p class="text-[11px] leading-snug">
                Este número telefónico registra un historial permanente de <strong>${hist.falto} falta(s)</strong>. 
                Recomendamos cobrar seña para asegurar la cancha.
            </p>
        `;
        lucide.createIcons();
    } else {
        alertaBox.className = "hidden";
        alertaBox.innerHTML = "";
    }
}

// ABRIR FORMULARIO DESDE CASILLERO
function abrirAgendarNuevo(dia, hora) {
    idTurnoSeleccionado = null; 
    document.getElementById("inputTurnoId").value = "";
    
    document.getElementById("inputDia").value = dia;
    document.getElementById("inputHora").value = hora;
    
    document.getElementById("modalTitulo").textContent = "Agendar Turno";
    document.getElementById("modalSubtitulo").textContent = `Registrando un turno para el día seleccionado`;

    // Reset campos
    document.getElementById("inputNombre").value = "";
    document.getElementById("inputTelefono").value = "";
    document.getElementById("inputSena").value = 0;
    document.getElementById("inputFijo").checked = false;
    document.getElementById("alertaInasistencia").className = "hidden";

    document.getElementById("btnEliminar").classList.add("hidden");
    document.getElementById("modalTurno").classList.remove("hidden");
}

// AGENDAR DESDE BOTÓN SUPERIOR
function abrirAgendarManual() {
    idTurnoSeleccionado = null;
    document.getElementById("inputTurnoId").value = "";
    
    document.getElementById("inputDia").value = 0;
    document.getElementById("inputHora").value = "16:00";
    
    document.getElementById("modalTitulo").textContent = "Nuevo Turno Rápido";
    document.getElementById("modalSubtitulo").textContent = "Introduce el día, hora y datos del cliente para reservar.";

    // Reset
    document.getElementById("inputNombre").value = "";
    document.getElementById("inputTelefono").value = "";
    document.getElementById("inputSena").value = 0;
    document.getElementById("inputFijo").checked = false;
    document.getElementById("alertaInasistencia").className = "hidden";

    document.getElementById("btnEliminar").classList.add("hidden");
    document.getElementById("modalTurno").classList.remove("hidden");
}

function cerrarModalTurno() {
    document.getElementById("modalTurno").classList.add("hidden");
    idTurnoSeleccionado = null;
}

// GUARDAR TURNO
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

    if (!nombre || !telefono) {
        showToast("Por favor, completa los campos requeridos.");
        return;
    }

    if (id) {
        // Modo Edición
        const index = turnos.findIndex(t => t.id === id);
        if (index !== -1) {
            asegurarRegistroCliente(telefono, nombre, 0, 0);

            turnos[index].nombre = nombre;
            turnos[index].telefono = telefono;
            turnos[index].sena = sena;
            turnos[index].fijo = fijo;
            turnos[index].dia = dia;
            turnos[index].hora = hora;
            showToast("¡Turno editado correctamente!");
        }
    } else {
        // Nuevo Turno
        const duplicado = turnos.some(t => t.dia === dia && t.hora === hora && t.fechaSemanaRef === semanaId);
        if (duplicado) {
            showToast("Error: Ya hay un turno registrado para ese mismo día y horario.");
            return;
        }

        asegurarRegistroCliente(telefono, nombre, 1, 0);

        const nuevo = {
            id: 'turno-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            nombre,
            telefono,
            sena,
            fijo,
            falto: false,
            dia,
            hora,
            fechaSemanaRef: semanaId,
            excepcionesCanceladas: []
        };

        turnos.push(nuevo);
        showToast("¡Turno agendado exitosamente!");
    }

    guardarDatos();
    cerrarModalTurno();
    renderizarGrilla();
    actualizarEstadisticas();
}

// ELIMINAR DIRECTAMENTE DESDE FORMULARIO DE DETALLES
function eliminarTurnoActual() {
    const id = document.getElementById("inputTurnoId").value;
    if (id) {
        const turnoAEliminar = turnos.find(t => t.id === id);
        if (turnoAEliminar) {
            if (confirm("¿Estás seguro de que deseas eliminar este turno? Los datos históricos del cliente seguirán guardados.")) {
                
                if (!turnoAEliminar.falto) {
                    asegurarRegistroCliente(turnoAEliminar.telefono, turnoAEliminar.nombre, -1, 0);
                } else {
                    asegurarRegistroCliente(turnoAEliminar.telefono, turnoAEliminar.nombre, 0, -1);
                }

                turnos = turnos.filter(t => t.id !== id);
                guardarDatos();
                cerrarModalTurno();
                renderizarGrilla();
                actualizarEstadisticas();
                showToast("Turno removido. Datos históricos conservados.");
            }
        }
    }
}

// ABRIR GESTIÓN EXTENDIDA DE UN TURNO
function abrirOpcionesTurno(turno) {
    idTurnoSeleccionado = turno.id;
    
    // Cambiar color de cabecera del modal dinámicamente según el estado
    const header = document.getElementById("opcionesHeader");
    header.className = "p-5 text-white transition-all duration-200";
    
    if (turno.falto) {
        header.classList.add("bg-rose-600");
    } else if (turno.sena > 0) {
        header.classList.add("bg-emerald-600");
    } else {
        header.classList.add("bg-amber-500", "text-slate-900");
    }

    const nombresDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    document.getElementById("opcionesTitulo").textContent = turno.fijo ? "Turno Fijo Activo" : "Detalles del Turno";
    document.getElementById("opcionesCliente").textContent = turno.nombre;
    document.getElementById("opcionesHorario").textContent = `${nombresDias[turno.dia]} a las ${turno.hora} hs`;

    // Obtener historial desde la base de datos de clientes persistentes
    const hist = obtenerHistorialCliente(turno.telefono);
    document.getElementById("historialJugo").textContent = `${hist.jugo} veces`;
    document.getElementById("historialFalto").textContent = `${hist.falto} veces`;

    document.getElementById("txtInfoTelefono").textContent = turno.telefono;
    document.getElementById("txtInfoSena").textContent = `$ ${(turno.sena || 0).toLocaleString('es-AR')}`;
    document.getElementById("txtInfoFijo").textContent = turno.fijo ? "Fijo (Se replica semanalmente)" : "Solo esta semana";
    document.getElementById("txtInfoFijo").className = turno.fijo ? "font-bold text-indigo-600" : "font-semibold text-slate-500";

    // Botón de marcar falta
    const btnFalta = document.getElementById("btnMarcarFalta");
    if (turno.falto) {
        btnFalta.className = "flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all";
        btnFalta.innerHTML = `<i data-lucide="user-check" class="w-4 h-4"></i> Quitar Inasistencia`;
    } else {
        btnFalta.className = "flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 hover:text-rose-700 font-bold text-xs transition-all";
        btnFalta.innerHTML = `<i data-lucide="user-x" class="w-4 h-4"></i> Marcar Falta`;
    }

    // Validar que la opción de semana destino exista
    const selectSemana = document.getElementById("selectReagendaSemana");
    const valDestino = turno.replicaFijo ? turno.fechaSemanaRefActual : turno.fechaSemanaRef;
    
    let existe = false;
    for (let i = 0; i < selectSemana.options.length; i++) {
        if (selectSemana.options[i].value === valDestino) {
            existe = true;
            break;
        }
    }
    if (!existe && valDestino) {
        const opt = document.createElement("option");
        opt.value = valDestino;
        opt.textContent = `Semana del ${valDestino.split('-')[2]}/${valDestino.split('-')[1]} (Actual)`;
        selectSemana.appendChild(opt);
    }

    // Preparar valores para selectores de reagendamiento
    document.getElementById("selectReagendaDia").value = turno.dia;
    document.getElementById("selectReagendaHora").value = turno.hora;
    selectSemana.value = valDestino;

    document.getElementById("modalOpciones").classList.remove("hidden");
    lucide.createIcons();
}

function cerrarModalOpciones() {
    document.getElementById("modalOpciones").classList.add("hidden");
    idTurnoSeleccionado = null;
}

// MARCAR INASISTENCIA
function toggleFalta() {
    if (!idTurnoSeleccionado) return;
    
    const index = turnos.findIndex(t => t.id === idTurnoSeleccionado);
    
    if (index !== -1) {
        const t = turnos[index];
        t.falto = !t.falto;

        if (t.falto) {
            asegurarRegistroCliente(t.telefono, t.nombre, -1, 1);
            showToast("Inasistencia guardada en el historial");
        } else {
            asegurarRegistroCliente(t.telefono, t.nombre, 1, -1);
            showToast("Asistencia normalizada");
        }

        guardarDatos();
        cerrarModalOpciones();
        renderizarGrilla();
        actualizarEstadisticas();
    } else {
        // Caso fijo virtual
        const turnoVirtual = obtenerTurnoEn(
            parseInt(document.getElementById("selectReagendaDia").value),
            document.getElementById("selectReagendaHora").value,
            formatearFechaID(fechaLunesActual)
        );

        if (turnoVirtual && turnoVirtual.replicaFijo) {
            const copiaConFalta = {
                ...turnoVirtual,
                id: 'turno-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                fijo: false, 
                falto: true,
                fechaSemanaRef: formatearFechaID(fechaLunesActual),
                excepcionesCanceladas: []
            };
            delete copiaConFalta.replicaFijo;
            delete copiaConFalta.fechaSemanaRefActual;

            asegurarRegistroCliente(turnoVirtual.telefono, turnoVirtual.nombre, -1, 1);

            turnos.push(copiaConFalta);
            guardarDatos();
            showToast("Falta cargada al historial.");
            cerrarModalOpciones();
            renderizarGrilla();
            actualizarEstadisticas();
        }
    }
}

// REAGENDAR TURNO A OTRA SEMANA O FECHA FUTURA
function confirmarReagenda() {
    if (!idTurnoSeleccionado) return;

    const nuevaSemanaRef = document.getElementById("selectReagendaSemana").value;
    const nuevoDia = parseInt(document.getElementById("selectReagendaDia").value);
    const nuevaHora = document.getElementById("selectReagendaHora").value;

    // Verificar colisión
    const ocupado = turnos.some(t => 
        t.dia === nuevoDia && 
        t.hora === nuevaHora && 
        t.fechaSemanaRef === nuevaSemanaRef &&
        t.id !== idTurnoSeleccionado
    );

    if (ocupado) {
        showToast("Error: Ya existe un turno ocupando esa fecha y hora de destino.");
        return;
    }

    const index = turnos.findIndex(t => t.id === idTurnoSeleccionado);
    
    if (index !== -1) {
        const t = turnos[index];
        
        if (t.fijo) {
            if (confirm("Este es un turno FIJO. ¿Deseas convertirlo en un turno normal en su nueva posición? (Aceptar = Normal, Cancelar = Sigue Fijo)")) {
                t.fijo = false;
            }
        }
        
        t.fechaSemanaRef = nuevaSemanaRef;
        t.dia = nuevoDia;
        t.hora = nuevaHora;

        guardarDatos();
        showToast("¡Turno movido exitosamente!");
        cerrarModalOpciones();
        renderizarGrilla();
        actualizarEstadisticas();
    } else {
        // Caso replica virtual
        const turnoVirtual = obtenerTurnoEn(
            parseInt(document.getElementById("selectReagendaDia").value),
            document.getElementById("selectReagendaHora").value,
            formatearFechaID(fechaLunesActual)
        );

        if (turnoVirtual && turnoVirtual.replicaFijo) {
            const copiaNueva = {
                ...turnoVirtual,
                id: 'turno-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                fijo: false,
                fechaSemanaRef: nuevaSemanaRef,
                dia: nuevoDia,
                hora: nuevaHora,
                excepcionesCanceladas: []
            };
            delete copiaNueva.replicaFijo;
            delete copiaNueva.fechaSemanaRefActual;

            const origenFijo = turnos.find(x => x.id === turnoVirtual.id);
            if (origenFijo) {
                if (!origenFijo.excepcionesCanceladas) origenFijo.excepcionesCanceladas = [];
                origenFijo.excepcionesCanceladas.push(formatearFechaID(fechaLunesActual));
            }

            turnos.push(copiaNueva);
            guardarDatos();
            showToast("Copia del turno fijo reubicada correctamente.");
            cerrarModalOpciones();
            renderizarGrilla();
            actualizarEstadisticas();
        }
    }
}

// EDICIÓN DE SEÑA Y DETALLES DESDE VENTANA DE OPCIONES
function abrirEditarDesdeOpciones() {
    if (!idTurnoSeleccionado) return;

    let turno = turnos.find(t => t.id === idTurnoSeleccionado);
    
    if (!turno) {
        turno = obtenerTurnoEn(
            parseInt(document.getElementById("selectReagendaDia").value),
            document.getElementById("selectReagendaHora").value,
            formatearFechaID(fechaLunesActual)
        );
    }

    cerrarModalOpciones();

    if (turno) {
        document.getElementById("inputTurnoId").value = turno.id;
        document.getElementById("inputDia").value = turno.dia;
        document.getElementById("inputHora").value = turno.hora;
        document.getElementById("inputNombre").value = turno.nombre;
        document.getElementById("inputTelefono").value = turno.telefono;
        document.getElementById("inputSena").value = turno.sena || 0;
        document.getElementById("inputFijo").checked = turno.fijo || false;

        document.getElementById("modalTitulo").textContent = "Modificar Turno";
        document.getElementById("modalSubtitulo").textContent = "Modifica los detalles del turno seleccionado.";

        document.getElementById("btnEliminar").classList.remove("hidden");
        document.getElementById("modalTurno").classList.remove("hidden");
        
        actualizarAlertaHistorial();
    } else {
        showToast("Error al cargar los datos de edición.");
    }
}

// ACCIÓN: CANCELAR O BORRAR TURNO DEFINITIVAMENTE
function eliminarDesdeOpciones() {
    if (!idTurnoSeleccionado) return;

    const index = turnos.findIndex(t => t.id === idTurnoSeleccionado);
    const semanaActualId = formatearFechaID(fechaLunesActual);

    if (index !== -1) {
        const t = turnos[index];
        
        if (t.fijo) {
            const respuesta = confirm(
                "Este es un TURNO FIJO que se repite todas las semanas.\n\n" +
                "• Haz clic en ACEPTAR si quieres cancelarlo SOLO EN ESTA SEMANA.\n" +
                "• Haz clic en CANCELAR si deseas ELIMINARLO COMPLETAMENTE PARA SIEMPRE."
            );
            
            if (respuesta) {
                if (!t.excepcionesCanceladas) t.excepcionesCanceladas = [];
                t.excepcionesCanceladas.push(semanaActualId);
                asegurarRegistroCliente(t.telefono, t.nombre, -1, 0);
                showToast("Cancelado únicamente para esta semana.");
            } else {
                if (confirm("¿Estás seguro de que deseas eliminar este turno fijo para siempre?")) {
                    if (!t.falto) {
                        asegurarRegistroCliente(t.telefono, t.nombre, -1, 0);
                    }
                    turnos = turnos.filter(x => x.id !== idTurnoSeleccionado);
                    showToast("Turno fijo borrado para siempre.");
                } else {
                    return;
                }
            }
        } else {
            if (confirm("¿Confirmas la cancelación de este turno?")) {
                if (!t.falto) {
                    asegurarRegistroCliente(t.telefono, t.nombre, -1, 0);
                } else {
                    asegurarRegistroCliente(t.telefono, t.nombre, 0, -1);
                }
                turnos = turnos.filter(x => x.id !== idTurnoSeleccionado);
                showToast("Turno cancelado exitosamente.");
            } else {
                return;
            }
        }
    } else {
        const turnoVirtual = obtenerTurnoEn(
            parseInt(document.getElementById("selectReagendaDia").value),
            document.getElementById("selectReagendaHora").value,
            semanaActualId
        );

        if (turnoVirtual && turnoVirtual.replicaFijo) {
            if (confirm("¿Quieres cancelar este turno fijo únicamente para esta semana?")) {
                const original = turnos.find(x => x.id === turnoVirtual.id);
                if (original) {
                    if (!original.excepcionesCanceladas) original.excepcionesCanceladas = [];
                    original.excepcionesCanceladas.push(semanaActualId);

                    asegurarRegistroCliente(turnoVirtual.telefono, turnoVirtual.nombre, -1, 0);
                    showToast("Turno fijo cancelado para esta semana.");
                }
            }
        }
    }

    guardarDatos();
    cerrarModalOpciones();
    renderizarGrilla();
    actualizarEstadisticas();
}

// LIMPIAR TODA LA MEMORIA DE LA APP
function limpiarTodo() {
    if (confirm("¿Restablecer de fábrica? Se borrarán todos los turnos y clientes permanently.")) {
        turnos = [];
        clientesDB = {};
        guardarDatos();
        renderizarGrilla();
        actualizarEstadisticas();
        showToast("Sistema de turnos reiniciado.");
    }
}

// DISPARADOR DE MENSAJE TOAST FLOTANTE
function showToast(mensaje) {
    const toast = document.getElementById("toast");
    document.getElementById("toastMsg").textContent = mensaje;
    
    toast.classList.remove("translate-y-20", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");
    
    setTimeout(() => {
        toast.classList.remove("translate-y-0", "opacity-100");
        toast.classList.add("translate-y-20", "opacity-0");
    }, 3000);
}

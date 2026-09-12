// Lógica de negocio y acciones del módulo de turnos.
// Aquí se agrupan los flujos para moverse entre semanas, agendar, editar, eliminar, marcar faltas y reagendar.
function cambiarSemana(direccion) {
  // Cambia la semana visible hacia adelante o atrás en pasos de siete días.
  fechaLunesActual.setDate(fechaLunesActual.getDate() + direccion * 7);
  actualizarLabelSemana();
  renderizarGrilla();
  actualizarEstadisticas();
}

function irSemanaActual() {
  // Vuelve a la semana actual del calendario y actualiza la vista.
  fechaLunesActual = obtenerLunesDeSemana(new Date());
  actualizarLabelSemana();
  renderizarGrilla();
  actualizarEstadisticas();
  showToast("Volviendo a la semana actual");
}

function abrirAgendarNuevo(dia, hora) {
  // Prepara el modal de alta con datos limpios para crear un nuevo turno desde una celda vacía.
  idTurnoSeleccionado = null;
  document.getElementById("inputTurnoId").value = "";
  document.getElementById("inputDia").value = dia;
  document.getElementById("inputHora").value = hora;
  document.getElementById("inputNombre").value = "";
  document.getElementById("inputTelefono").value = "";
  document.getElementById("inputSena").value = 0;
  document.getElementById("inputSenaQuincho").value = 0;
  document.getElementById("inputFijo").checked = false;
  document.getElementById("inputTorneo").checked = false;
  document.getElementById("inputUsaQuincho").checked = false;
  actualizarFormularioTorneo();
  actualizarFormularioQuincho();
  document.getElementById("alertaInasistencia").className = "hidden";
  document.getElementById("btnEliminar").classList.add("hidden");
  document.getElementById("modalTurno").classList.remove("hidden");
}

function abrirAgendarManual() {
  // Abre el formulario con un horario inicial por defecto.
  abrirAgendarNuevo(0, "16:00");
}

function cerrarModalTurno() {
  // Cierra el modal de creación/edición del turno.
  document.getElementById("modalTurno").classList.add("hidden");
}

function actualizarFormularioTorneo() {
  const esTorneo = document.getElementById("inputTorneo")?.checked;
  const campoSena = document.getElementById("campoSena");
  const configuracion = document.getElementById("grupoConfiguracion");
  const inputSena = document.getElementById("inputSena");

  if (campoSena) campoSena.classList.toggle("hidden", esTorneo);
  if (configuracion)
    configuracion.classList.toggle("tournament-mode", esTorneo);
  if (inputSena) {
    inputSena.disabled = esTorneo;
    if (esTorneo) inputSena.value = 0;
  }
}

function actualizarFormularioQuincho() {
  const usaQuincho = document.getElementById("inputUsaQuincho")?.checked;
  const campoSenaQuincho = document.getElementById("campoSenaQuincho");
  const inputSenaQuincho = document.getElementById("inputSenaQuincho");

  if (campoSenaQuincho)
    campoSenaQuincho.classList.toggle("hidden", !usaQuincho);
  if (inputSenaQuincho) {
    inputSenaQuincho.disabled = !usaQuincho;
    if (!usaQuincho) inputSenaQuincho.value = 0;
  }
}

function guardarTurno(e) {
  // Guarda un turno nuevo o actualiza uno existente desde el formulario.
  e.preventDefault();
  const id = document.getElementById("inputTurnoId").value;
  const dia = parseInt(document.getElementById("inputDia").value);
  const hora = document.getElementById("inputHora").value;
  const nombre = document.getElementById("inputNombre").value.trim();
  const telefono = document.getElementById("inputTelefono").value.trim();
  const torneo = document.getElementById("inputTorneo").checked;
  const sena = torneo
    ? 0
    : parseFloat(document.getElementById("inputSena").value) || 0;
  const usaQuincho = document.getElementById("inputUsaQuincho").checked;
  const senaQuincho = usaQuincho
    ? parseFloat(document.getElementById("inputSenaQuincho").value) || 0
    : 0;
  const fijo = document.getElementById("inputFijo").checked;
  const semanaId = formatearFechaID(fechaLunesActual);
  if (fijo) {
    const conflicto = buscarConflictoFijo(dia, hora, semanaId, id || null);
    if (conflicto) {
      showToast(
        "No se puede guardar: ese horario se cruza con un turno fijo o una reserva futura.",
      );
      return;
    }
  } else {
    const ocupado = obtenerTurnoEn(dia, hora, semanaId);
    if (ocupado && ocupado.id !== id) {
      showToast("Error: Casillero ocupado.");
      return;
    }
  }

  if (id) {
    const idx = turnos.findIndex((t) => t.id === id);
    if (idx !== -1) {
      turnos[idx] = {
        ...turnos[idx],
        nombre,
        telefono,
        sena,
        usaQuincho,
        senaQuincho,
        fijo,
        torneo,
        dia,
        hora,
      };
      asegurarRegistroCliente(telefono, nombre, 0, 0);
      sincronizarJugadaTurno(turnos[idx]);
      showToast("Turno editado correctamente.");
    }
  } else {
    const nuevoTurno = {
      id: "turno-" + Date.now(),
      nombre,
      telefono,
      sena,
      usaQuincho,
      senaQuincho,
      fijo,
      torneo,
      falto: false,
      dia,
      hora,
      fechaSemanaRef: semanaId,
      excepcionesCanceladas: [],
      jugoContabilizado: false,
    };
    asegurarRegistroCliente(telefono, nombre, 0, 0);
    sincronizarJugadaTurno(nuevoTurno);
    turnos.push(nuevoTurno);
    showToast("¡Turno agendado!");
  }
  guardarDatos();
  cerrarModalTurno();
  renderizarGrilla();
  actualizarEstadisticas();
}

function abrirOpcionesTurno(turno) {
  // Abre el panel de acciones para un turno existente y llena su ficha de historial.
  idTurnoSeleccionado = turno.id;
  document.getElementById("opcionesCliente").textContent = turno.nombre;
  document.getElementById("txtInfoTelefono").textContent = turno.telefono;
  document.getElementById("labelInfoSena").textContent = turno.torneo
    ? "Tipo de turno:"
    : "Sena actual de este turno:";
  document.getElementById("txtInfoSena").textContent = turno.torneo
    ? "Torneo"
    : `$ ${turno.sena}`;
  document.getElementById("inputSenaTraspaso").value = turno.sena;
  document
    .getElementById("transferBox")
    .classList.toggle("hidden", turno.torneo === true);

  const hist = obtenerHistorialCliente(turno.telefono);
  document.getElementById("historialJugo").textContent = `${hist.jugo} veces`;
  document.getElementById("historialFalto").textContent = `${hist.falto} veces`;

  document.getElementById("modalOpciones").classList.remove("hidden");
  ejecutarIconos();
}

function cerrarModalOpciones() {
  // Cierra el modal secundario de opciones.
  document.getElementById("modalOpciones").classList.add("hidden");
}

async function eliminarHistorialCliente(telefono) {
  const cliente = clientesDB[telefono];
  if (!cliente) return;

  const confirmado = await abrirModalConfirmacion({
    titulo: "Eliminar historial",
    subtitulo: "Se borraran los contadores de este cliente",
    mensaje: `Se eliminara el historial de ${cliente.nombre || telefono}. Sus turnos y reservas no se modificaran.`,
    cancelar: "Conservar historial",
    aceptar: "Eliminar historial",
    icono: "trash-2",
    peligro: true,
  });
  if (!confirmado) return;

  delete clientesDB[telefono];
  guardarDatos();
  renderizarHistorialClientes();
  showToast("Historial eliminado.");
}

function toggleFalta() {
  // Marca o desmarca la falta de un turno y ajusta el historial y las reglas del turno fijo.
  const semanaIdActual = formatearFechaID(fechaLunesActual);
  const idx = turnos.findIndex((t) => t.id === idTurnoSeleccionado);

  if (idx !== -1) {
    const turno = turnos[idx];

    if (turno.fijo) {
      const faltaExistente = turnos.find(
        (t) =>
          !t.fijo &&
          t.origenFijoId === turno.id &&
          t.fechaSemanaRef === semanaIdActual &&
          t.dia === turno.dia &&
          t.hora === turno.hora,
      );

      if (faltaExistente) {
        faltaExistente.falto = true;
      } else {
        turnos.push(crearRegistroFaltaDeFijo(turno, semanaIdActual));
      }

      turno.fechaUltimaSemanaFijo = semanaIdActual;
      asegurarRegistroCliente(
        turno.telefono,
        turno.nombre,
        turno.jugoContabilizado ? -1 : 0,
        1,
      );
      turno.jugoContabilizado = false;
      showToast(
        "Falta registrada. El turno fijo deja de repetirse en las semanas proximas.",
      );
    } else {
      const estabaFalto = turno.falto;
      turno.falto = !turno.falto;

      if (turno.origenFijoId) {
        const fijoOriginal = turnos.find((t) => t.id === turno.origenFijoId);
        if (fijoOriginal) {
          if (turno.falto) {
            fijoOriginal.fechaUltimaSemanaFijo = semanaIdActual;
          } else if (fijoOriginal.fechaUltimaSemanaFijo === semanaIdActual) {
            delete fijoOriginal.fechaUltimaSemanaFijo;
          }
        }
      }

      asegurarRegistroCliente(
        turno.telefono,
        turno.nombre,
        0,
        turno.falto ? 1 : -1,
      );
      sincronizarJugadaTurno(turno);
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

function ejecutarMoverPagado() {
  // Reagenda un turno a una semana y horario distintos, manteniendo el origen intacto.
  const semanaIdActual = formatearFechaID(fechaLunesActual);
  let turnoOrigen = turnos.find((t) => t.id === idTurnoSeleccionado);

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
  const diaDestino = parseInt(
    document.getElementById("selectReagendaDia").value,
  );
  const horaDestino = document.getElementById("selectReagendaHora").value;
  const senaDestino = turnoOrigen.torneo
    ? 0
    : parseFloat(document.getElementById("inputSenaTraspaso").value) || 0;

  if (
    semanaDestino === semanaIdActual &&
    diaDestino === turnoOrigen.dia &&
    horaDestino === turnoOrigen.hora
  ) {
    showToast("Error: La fecha de destino no puede ser igual a la actual.");
    return;
  }

  if (obtenerTurnoEn(diaDestino, horaDestino, semanaDestino) !== null) {
    showToast("Error: El casillero de destino ya está ocupado.");
    return;
  }

  if (turnoOrigen.fijo) {
    const realFijo = turnos.find((t) => t.id === turnoOrigen.id);
    if (realFijo) {
      if (!realFijo.excepcionesCanceladas) realFijo.excepcionesCanceladas = [];
      if (!realFijo.excepcionesCanceladas.includes(semanaDestino)) {
        realFijo.excepcionesCanceladas.push(semanaDestino);
      }
    }
  }

  const nuevoTurnoDestino = {
    id: "turno-" + Date.now(),
    nombre: turnoOrigen.nombre,
    telefono: turnoOrigen.telefono,
    sena: senaDestino,
    usaQuincho: turnoOrigen.usaQuincho === true,
    senaQuincho: turnoOrigen.senaQuincho || 0,
    fijo: false,
    torneo: turnoOrigen.torneo === true,
    falto: false,
    dia: diaDestino,
    hora: horaDestino,
    fechaSemanaRef: semanaDestino,
    excepcionesCanceladas: [],
    jugoContabilizado: false,
  };

  turnos.push(nuevoTurnoDestino);
  asegurarRegistroCliente(turnoOrigen.telefono, turnoOrigen.nombre, 0, 0);
  sincronizarJugadaTurno(nuevoTurnoDestino);

  guardarDatos();
  cerrarModalOpciones();
  renderizarGrilla();
  actualizarEstadisticas();
  showToast(`¡Turno copiado a la fecha elegida con $${senaDestino} de seña!`);
}

function eliminarDesdeOpcionesAnterior() {
  const semanaIdActual = formatearFechaID(fechaLunesActual);
  let turno = turnos.find((t) => t.id === idTurnoSeleccionado);

  if (turno && turno.fijo) {
    const respuesta = confirm(
      "Este es un TURNO FIJO que se repite todas las semanas.\n\n" +
        "• Presiona [ ACEPTAR ] si quieres cancelarlo ÚNICAMENTE EN ESTA SEMANA.\n" +
        "• Presiona [ BORRAR ] si deseas BORRARLO DE TODAS LAS SEMANAS DEFINITIVAMENTE.",
    );

    if (respuesta) {
      if (!turno.excepcionesCanceladas) turno.excepcionesCanceladas = [];
      if (!turno.excepcionesCanceladas.includes(semanaIdActual)) {
        turno.excepcionesCanceladas.push(semanaIdActual);
      }
      asegurarRegistroCliente(turno.telefono, turno.nombre, -1, 0);
      showToast("Cancelado únicamente para esta semana en curso.");
    } else {
      if (confirm("¿Estás seguro de eliminar este turno fijo?")) {
        asegurarRegistroCliente(turno.telefono, turno.nombre, -1, 0);
        turnos = turnos.filter((t) => t.id !== turno.id);
        showToast("Turno fijo borrado.");
      } else {
        return;
      }
    }
  } else {
    if (!turno) {
      const valDia = parseInt(
        document.getElementById("selectReagendaDia").value,
      );
      const valHora = document.getElementById("selectReagendaHora").value;
      const turnoVirtual = obtenerTurnoEn(valDia, valHora, semanaIdActual);

      if (turnoVirtual && turnoVirtual.replicaFijo) {
        const originalFijo = turnos.find((x) => x.id === turnoVirtual.id);
        if (originalFijo) {
          if (!originalFijo.excepcionesCanceladas)
            originalFijo.excepcionesCanceladas = [];
          originalFijo.excepcionesCanceladas.push(semanaIdActual);
          asegurarRegistroCliente(
            originalFijo.telefono,
            originalFijo.nombre,
            -1,
            0,
          );
          showToast("Turno fijo removido solo de esta semana.");
          guardarDatos();
          cerrarModalOpciones();
          renderizarGrilla();
          actualizarEstadisticas();
          return;
        }
      }
    }

    if (turno && confirm("¿Deseas dar de baja esta reserva?")) {
      asegurarRegistroCliente(turno.telefono, turno.nombre, -1, 0);
      turnos = turnos.filter((t) => t.id !== idTurnoSeleccionado);
      showToast("Reserva eliminada.");
    }
  }

  guardarDatos();
  cerrarModalOpciones();
  renderizarGrilla();
  actualizarEstadisticas();
}

function abrirEditarDesdeOpciones() {
  // Prepara el formulario de edición con los datos del turno seleccionado.
  let t = turnos.find((x) => x.id === idTurnoSeleccionado);
  cerrarModalOpciones();
  if (t) {
    document.getElementById("inputTurnoId").value = t.id;
    document.getElementById("inputDia").value = t.dia;
    document.getElementById("inputHora").value = t.hora;
    document.getElementById("inputNombre").value = t.nombre;
    document.getElementById("inputTelefono").value = t.telefono;
    document.getElementById("inputSena").value = t.sena;
    document.getElementById("inputSenaQuincho").value = t.senaQuincho || 0;
    document.getElementById("inputFijo").checked = t.fijo;
    document.getElementById("inputTorneo").checked = t.torneo === true;
    document.getElementById("inputUsaQuincho").checked = t.usaQuincho === true;
    actualizarFormularioTorneo();
    actualizarFormularioQuincho();
    document.getElementById("btnEliminar").classList.remove("hidden");
    document.getElementById("modalTurno").classList.remove("hidden");
    actualizarAlertaHistorial();
  }
}

function eliminarTurnoActualAnterior() {
  // Wrapper simple para eliminar desde el formulario de edición.
  eliminarDesdeOpciones();
  cerrarModalTurno();
}

function limpiarTodoAnterior() {
  // Resetea toda la base local de la aplicación.
  if (confirm("¿Borrar toda la base de datos local?")) {
    turnos = [];
    clientesDB = {};
    guardarDatos();
    renderizarGrilla();
    actualizarEstadisticas();
  }
}

async function eliminarDesdeOpciones() {
  const semanaIdActual = formatearFechaID(fechaLunesActual);
  let turno = turnos.find((t) => t.id === idTurnoSeleccionado);

  if (!turno) {
    const dia = parseInt(document.getElementById("selectReagendaDia")?.value);
    const hora = document.getElementById("selectReagendaHora")?.value;
    const turnoVisible = obtenerTurnoEn(dia, hora, semanaIdActual);
    if (turnoVisible?.replicaFijo) {
      turno = turnos.find((t) => t.id === turnoVisible.id);
    }
  }

  if (!turno) {
    showToast("No se pudo identificar el turno.");
    return false;
  }

  if (turno.fijo) {
    const accion = await abrirModalConfirmacion({
      titulo: "Cancelar turno fijo",
      subtitulo: "Elige como aplicar la cancelacion",
      mensaje:
        "Este turno se repite semanalmente. Puedes cancelar solo la semana visible o eliminarlo definitivamente.",
      cancelar: "Volver",
      alternativa: "Solo esta semana",
      aceptar: "Eliminar todas",
      icono: "calendar-x",
      peligro: true,
    });

    if (accion === "alternativa") {
      if (!turno.excepcionesCanceladas) turno.excepcionesCanceladas = [];
      if (!turno.excepcionesCanceladas.includes(semanaIdActual)) {
        turno.excepcionesCanceladas.push(semanaIdActual);
      }
      asegurarRegistroCliente(turno.telefono, turno.nombre, -1, 0);
      showToast("Cancelado solo para esta semana.");
    } else if (accion === true) {
      asegurarRegistroCliente(turno.telefono, turno.nombre, -1, 0);
      turnos = turnos.filter((t) => t.id !== turno.id);
      showToast("Turno fijo eliminado.");
    } else {
      return false;
    }
  } else {
    const confirmado = await abrirModalConfirmacion({
      titulo: "Eliminar reserva",
      subtitulo: "Esta accion no se puede deshacer",
      mensaje: "Se eliminara el turno seleccionado del calendario.",
      cancelar: "Conservar turno",
      aceptar: "Eliminar reserva",
      icono: "trash-2",
      peligro: true,
    });
    if (!confirmado) return false;

    asegurarRegistroCliente(turno.telefono, turno.nombre, -1, 0);
    turnos = turnos.filter((t) => t.id !== turno.id);
    showToast("Reserva eliminada.");
  }

  guardarDatos();
  cerrarModalOpciones();
  renderizarGrilla();
  actualizarEstadisticas();
  return true;
}

async function eliminarTurnoActual() {
  const eliminado = await eliminarDesdeOpciones();
  if (eliminado) cerrarModalTurno();
}

async function limpiarTodo() {
  const confirmado = await abrirModalConfirmacion({
    titulo: "Restablecer turnero",
    subtitulo: "Se borraran los turnos y clientes guardados",
    mensaje:
      "Esta accion elimina todos los datos locales y no se puede deshacer.",
    cancelar: "Cancelar",
    aceptar: "Borrar todo",
    icono: "rotate-ccw",
    peligro: true,
  });
  if (!confirmado) return;

  turnos = [];
  clientesDB = {};
  guardarDatos();
  renderizarGrilla();
  actualizarEstadisticas();
  showToast("Turnero restablecido.");
}

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
  document.getElementById("inputFijo").checked = false;
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

function guardarTurno(e) {
  // Guarda un turno nuevo o actualiza uno existente desde el formulario.
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
    const idx = turnos.findIndex((t) => t.id === id);
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
    turnos.push({
      id: "turno-" + Date.now(),
      nombre,
      telefono,
      sena,
      fijo,
      falto: false,
      dia,
      hora,
      fechaSemanaRef: semanaId,
      excepcionesCanceladas: [],
    });
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
  document.getElementById("txtInfoSena").textContent = `$ ${turno.sena}`;
  document.getElementById("inputSenaTraspaso").value = turno.sena;

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
      asegurarRegistroCliente(turno.telefono, turno.nombre, -1, 1);
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
        turno.falto ? -1 : 1,
        turno.falto ? 1 : -1,
      );
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
  const senaDestino =
    parseFloat(document.getElementById("inputSenaTraspaso").value) || 0;

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
    fijo: false,
    falto: false,
    dia: diaDestino,
    hora: horaDestino,
    fechaSemanaRef: semanaDestino,
    excepcionesCanceladas: [],
  };

  turnos.push(nuevoTurnoDestino);
  asegurarRegistroCliente(turnoOrigen.telefono, turnoOrigen.nombre, 1, 0);

  guardarDatos();
  cerrarModalOpciones();
  renderizarGrilla();
  actualizarEstadisticas();
  showToast(`¡Turno copiado a la fecha elegida con $${senaDestino} de seña!`);
}

function eliminarDesdeOpciones() {
  // Elimina un turno o anula solo una semana de un turno fijo según el contexto.
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
    document.getElementById("inputFijo").checked = t.fijo;
    document.getElementById("btnEliminar").classList.remove("hidden");
    document.getElementById("modalTurno").classList.remove("hidden");
    actualizarAlertaHistorial();
  }
}

function eliminarTurnoActual() {
  // Wrapper simple para eliminar desde el formulario de edición.
  eliminarDesdeOpciones();
  cerrarModalTurno();
}

function limpiarTodo() {
  // Resetea toda la base local de la aplicación.
  if (confirm("¿Borrar toda la base de datos local?")) {
    turnos = [];
    clientesDB = {};
    guardarDatos();
    renderizarGrilla();
    actualizarEstadisticas();
  }
}

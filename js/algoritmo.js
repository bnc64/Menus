// algoritmo.js — Generación automática del menú semanal

const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

const Algoritmo = {

  generarSemana(semana) {
    const calendario   = Storage.getCalendario();
    const todosMenus   = Storage.getMenus();
    const ingredientes = Storage.getIngredientes();
    const grupos       = Storage.getGrupos();

    const ingredienteDisponible = {};
    ingredientes.forEach(i => { ingredienteDisponible[i.id] = i.disponible; });

    const gruposPorId = {};
    grupos.forEach(g => { gruposPorId[g.id] = g; });

    // 1. Parte de una semana vacía para regenerar desde cero, luego fija persistentes
    const semanaVacia = {};
    DIAS.forEach(d => { semanaVacia[d] = { comida: null, cena: null }; });
    const semanaObj = this._aplicarPersistentes(semanaVacia, todosMenus);

    // 2. Menús activos con todos los ingredientes disponibles
    const menusPosibles = todosMenus.filter(m =>
      m.activo !== false &&
      m.ingredientes.every(iid => ingredienteDisponible[iid] !== false)
    );

    // 3. Rellenar ranuras libres
    this._ranuraslibres(semanaObj).forEach(({ dia, tipo }) => {
      const elegido = this._elegirMenu(dia, tipo, semanaObj, menusPosibles, todosMenus, gruposPorId);
      if (elegido) semanaObj[dia][tipo] = elegido.id;
    });

    calendario[semana] = semanaObj;
    Storage.saveCalendario(calendario);
    return calendario;
  },

  _aplicarPersistentes(semanaObj, todosMenus) {
    const resultado = JSON.parse(JSON.stringify(semanaObj));
    todosMenus
      .filter(m => m.persistente && m.dia_persistente !== null && m.ranura_persistente)
      .forEach(m => {
        const dia = DIAS[m.dia_persistente];
        if (dia) resultado[dia][m.ranura_persistente] = m.id;
      });
    return resultado;
  },

  _ranuraslibres(semanaObj) {
    const libres = [];
    DIAS.forEach(dia => {
      ['comida', 'cena'].forEach(tipo => {
        if (!semanaObj[dia][tipo]) libres.push({ dia, tipo });
      });
    });
    return libres;
  },

  _elegirMenu(dia, tipo, semanaObj, menusPosibles, todosMenus, gruposPorId) {
    const indiceDia = DIAS.indexOf(dia);

    const candidatos = menusPosibles.filter(m =>
      !m.persistente && (m.ranura === tipo || m.ranura === 'ambas')
    );

    const usados = this._usadosSemana(semanaObj);

    // Restricciones en cascada: se relajan si no hay candidatos válidos
    const intentos = [
      c => !usados.has(c.id) && !this._grupoConflicto(c, indiceDia, semanaObj, todosMenus, gruposPorId),
      c =>                       !this._grupoConflicto(c, indiceDia, semanaObj, todosMenus, gruposPorId),
      c => !usados.has(c.id),
      ()  => true,
    ];

    for (const filtro of intentos) {
      const validos = candidatos.filter(filtro);
      if (validos.length === 0) continue;
      // En el último nivel, elige el menos repetido esta semana
      return filtro === intentos[intentos.length - 1]
        ? this._menosRepetido(validos, semanaObj)
        : this._aleatorio(validos);
    }
    return null;
  },

  _usadosSemana(semanaObj) {
    const usados = new Set();
    DIAS.forEach(dia => {
      if (semanaObj[dia].comida) usados.add(semanaObj[dia].comida);
      if (semanaObj[dia].cena)   usados.add(semanaObj[dia].cena);
    });
    return usados;
  },

  // Comprueba si algún grupo del candidato genera conflicto de intervalo
  _grupoConflicto(candidato, indiceDia, semanaObj, todosMenus, gruposPorId) {
    const gruposIds = candidato.grupos || [];
    if (gruposIds.length === 0) return false;

    const menuPorId = {};
    todosMenus.forEach(m => { menuPorId[m.id] = m; });

    for (const grupoId of gruposIds) {
      const grupo = gruposPorId[grupoId];
      if (!grupo || !grupo.intervalo) continue;

      for (let i = 0; i < DIAS.length; i++) {
        if (i === indiceDia) continue;
        if (Math.abs(i - indiceDia) > grupo.intervalo) continue;

        for (const ranura of ['comida', 'cena']) {
          const menuId = semanaObj[DIAS[i]][ranura];
          if (!menuId) continue;
          const menu = menuPorId[menuId];
          if (menu && Array.isArray(menu.grupos) && menu.grupos.includes(grupoId)) return true;
        }
      }
    }
    return false;
  },

  _menosRepetido(candidatos, semanaObj) {
    const conteo = {};
    DIAS.forEach(dia => {
      ['comida', 'cena'].forEach(r => {
        const id = semanaObj[dia][r];
        if (id) conteo[id] = (conteo[id] || 0) + 1;
      });
    });
    return candidatos.slice().sort((a, b) => (conteo[a.id] || 0) - (conteo[b.id] || 0))[0];
  },

  _aleatorio(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },
};

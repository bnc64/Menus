// ui.js — Gestión de la interfaz de usuario

const DIAS_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_KEYS   = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

const UI = {
  semanaVisible: 'semanaActual',

  init() {
    this._bindNav();
    this._bindModal();
    this._bindCompartir();
    this.renderCalendario();
    this._mostrarSeccion('calendario');
  },

  // ============================================================
  // NAVEGACIÓN
  // ============================================================
  _bindNav() {
    document.getElementById('btn-nav-calendario')
      .addEventListener('click', () => { this._mostrarSeccion('calendario'); this.renderCalendario(); });
    document.getElementById('btn-nav-menus')
      .addEventListener('click', () => { this._mostrarSeccion('menus'); this.renderMenus(); });
    document.getElementById('btn-nav-ingredientes')
      .addEventListener('click', () => { this._mostrarSeccion('ingredientes'); this.renderIngredientes(); });
    document.getElementById('btn-nav-grupos')
      .addEventListener('click', () => { this._mostrarSeccion('grupos'); this.renderGrupos(); });

    document.getElementById('btn-nuevo-grupo')
      .addEventListener('click', () => this._crearGrupoDesdeSeccion());
    document.getElementById('btn-nav-crear')
      .addEventListener('click', () => this._generarMenus());

    document.getElementById('btn-semana-toggle').addEventListener('click', () => {
      this.semanaVisible = this.semanaVisible === 'semanaActual' ? 'semanaSiguiente' : 'semanaActual';
      this.renderCalendario();
    });

    document.getElementById('btn-nuevo-menu')
      .addEventListener('click', () => this.abrirModalMenu(null));

    document.getElementById('btn-nuevo-ingrediente').addEventListener('click', () => {
      this._abrirModalIngrediente(() => this.renderIngredientes());
    });

    document.getElementById('buscador-menus')
      .addEventListener('input', () => this.renderMenus());
    document.getElementById('buscador-ingredientes')
      .addEventListener('input', () => this.renderIngredientes());
    document.getElementById('buscador-grupos')
      .addEventListener('input', () => this.renderGrupos());
  },

  _mostrarSeccion(id) {
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    document.getElementById(`seccion-${id}`).classList.add('activa');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('activo'));
    const mapa = {
      calendario:   'btn-nav-calendario',
      menus:        'btn-nav-menus',
      ingredientes: 'btn-nav-ingredientes',
      grupos:       'btn-nav-grupos',
    };
    if (mapa[id]) document.getElementById(mapa[id]).classList.add('activo');
  },

  // ============================================================
  // CALENDARIO
  // ============================================================
  renderCalendario() {
    const calendario = Storage.getCalendario();
    const semana     = calendario[this.semanaVisible];
    const menus      = Storage.getMenus();
    const grupos     = Storage.getGrupos();

    const porId = {};
    menus.forEach(m => { porId[m.id] = m; });

    const grupoPorId = {};
    grupos.forEach(g => { grupoPorId[g.id] = g; });

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    document.getElementById('btn-semana-toggle').textContent =
      this.semanaVisible === 'semanaActual'
        ? (isMobile ? 'Sig. →' : 'Semana siguiente →')
        : (isMobile ? '← Ant.' : '← Esta semana');

    const grid = document.getElementById('calendario-grid');
    grid.innerHTML = '';

    // Esquina vacía + cabeceras
    grid.appendChild(document.createElement('div'));
    DIAS_LABELS.forEach(label => {
      const th = document.createElement('div');
      th.className = 'cal-header';
      th.textContent = label;
      grid.appendChild(th);
    });

    // Filas: etiqueta + 7 celdas
    ['comida', 'cena'].forEach(ranura => {
      const rowLabel = document.createElement('div');
      rowLabel.className = `cal-row-label ${ranura}`;
      rowLabel.textContent = ranura === 'comida' ? 'Comida' : 'Cena';
      grid.appendChild(rowLabel);
      DIAS_KEYS.forEach(dia =>
        grid.appendChild(this._crearCelda(semana[dia][ranura], porId, ranura, grupoPorId, dia))
      );
    });
  },

  _crearCelda(menuId, porId, ranura, grupoPorId, dia) {
    const cell = document.createElement('div');
    cell.className = `cal-celda ${ranura}`;

    // Lápiz para asignar manualmente
    const btnEditar = document.createElement('button');
    btnEditar.className = 'cal-editar';
    btnEditar.textContent = '✎';
    btnEditar.title = 'Asignar menú';
    btnEditar.addEventListener('click', e => {
      e.stopPropagation();
      this._abrirModalDia(dia, ranura, menuId);
    });
    cell.appendChild(btnEditar);

    const menu = menuId ? porId[menuId] : null;
    if (menu) {
      const icono = document.createElement('span');
      icono.className = 'cal-ranura-label';
      icono.textContent = ranura === 'comida' ? '☀️' : '🌙';
      cell.appendChild(icono);

      const nombre = document.createElement('span');
      nombre.className = 'cal-nombre' + (menu.persistente ? ' persistente' : '');
      nombre.textContent = menu.nombre;
      cell.appendChild(nombre);

      // Mostrar grupos como etiqueta pequeña
      const nombresGrupo = (menu.grupos || [])
        .map(gid => grupoPorId[gid]?.nombre)
        .filter(Boolean);
      if (nombresGrupo.length > 0) {
        const g = document.createElement('span');
        g.className = 'cal-grupo';
        g.textContent = nombresGrupo.join(', ');
        cell.appendChild(g);
      }

      // Celda clicable si tiene enlace a receta
      if (menu.url_receta) {
        cell.classList.add('con-link');
        cell.title = '🔗 Ver receta';
        const linkIcon = document.createElement('span');
        linkIcon.className = 'cal-link-icon';
        linkIcon.textContent = '🔗';
        cell.appendChild(linkIcon);
        cell.addEventListener('click', () =>
          window.open(menu.url_receta, '_blank', 'noopener,noreferrer')
        );
      }
    } else {
      const vacio = document.createElement('span');
      vacio.className = 'cal-vacio';
      vacio.textContent = '·';
      cell.appendChild(vacio);
    }

    return cell;
  },

  // ============================================================
  // SECCIÓN MENÚS
  // ============================================================
  renderMenus() {
    const query = document.getElementById('buscador-menus').value;
    const menus      = Storage.getMenus().filter(m => this._coincide(m.nombre, query));
    const ingredientes = Storage.getIngredientes();
    const grupos     = Storage.getGrupos();

    const ingPorId = {};
    ingredientes.forEach(i => { ingPorId[i.id] = i; });
    const grupoPorId = {};
    grupos.forEach(g => { grupoPorId[g.id] = g; });

    const lista = document.getElementById('lista-menus');
    lista.innerHTML = '';

    if (menus.length === 0) {
      lista.innerHTML = '<p class="vacio-msg">No hay menús creados todavía.</p>';
      return;
    }

    menus.forEach(menu => {
      const esActivo = menu.activo !== false;
      const item = document.createElement('div');
      item.className = 'menu-item' + (esActivo ? '' : ' inactivo');

      const info = document.createElement('div');
      info.className = 'menu-info';

      const strong = document.createElement('strong');
      strong.textContent = menu.nombre;
      info.appendChild(strong);

      const meta = document.createElement('div');
      meta.className = 'menu-meta';
      let txt = { comida: 'Comida', cena: 'Cena', ambas: 'Comida y Cena' }[menu.ranura] || menu.ranura;
      if (menu.persistente) txt = `Persistente — ${DIAS_LABELS[menu.dia_persistente] || ''} ${menu.ranura_persistente}`;

      const nombresGrupo = (menu.grupos || []).map(gid => {
        const g = grupoPorId[gid];
        return g ? `${g.nombre} (${g.intervalo}d)` : null;
      }).filter(Boolean);
      if (nombresGrupo.length > 0) txt += ` · ${nombresGrupo.join(', ')}`;
      if (menu.url_receta) txt += ' · 🔗';

      meta.textContent = txt;
      info.appendChild(meta);

      if (menu.ingredientes && menu.ingredientes.length > 0) {
        const ings = document.createElement('div');
        ings.className = 'menu-ingredientes';
        ings.textContent = menu.ingredientes.map(id => ingPorId[id]?.nombre || '?').join(', ');
        info.appendChild(ings);
      }

      const acc = document.createElement('div');
      acc.className = 'menu-acciones';

      const btnActivo = document.createElement('button');
      btnActivo.className = 'btn-toggle-activo ' + (esActivo ? 'activo' : 'inactivo');
      btnActivo.textContent = esActivo ? 'Activo' : 'Pausado';
      btnActivo.title = esActivo ? 'Pausar este menú' : 'Reactivar este menú';
      btnActivo.addEventListener('click', () => {
        menu.activo = !esActivo;
        Storage.updateMenu(menu);
        this.renderMenus();
      });

      const btnEditar = document.createElement('button');
      btnEditar.className = 'btn-icono';
      btnEditar.textContent = '✏️';
      btnEditar.title = 'Editar';
      btnEditar.addEventListener('click', () => this.abrirModalMenu(menu));

      const btnDel = document.createElement('button');
      btnDel.className = 'btn-icono btn-eliminar';
      btnDel.textContent = '🗑️';
      btnDel.title = 'Eliminar';
      btnDel.addEventListener('click', () => {
        if (confirm(`¿Eliminar "${menu.nombre}"?`)) { Storage.deleteMenu(menu.id); this.renderMenus(); }
      });

      acc.appendChild(btnActivo);
      acc.appendChild(btnEditar);
      acc.appendChild(btnDel);
      item.appendChild(info);
      item.appendChild(acc);
      lista.appendChild(item);
    });
  },

  // ============================================================
  // MODAL MENÚ
  // ============================================================
  _bindModal() {
    const modal = document.getElementById('modal-menu');
    document.getElementById('btn-cerrar-modal-menu')
      .addEventListener('click', () => modal.classList.remove('abierto'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('abierto'); });
    document.getElementById('menu-ranura')
      .addEventListener('change', () => this._toggleCamposMenu());
    document.getElementById('form-menu')
      .addEventListener('submit', e => { e.preventDefault(); this._guardarMenu(); });

    // Modal ingrediente
    const modalIng = document.getElementById('modal-ingrediente');
    document.getElementById('btn-cerrar-modal-ingrediente')
      .addEventListener('click', () => modalIng.classList.remove('abierto'));
    modalIng.addEventListener('click', e => { if (e.target === modalIng) modalIng.classList.remove('abierto'); });
    document.getElementById('form-ingrediente')
      .addEventListener('submit', e => { e.preventDefault(); this._guardarIngrediente(); });

    // Modal asignar día
    const modalDia = document.getElementById('modal-dia');
    document.getElementById('btn-cerrar-modal-dia')
      .addEventListener('click', () => modalDia.classList.remove('abierto'));
    modalDia.addEventListener('click', e => { if (e.target === modalDia) modalDia.classList.remove('abierto'); });

    // Modal grupo
    const modalGrupo = document.getElementById('modal-grupo');
    document.getElementById('btn-cerrar-modal-grupo')
      .addEventListener('click', () => modalGrupo.classList.remove('abierto'));
    modalGrupo.addEventListener('click', e => { if (e.target === modalGrupo) modalGrupo.classList.remove('abierto'); });
    document.getElementById('form-grupo')
      .addEventListener('submit', e => { e.preventDefault(); this._guardarGrupo(); });
  },

  abrirModalMenu(menuExistente = null) {
    document.getElementById('form-menu').reset();
    document.getElementById('menu-id').value = '';

    if (menuExistente) {
      document.getElementById('menu-id').value      = menuExistente.id;
      document.getElementById('menu-nombre').value   = menuExistente.nombre;
      document.getElementById('menu-ranura').value   = menuExistente.persistente ? 'persistente' : menuExistente.ranura;
      document.getElementById('menu-url').value      = menuExistente.url_receta || '';
      document.getElementById('menu-dia-persistente').value =
        menuExistente.dia_persistente !== null ? menuExistente.dia_persistente : '';
      document.getElementById('menu-ranura-persistente').value = menuExistente.ranura_persistente || '';
    }

    this._toggleCamposMenu();
    this._renderChipsIngredientes(menuExistente?.ingredientes || []);
    this._renderChipsGrupos(menuExistente?.grupos || []);

    document.getElementById('modal-titulo-menu').textContent = menuExistente ? 'Editar menú' : 'Nuevo menú';
    document.getElementById('modal-menu').classList.add('abierto');
  },

  _toggleCamposMenu() {
    const ranura = document.getElementById('menu-ranura').value;
    document.getElementById('fila-persistente').style.display = ranura === 'persistente' ? 'flex' : 'none';
  },

  // ============================================================
  // CHIPS DE INGREDIENTES
  // ============================================================
  _renderChipsIngredientes(seleccionados = []) {
    const cont = document.getElementById('menu-ingredientes-sel');
    cont.innerHTML = '';

    Storage.getIngredientes().forEach(ing => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ing-chip' + (seleccionados.includes(ing.id) ? ' seleccionado' : '');
      chip.dataset.id = ing.id;
      chip.textContent = ing.nombre;
      chip.addEventListener('click', () => chip.classList.toggle('seleccionado'));
      cont.appendChild(chip);
    });

    const btnNuevo = document.createElement('button');
    btnNuevo.type = 'button';
    btnNuevo.className = 'btn-nuevo-ing';
    btnNuevo.textContent = '+ Ingrediente';
    btnNuevo.addEventListener('click', () => {
      this._abrirModalIngrediente(nuevo => {
        this._renderChipsIngredientes([...this._getChipsSeleccionados('#menu-ingredientes-sel'), nuevo.id]);
      });
    });
    cont.appendChild(btnNuevo);
  },

  // ============================================================
  // CHIPS DE GRUPOS (con formulario inline para crear nuevo)
  // ============================================================
  _renderChipsGrupos(seleccionados = []) {
    const cont = document.getElementById('menu-grupos-sel');
    cont.innerHTML = '';

    Storage.getGrupos().forEach(grupo => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ing-chip' + (seleccionados.includes(grupo.id) ? ' seleccionado' : '');
      chip.dataset.id = grupo.id;
      chip.textContent = `${grupo.nombre} (${grupo.intervalo}d)`;
      chip.title = `${grupo.nombre} — intervalo: ${grupo.intervalo} días`;
      chip.addEventListener('click', () => chip.classList.toggle('seleccionado'));
      cont.appendChild(chip);
    });

    // Botón para abrir el formulario inline
    const btnCrear = document.createElement('button');
    btnCrear.type = 'button';
    btnCrear.className = 'btn-nuevo-ing';
    btnCrear.textContent = '+ Crear grupo';
    cont.appendChild(btnCrear);

    // Formulario inline oculto
    const formGrupo = document.createElement('div');
    formGrupo.className = 'nuevo-grupo-form';
    formGrupo.style.display = 'none';

    const inputNombre = document.createElement('input');
    inputNombre.type = 'text';
    inputNombre.className = 'ng-nombre';
    inputNombre.placeholder = 'Nombre del grupo';

    const labelDias = document.createElement('span');
    labelDias.className = 'ng-label';
    labelDias.textContent = 'Intervalo (días):';

    const inputIntervalo = document.createElement('input');
    inputIntervalo.type = 'number';
    inputIntervalo.className = 'ng-intervalo';
    inputIntervalo.placeholder = '2';
    inputIntervalo.min = '1';
    inputIntervalo.max = '14';
    inputIntervalo.value = '2';

    const btnAnadir = document.createElement('button');
    btnAnadir.type = 'button';
    btnAnadir.className = 'btn-nuevo-ing';
    btnAnadir.textContent = 'Añadir';

    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.className = 'btn-icono';
    btnCancelar.textContent = '✕';

    formGrupo.appendChild(inputNombre);
    formGrupo.appendChild(labelDias);
    formGrupo.appendChild(inputIntervalo);
    formGrupo.appendChild(btnAnadir);
    formGrupo.appendChild(btnCancelar);
    cont.appendChild(formGrupo);

    // Abrir / cerrar formulario
    btnCrear.addEventListener('click', () => {
      btnCrear.style.display = 'none';
      formGrupo.style.display = 'flex';
      inputNombre.value = '';
      inputIntervalo.value = '2';
      inputNombre.focus();
    });
    btnCancelar.addEventListener('click', () => {
      formGrupo.style.display = 'none';
      btnCrear.style.display = '';
    });

    // Guardar nuevo grupo
    const guardarGrupo = () => {
      const nombre = inputNombre.value.trim();
      if (!nombre) { inputNombre.focus(); return; }

      const norm = nombre.toLowerCase();
      const intervalo = parseInt(inputIntervalo.value) || 2;

      // Si ya existe (case-insensitive), seleccionarlo sin crear uno nuevo
      const existe = Storage.getGrupos().find(g => g.nombre.toLowerCase() === norm);
      if (existe) {
        const actuales = this._getChipsSeleccionados('#menu-grupos-sel');
        if (!actuales.includes(existe.id)) actuales.push(existe.id);
        this._renderChipsGrupos(actuales);
        return;
      }

      const nuevo = { id: Storage.generarId(), nombre, intervalo };
      Storage.addGrupo(nuevo);
      const actuales = this._getChipsSeleccionados('#menu-grupos-sel');
      this._renderChipsGrupos([...actuales, nuevo.id]);
    };

    btnAnadir.addEventListener('click', guardarGrupo);
    inputNombre.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); guardarGrupo(); } });
  },

  _getChipsSeleccionados(selector) {
    return Array.from(document.querySelectorAll(`${selector} .ing-chip.seleccionado`))
      .map(el => el.dataset.id);
  },

  // ============================================================
  // GUARDAR MENÚ
  // ============================================================
  _guardarMenu() {
    const id      = document.getElementById('menu-id').value;
    const nombre  = document.getElementById('menu-nombre').value.trim();
    const ranuraV = document.getElementById('menu-ranura').value;
    const urlReceta = document.getElementById('menu-url').value.trim();
    const diaP    = document.getElementById('menu-dia-persistente').value;
    const ranuraP = document.getElementById('menu-ranura-persistente').value;
    const ings    = this._getChipsSeleccionados('#menu-ingredientes-sel');
    const grups   = this._getChipsSeleccionados('#menu-grupos-sel');

    if (!nombre) { alert('El nombre es obligatorio.'); return; }

    const norm = nombre.toLowerCase();
    const duplicado = Storage.getMenus().find(m => m.id !== id && m.nombre.toLowerCase() === norm);
    if (duplicado) {
      if (!confirm(`Ya existe un menú llamado "${duplicado.nombre}". ¿Continuar igualmente?`)) return;
    }

    const esPersistente = ranuraV === 'persistente';
    if (esPersistente && (diaP === '' || !ranuraP)) {
      alert('Elige el día y la ranura para el menú persistente.'); return;
    }

    const anterior = id ? Storage.getMenus().find(m => m.id === id) : null;

    const menu = {
      id:                 id || Storage.generarId(),
      nombre,
      ranura:             esPersistente ? ranuraP : ranuraV,
      grupos:             grups,
      url_receta:         urlReceta || null,
      ingredientes:       ings,
      persistente:        esPersistente,
      dia_persistente:    esPersistente ? parseInt(diaP) : null,
      ranura_persistente: esPersistente ? ranuraP : null,
      activo:             anterior ? (anterior.activo !== false) : true,
    };

    if (id) {
      if (anterior?.persistente && !esPersistente) Storage.limpiarMenuDelCalendario(id);
      Storage.updateMenu(menu);
    } else {
      Storage.addMenu(menu);
    }

    document.getElementById('modal-menu').classList.remove('abierto');
    this.renderMenus();
  },

  // ============================================================
  // SECCIÓN INGREDIENTES
  // ============================================================
  renderIngredientes() {
    const query = document.getElementById('buscador-ingredientes').value;
    const ingredientes = Storage.getIngredientes().filter(i => this._coincide(i.nombre, query));
    const lista = document.getElementById('lista-ingredientes');
    lista.innerHTML = '';

    if (ingredientes.length === 0) {
      lista.innerHTML = '<p class="vacio-msg">No hay ingredientes registrados.</p>';
      return;
    }

    ingredientes.forEach(ing => {
      const item = document.createElement('div');
      item.className = 'ing-item' + (ing.disponible ? '' : ' no-disponible');

      item.addEventListener('click', e => {
        if (e.target.closest('.btn-icono')) return;
        ing.disponible = !ing.disponible;
        Storage.updateIngrediente(ing);
        item.classList.toggle('no-disponible', !ing.disponible);
      });

      const info = document.createElement('div');
      info.className = 'ing-info';

      const dot = document.createElement('span');
      dot.className = 'ing-dot';

      const nombreEl = document.createElement('span');
      nombreEl.className = 'ing-nombre';
      nombreEl.textContent = ing.nombre;

      info.appendChild(dot);
      info.appendChild(nombreEl);

      const btnDel = document.createElement('button');
      btnDel.className = 'btn-icono btn-eliminar';
      btnDel.textContent = '🗑️';
      btnDel.title = 'Eliminar';
      btnDel.addEventListener('click', () => {
        if (confirm(`¿Eliminar el ingrediente "${ing.nombre}"?`)) {
          Storage.deleteIngrediente(ing.id);
          this.renderIngredientes();
        }
      });

      item.appendChild(info);
      item.appendChild(btnDel);
      lista.appendChild(item);
    });
  },

  // ============================================================
  // SECCIÓN GRUPOS
  // ============================================================
  renderGrupos() {
    const query = document.getElementById('buscador-grupos').value;
    const grupos = Storage.getGrupos().filter(g => this._coincide(g.nombre, query));
    const lista  = document.getElementById('lista-grupos');
    lista.innerHTML = '';

    if (grupos.length === 0) {
      lista.innerHTML = '<p class="vacio-msg">No hay grupos creados todavía.</p>';
      return;
    }

    grupos.forEach(grupo => {
      const item = document.createElement('div');
      item.className = 'ing-item';

      const info = document.createElement('div');
      info.className = 'ing-info';
      info.style.cursor = 'default';

      const dot = document.createElement('span');
      dot.className = 'ing-dot';
      dot.style.background = '#9b7fe8'; // color distinto para grupos

      const nombreEl = document.createElement('span');
      nombreEl.className = 'ing-nombre';
      nombreEl.textContent = grupo.nombre;

      const badge = document.createElement('span');
      badge.className = 'grupo-intervalo-badge';
      badge.textContent = `${grupo.intervalo}d`;
      badge.title = `Intervalo: ${grupo.intervalo} días`;

      info.appendChild(dot);
      info.appendChild(nombreEl);
      info.appendChild(badge);

      const acc = document.createElement('div');
      acc.className = 'menu-acciones';

      const btnEditar = document.createElement('button');
      btnEditar.className = 'btn-icono';
      btnEditar.textContent = '✏️';
      btnEditar.title = 'Editar grupo';
      btnEditar.addEventListener('click', () => this._editarGrupo(grupo));

      const btnDel = document.createElement('button');
      btnDel.className = 'btn-icono btn-eliminar';
      btnDel.textContent = '🗑️';
      btnDel.title = 'Eliminar grupo';
      btnDel.addEventListener('click', () => {
        const menus = Storage.getMenus().filter(m => (m.grupos || []).includes(grupo.id));
        const aviso = menus.length > 0
          ? `\n\nEste grupo está asignado a ${menus.length} menú(s) y se quitará de todos ellos.`
          : '';
        if (confirm(`¿Eliminar el grupo "${grupo.nombre}"?${aviso}`)) {
          Storage.deleteGrupo(grupo.id);
          this.renderGrupos();
        }
      });

      acc.appendChild(btnEditar);
      acc.appendChild(btnDel);
      item.appendChild(info);
      item.appendChild(acc);
      lista.appendChild(item);
    });
  },

  _crearGrupoDesdeSeccion() {
    this._abrirModalGrupo(null, () => this.renderGrupos());
  },

  _editarGrupo(grupo) {
    this._abrirModalGrupo(grupo, () => this.renderGrupos());
  },

  // ============================================================
  // MODAL INGREDIENTE
  // ============================================================
  _abrirModalIngrediente(callback) {
    this._modalIngredienteCallback = callback;
    document.getElementById('form-ingrediente').reset();
    document.getElementById('error-ingrediente').style.display = 'none';
    document.getElementById('modal-ingrediente').classList.add('abierto');
    setTimeout(() => document.getElementById('ing-nombre').focus(), 50);
  },

  _guardarIngrediente() {
    const nombre = document.getElementById('ing-nombre').value.trim();
    const errEl  = document.getElementById('error-ingrediente');
    errEl.style.display = 'none';
    if (!nombre) { errEl.textContent = 'El nombre es obligatorio.'; errEl.style.display = ''; return; }
    const norm   = nombre.toLowerCase();
    const existe = Storage.getIngredientes().find(i => i.nombre.toLowerCase() === norm);
    if (existe) { errEl.textContent = `Ya existe un ingrediente llamado "${existe.nombre}".`; errEl.style.display = ''; return; }
    const nuevo = { id: Storage.generarId(), nombre, disponible: true };
    Storage.addIngrediente(nuevo);
    document.getElementById('modal-ingrediente').classList.remove('abierto');
    if (this._modalIngredienteCallback) this._modalIngredienteCallback(nuevo);
  },

  // ============================================================
  // MODAL GRUPO
  // ============================================================
  _abrirModalGrupo(grupoExistente, callback) {
    this._modalGrupoCallback = callback;
    this._modalGrupoEditando = grupoExistente;
    const soloIntervalo = !!grupoExistente;
    document.getElementById('form-grupo').reset();
    document.getElementById('error-grupo').style.display = 'none';
    document.getElementById('modal-titulo-grupo').textContent = soloIntervalo ? 'Editar intervalo' : 'Nuevo grupo';
    document.getElementById('fila-grupo-nombre').style.display = soloIntervalo ? 'none' : '';
    document.getElementById('grupo-intervalo').value = grupoExistente ? grupoExistente.intervalo : '2';
    document.getElementById('modal-grupo').classList.add('abierto');
    setTimeout(() => document.getElementById(soloIntervalo ? 'grupo-intervalo' : 'grupo-nombre').focus(), 50);
  },

  _guardarGrupo() {
    const errEl     = document.getElementById('error-grupo');
    errEl.style.display = 'none';
    const intervalo = parseInt(document.getElementById('grupo-intervalo').value) || 2;

    if (this._modalGrupoEditando) {
      Storage.updateGrupo({ ...this._modalGrupoEditando, intervalo });
      document.getElementById('modal-grupo').classList.remove('abierto');
      if (this._modalGrupoCallback) this._modalGrupoCallback();
      return;
    }

    const nombre = document.getElementById('grupo-nombre').value.trim();
    if (!nombre) { errEl.textContent = 'El nombre es obligatorio.'; errEl.style.display = ''; return; }
    const norm   = nombre.toLowerCase();
    const existe = Storage.getGrupos().find(g => g.nombre.toLowerCase() === norm);
    if (existe) { errEl.textContent = `Ya existe un grupo llamado "${existe.nombre}".`; errEl.style.display = ''; return; }
    const nuevo  = { id: Storage.generarId(), nombre, intervalo };
    Storage.addGrupo(nuevo);
    document.getElementById('modal-grupo').classList.remove('abierto');
    if (this._modalGrupoCallback) this._modalGrupoCallback(nuevo);
  },

  // ============================================================
  // MODAL ASIGNAR DÍA
  // ============================================================
  _abrirModalDia(dia, ranura, menuActualId) {
    const menus = Storage.getMenus().filter(m =>
      m.activo !== false && !m.persistente && (m.ranura === ranura || m.ranura === 'ambas')
    );

    const diaLabel   = DIAS_LABELS[DIAS_KEYS.indexOf(dia)];
    const ranuraLabel = ranura === 'comida' ? 'Comida' : 'Cena';
    document.getElementById('modal-dia-titulo').textContent = `${diaLabel} — ${ranuraLabel}`;

    const lista = document.getElementById('modal-dia-lista');
    lista.innerHTML = '';

    // Opción: vaciar celda
    const btnVaciar = document.createElement('button');
    btnVaciar.className = 'dia-menu-opcion' + (!menuActualId ? ' seleccionado' : '');
    btnVaciar.innerHTML = '<span class="dia-menu-nombre">· Sin menú</span>';
    btnVaciar.addEventListener('click', () => this._asignarMenuDia(dia, ranura, null));
    lista.appendChild(btnVaciar);

    if (menus.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'vacio-msg';
      msg.textContent = 'No hay menús activos para esta ranura.';
      lista.appendChild(msg);
    }

    menus.forEach(menu => {
      const btn = document.createElement('button');
      btn.className = 'dia-menu-opcion' + (menu.id === menuActualId ? ' seleccionado' : '');

      const nombre = document.createElement('span');
      nombre.className = 'dia-menu-nombre';
      nombre.textContent = menu.nombre;

      const tag = document.createElement('span');
      tag.className = 'dia-menu-ranura';
      tag.textContent = { comida: 'Solo comida', cena: 'Solo cena', ambas: 'Comida y Cena' }[menu.ranura];

      btn.appendChild(nombre);
      btn.appendChild(tag);
      btn.addEventListener('click', () => this._asignarMenuDia(dia, ranura, menu.id));
      lista.appendChild(btn);
    });

    document.getElementById('modal-dia').classList.add('abierto');
  },

  _asignarMenuDia(dia, ranura, menuId) {
    const calendario = Storage.getCalendario();
    calendario[this.semanaVisible][dia][ranura] = menuId;
    Storage.saveCalendario(calendario);
    document.getElementById('modal-dia').classList.remove('abierto');
    this.renderCalendario();
  },

  // ============================================================
  // GENERAR MENÚS
  // ============================================================
  _generarMenus() {
    const disponibles = Storage.getMenus().filter(m => !m.persistente && m.activo !== false);
    if (disponibles.length === 0) {
      alert('No hay menús activos y no persistentes para generar el calendario.');
      this._mostrarSeccion('menus');
      this.renderMenus();
      return;
    }
    Algoritmo.generarSemana(this.semanaVisible);
    this._mostrarSeccion('calendario');
    this.renderCalendario();
    this._mostrarToast('Menú generado ✓');
  },

  // ============================================================
  // COMPARTIR
  // ============================================================
  _bindCompartir() {
    const modal = document.getElementById('modal-compartir');

    document.getElementById('btn-compartir').addEventListener('click', () => {
      document.getElementById('export-codigo').value = '';
      document.getElementById('import-codigo').value = '';
      modal.classList.add('abierto');
    });

    document.getElementById('btn-cerrar-modal-compartir')
      .addEventListener('click', () => modal.classList.remove('abierto'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('abierto'); });

    document.getElementById('btn-copiar-codigo').addEventListener('click', () => {
      const codigo = this._exportarCodigo();
      document.getElementById('export-codigo').value = codigo;
      navigator.clipboard.writeText(codigo)
        .then(() => this._mostrarToast('Código copiado al portapapeles ✓'))
        .catch(() => {
          document.getElementById('export-codigo').select();
          document.execCommand('copy');
          this._mostrarToast('Código copiado ✓');
        });
    });

    document.getElementById('btn-cargar-codigo').addEventListener('click', () => {
      const codigo = document.getElementById('import-codigo').value.trim();
      if (!codigo) { alert('Pega primero un código en el área de texto.'); return; }
      if (!confirm('¿Seguro? Esto reemplazará todos tus datos actuales.')) return;
      try {
        this._importarCodigo(codigo);
        modal.classList.remove('abierto');
        this.renderCalendario();
        this._mostrarToast('Datos cargados correctamente ✓');
      } catch {
        alert('El código no es válido o está corrupto. Asegúrate de copiarlo completo.');
      }
    });
  },

  _exportarCodigo() {
    const datos = {
      menus:        Storage.getMenus(),
      ingredientes: Storage.getIngredientes(),
      grupos:       Storage.getGrupos(),
      calendario:   Storage.getCalendario(),
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(datos))));
  },

  _importarCodigo(codigo) {
    const datos = JSON.parse(decodeURIComponent(escape(atob(codigo))));
    if (!Array.isArray(datos.menus) || !Array.isArray(datos.ingredientes) || !datos.calendario) {
      throw new Error('Estructura inválida');
    }
    Storage.saveMenus(datos.menus);
    Storage.saveIngredientes(datos.ingredientes);
    Storage.saveCalendario(datos.calendario);
    if (Array.isArray(datos.grupos)) Storage.saveGrupos(datos.grupos);
  },

  // ============================================================
  // UTILIDADES
  // ============================================================
  _coincide(nombre, query) {
    if (!query || !query.trim()) return true;
    const n = nombre.toLowerCase();
    return query.trim().toLowerCase().split(/\s+/).every(p => n.includes(p));
  },

  _mostrarToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2500);
  },
};

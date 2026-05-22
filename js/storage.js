// storage.js — Capa de persistencia con localStorage

const CLAVES = {
  menus: 'menus',
  ingredientes: 'ingredientes',
  grupos: 'grupos',
  calendario: 'calendario',
};

const Storage = {

  // --- Menús ---
  getMenus() {
    const menus = JSON.parse(localStorage.getItem(CLAVES.menus) || '[]');
    // Normaliza: garantiza que el campo grupos existe como array
    return menus.map(m => ({ ...m, grupos: Array.isArray(m.grupos) ? m.grupos : [] }));
  },
  saveMenus(menus) {
    localStorage.setItem(CLAVES.menus, JSON.stringify(menus));
  },
  addMenu(menu) {
    const menus = this.getMenus();
    menus.push(menu);
    this.saveMenus(menus);
  },
  updateMenu(menuActualizado) {
    const menus = this.getMenus().map(m => m.id === menuActualizado.id ? menuActualizado : m);
    this.saveMenus(menus);
  },
  deleteMenu(id) {
    this.saveMenus(this.getMenus().filter(m => m.id !== id));
    this.limpiarMenuDelCalendario(id);
  },

  // --- Ingredientes ---
  getIngredientes() {
    return JSON.parse(localStorage.getItem(CLAVES.ingredientes) || '[]');
  },
  saveIngredientes(ingredientes) {
    localStorage.setItem(CLAVES.ingredientes, JSON.stringify(ingredientes));
  },
  addIngrediente(ingrediente) {
    const lista = this.getIngredientes();
    lista.push(ingrediente);
    this.saveIngredientes(lista);
  },
  updateIngrediente(actualizado) {
    this.saveIngredientes(this.getIngredientes().map(i => i.id === actualizado.id ? actualizado : i));
  },
  deleteIngrediente(id) {
    this.saveIngredientes(this.getIngredientes().filter(i => i.id !== id));
    // Quitar referencia en todos los menús
    this.saveMenus(this.getMenus().map(m => ({ ...m, ingredientes: m.ingredientes.filter(iid => iid !== id) })));
  },

  // --- Grupos alimentarios ---
  getGrupos() {
    return JSON.parse(localStorage.getItem(CLAVES.grupos) || '[]');
  },
  saveGrupos(grupos) {
    localStorage.setItem(CLAVES.grupos, JSON.stringify(grupos));
  },
  addGrupo(grupo) {
    const lista = this.getGrupos();
    lista.push(grupo);
    this.saveGrupos(lista);
  },
  updateGrupo(actualizado) {
    this.saveGrupos(this.getGrupos().map(g => g.id === actualizado.id ? actualizado : g));
  },
  deleteGrupo(id) {
    this.saveGrupos(this.getGrupos().filter(g => g.id !== id));
    // Quitar referencia en todos los menús
    this.saveMenus(this.getMenus().map(m => ({ ...m, grupos: m.grupos.filter(gid => gid !== id) })));
  },

  // --- Calendario ---
  getCalendario() {
    const base = this._calendarioVacio();
    const guardado = JSON.parse(localStorage.getItem(CLAVES.calendario) || 'null');
    if (!guardado) return base;
    return {
      semanaActual:    { ...base.semanaActual,    ...guardado.semanaActual },
      semanaSiguiente: { ...base.semanaSiguiente, ...guardado.semanaSiguiente },
    };
  },
  saveCalendario(calendario) {
    localStorage.setItem(CLAVES.calendario, JSON.stringify(calendario));
  },
  _calendarioVacio() {
    const dias = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
    const semana = {};
    dias.forEach(d => { semana[d] = { comida: null, cena: null }; });
    return { semanaActual: JSON.parse(JSON.stringify(semana)), semanaSiguiente: JSON.parse(JSON.stringify(semana)) };
  },
  limpiarMenuDelCalendario(menuId) {
    const cal = this.getCalendario();
    const limpiar = s => Object.keys(s).forEach(d => {
      if (s[d].comida === menuId) s[d].comida = null;
      if (s[d].cena   === menuId) s[d].cena   = null;
    });
    limpiar(cal.semanaActual);
    limpiar(cal.semanaSiguiente);
    this.saveCalendario(cal);
  },

  // --- Utilidades ---
  generarId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  },
};

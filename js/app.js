/* 应用状态、路由与交互 */
const App = {
  el: null,

  state: {
    page: 'home',
    viewMonth: Util.monthOf(Util.todayStr()),
    selectedDate: null,
    searchOpen: false,
    keyword: '',
    statsMonth: Util.monthOf(Util.todayStr()),
    rangeStart: null,
    rangeEnd: null,
    rangeComputed: false,
    entry: null,
    hideAmount: false,
    monthPickerYear: new Date().getFullYear(),
    monthPickerOpen: false,
    monthPickerTarget: 'stats',
    accountEdit: null,
    billMenuId: null,
    billMenuPos: null,
    deleteConfirmId: null,
    catManageType: 'expense',
    catEditType: 'expense',
    catEditName: '',
    catEditIcon: 0,
    catEditPage: 0,
    entryCatPage: 0,
    catDeleteName: null,
    booksReturn: 'home',
    bookEdit: null,
    bookDeleteId: null,
    accountSheetOpen: false,
    reopenAccountSheet: false
  },

  /* ---------- 初始化 ---------- */
  async init() {
    this.el = document.getElementById('app');
    this.el.innerHTML = '<div class="boot"><div class="boot-spin"></div><p>正在加载账本…</p></div>';
    try {
      await Store.load();
    } catch (e) {
      console.error('[init]', e);
    }
    this.resetRangeDefaults();
    this.bindGlobal();
    this.render();
  },

  resetRangeDefaults() {
    const ym = this.state.statsMonth;
    const last = `${ym}-${Util.pad(Util.daysInMonth(ym))}`;
    this.state.rangeStart = `${ym}-01`;
    this.state.rangeEnd = Util.isCurrentMonth(ym) ? Util.todayStr() : last;
    this.state.rangeComputed = false;
  },

  /* ---------- 渲染 ---------- */
  render() {
    const page = this.state.page;
    const tabPages = ['home', 'stats', 'assets'];
    let html = `<div class="page page-${page}">${Pages[page]()}</div>`;
    if (tabPages.includes(page)) html += tabbarHTML();
    this.el.innerHTML = html;
    this.afterRender();
  },

  renderModal() {
    let html = '';
    if (this.state.monthPickerOpen) html += monthPickerHTML();
    if (this.state.accountEdit) html += accountEditorHTML();
    if (this.state.billMenuId) html += billMenuHTML();
    if (this.state.deleteConfirmId) html += deleteConfirmHTML();
    if (this.state.catDeleteName) html += catDeleteConfirmHTML();
    if (this.state.bookEdit) html += bookEditorHTML();
    if (this.state.bookDeleteId) html += bookDeleteConfirmHTML();
    if (this.state.accountSheetOpen) html += accountSheetHTML();
    document.getElementById('modal-root').innerHTML = html;
    if (this.state.accountEdit) {
      const name = document.getElementById('acc-name');
      if (name) setTimeout(() => name.focus(), 50);
    }
    if (this.state.bookEdit) {
      const name = document.getElementById('book-name-input');
      if (name) setTimeout(() => name.focus(), 50);
    }
  },

  afterRender() {
    const page = this.state.page;

    if (page === 'home') {
      this.bindCalendarSwipe();
      this.bindBillSwipe();
      const si = document.getElementById('search-input');
      if (si) {
        si.addEventListener('input', () => {
          this.state.keyword = si.value;
          const list = document.getElementById('bill-list');
          if (list) list.innerHTML = billListHTML();
        });
      }
    }

    if (page === 'entry') {
      const ni = document.getElementById('note-input');
      if (ni) {
        ni.addEventListener('input', () => { this.state.entry.note = ni.value; });
      }
      this.bindGridSwipe('cat-grid', 'entryCatPage', Store.cats(this.state.entry.type).length);
    }

    if (page === 'cats') {
      this.bindCatDrag();
    }

    if (page === 'catEdit') {
      const ni = document.getElementById('cat-name-input');
      if (ni) {
        ni.addEventListener('input', () => {
          this.state.catEditName = ni.value;
          this.refreshSaveBtn();
        });
      }
      this.bindGridSwipe('ce-icon-grid', 'catEditPage', CAT_ICON_POOL.length);
    }

    if (page === 'stats') {
      ['range-start', 'range-end'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
          let s = document.getElementById('range-start').value;
          let e = document.getElementById('range-end').value;
          if (s && e && s > e) [s, e] = [e, s];
          this.state.rangeStart = s;
          this.state.rangeEnd = e;
          this.state.rangeComputed = false; /* 改日期后需重新点计算 */
          const card = document.getElementById('range-card');
          if (card) card.innerHTML = rangeCardHTML();
        });
      });
    }
  },

  /* ---------- 导航 ---------- */
  navigate(page) {
    if (this.state.page === page) return;
    this.state.page = page;
    this.render();
  },

  /* ---------- 记账录入 ---------- */
  openEntry(bill) {
    if (bill) {
      const cats = Store.cats(bill.type);
      this.state.entry = {
        type: bill.type,
        cat: Math.max(0, cats.findIndex(c => c.name === bill.category)),
        note: bill.note || '',
        amt: String(bill.amount),
        date: bill.date,
        editId: bill.id,
        pendingOp: null,
        acc: 0,
        fresh: false,
        accountId: bill.accountId || null
      };
    } else {
      this.state.entry = {
        type: 'expense',
        cat: 0,
        note: '',
        amt: '0',
        date: Util.todayStr(),
        editId: null,
        pendingOp: null,
        acc: 0,
        fresh: false,
        accountId: null
      };
    }
    this.state.entryCatPage = 0;
    this.state.page = 'entry';
    this.render();
  },

  calcEntry(a, op, b) { return op === '+' ? a + b : a - b; },

  entryKey(k) {
    const e = this.state.entry;
    if (!e) return;

    if (k === 'ok') { this.saveEntry(); return; }

    if (k === 'today') {
      e.date = Util.todayStr();
      toast('已切换到今天');
      this.render();
      return;
    }

    if (k === 'del') {
      if (e.fresh) { e.amt = '0'; e.fresh = false; }
      else if (e.amt.length > 1) e.amt = e.amt.slice(0, -1);
      else e.amt = '0';
      if (parseFloat(e.amt) > 999999.99) e.amt = '999999.99';
      this.render();
      return;
    }

    if (k === '+' || k === '-') {
      const cur = parseFloat(e.amt) || 0;
      e.acc = e.pendingOp ? this.calcEntry(e.acc, e.pendingOp, cur) : cur;
      e.pendingOp = k;
      e.amt = String(Math.round(e.acc * 100) / 100);
      e.fresh = true;
      this.render();
      return;
    }

    if (k === '.') {
      if (e.fresh) { e.amt = '0.'; e.fresh = false; }
      else if (!e.amt.includes('.')) e.amt += '.';
      this.render();
      return;
    }

    /* 数字键 */
    if (e.fresh) { e.amt = k; e.fresh = false; }
    else if (e.amt.replace('.', '').replace('-', '').length >= 9) return;
    else if (e.amt === '0') e.amt = k;
    else {
      const dec = e.amt.split('.')[1];
      if (dec !== undefined && dec.length >= 2) return;
      e.amt += k;
    }
    if (parseFloat(e.amt) > 999999.99) e.amt = '999999.99';
    this.render();
  },

  saveEntry() {
    const e = this.state.entry;
    let amount = parseFloat(e.amt) || 0;
    if (e.pendingOp && !e.fresh) amount = this.calcEntry(e.acc, e.pendingOp, amount);
    amount = Math.round(amount * 100) / 100;
    if (!(amount > 0)) { toast('请输入大于 0 的金额'); return; }

    const bill = {
      id: e.editId || Util.uid(),
      type: e.type,
      category: Store.cats(e.type)[e.cat].name,
      amount,
      note: (e.note || '').trim(),
      date: e.date,
      book: Store.data.activeBook,
      accountId: e.accountId || null
    };
    if (e.editId) { Store.updateBill(bill); toast('已更新'); }
    else { Store.addBill(bill); toast('记好啦 ~'); }

    this.state.viewMonth = Util.monthOf(bill.date);
    this.state.selectedDate = bill.date;
    this.navigate('home');
  },

  /* ---------- 手势 ---------- */
  bindCalendarSwipe() {
    const cal = document.getElementById('calendar');
    if (!cal) return;
    let sx = 0, sy = 0, moved = false;
    cal.addEventListener('touchstart', ev => {
      if (ev.touches.length !== 1) return;
      sx = ev.touches[0].clientX; sy = ev.touches[0].clientY; moved = false;
    }, { passive: true });
    cal.addEventListener('touchmove', ev => {
      const dx = ev.touches[0].clientX - sx;
      const dy = ev.touches[0].clientY - sy;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) moved = true;
    }, { passive: true });
    cal.addEventListener('touchend', ev => {
      if (!moved) return;
      const dx = ev.changedTouches[0].clientX - sx;
      if (dx > 50) this.changeMonth(-1);
      else if (dx < -50) this.changeMonth(1);
    });
  },

  changeMonth(delta) {
    this.state.viewMonth = delta > 0 ? Util.nextMonth(this.state.viewMonth) : Util.prevMonth(this.state.viewMonth);
    this.state.selectedDate = null;
    this.render();
  },

  bindBillSwipe() {
    document.querySelectorAll('.bill-row-wrap').forEach(wrap => {
      const row = wrap.querySelector('.bill-row');
      let sx = 0, sy = 0, dx = 0, open = false, dragging = false;

      const closeRow = () => {
        row.style.transition = 'transform .22s ease';
        row.style.transform = 'translateX(0)';
        open = false;
      };

      /* Pointer Events：同时支持触摸与鼠标左滑 */
      row.addEventListener('pointerdown', ev => {
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;
        if (ev.target.closest('.row-more')) return; /* 「···」按钮不走滑动手势 */
        sx = ev.clientX; sy = ev.clientY;
        dragging = false;
        row.style.transition = 'none';
        try { row.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      });

      row.addEventListener('pointermove', ev => {
        const mx = ev.clientX - sx;
        const my = ev.clientY - sy;
        if (!dragging) {
          if (Math.abs(mx) < 10) return;
          if (Math.abs(my) > Math.abs(mx)) return;
          dragging = true;
        }
        const base = open ? -80 : 0;
        dx = Math.max(-80, Math.min(0, base + mx));
        row.style.transform = `translateX(${dx}px)`;
      });

      const endDrag = () => {
        if (dragging) {
          row.style.transition = 'transform .22s ease';
          if (dx < -40) {
            row.style.transform = 'translateX(-80px)';
            open = true;
          } else {
            closeRow();
          }
        }
        dragging = false;
      };
      row.addEventListener('pointerup', endDrag);
      row.addEventListener('pointercancel', endDrag);

      row.addEventListener('click', ev => {
        if (ev.target.closest('.row-more')) return; /* 由 bill-more 动作处理 */
        if (open) { closeRow(); return; }
        const bill = Store.allBills().find(b => b.id === row.dataset.id);
        if (bill) App.openEntry(bill);
      });
    });
  },

  /* 宫格左右滑动分页（分类页 / 图标页） */
  bindGridSwipe(gridId, pageKey, total) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const perPage = 16;
    const pageCount = Math.max(1, Math.ceil(total / perPage));
    if (pageCount < 2) return;
    let sx = 0, sy = 0, moved = false;
    grid.addEventListener('touchstart', ev => {
      if (ev.touches.length !== 1) return;
      sx = ev.touches[0].clientX; sy = ev.touches[0].clientY; moved = false;
    }, { passive: true });
    grid.addEventListener('touchmove', ev => {
      const dx = ev.touches[0].clientX - sx;
      const dy = ev.touches[0].clientY - sy;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) moved = true;
    }, { passive: true });
    grid.addEventListener('touchend', ev => {
      if (!moved) return;
      const dx = ev.changedTouches[0].clientX - sx;
      if (Math.abs(dx) < 50) return;
      let page = this.state[pageKey];
      page = dx < 0 ? Math.min(pageCount - 1, page + 1) : Math.max(0, page - 1);
      if (page !== this.state[pageKey]) {
        this.state[pageKey] = page;
        this.render();
      }
    });
  },

  /* 分类管理：拖拽排序 */
  bindCatDrag() {
    const list = document.getElementById('cat-manage-list');
    if (!list) return;
    list.querySelectorAll('.cat-manage-row').forEach(row => {
      const handle = row.querySelector('.drag-handle');
      let startY = 0, originTop = 0, dragging = false;

      handle.addEventListener('pointerdown', ev => {
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;
        ev.preventDefault();
        dragging = true;
        startY = ev.clientY;
        originTop = row.offsetTop;
        row.classList.add('dragging');
        try { handle.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      });

      handle.addEventListener('pointermove', ev => {
        if (!dragging) return;
        const y = ev.clientY - startY - (row.offsetTop - originTop);
        row.style.transform = `translateY(${y}px)`;
        const myCenter = row.offsetTop + y + row.offsetHeight / 2;
        list.querySelectorAll('.cat-manage-row').forEach(other => {
          if (other === row) return;
          const oc = other.offsetTop + other.offsetHeight / 2;
          if (myCenter > oc && other.previousElementSibling === row) {
            list.insertBefore(other, row);
          } else if (myCenter < oc && other.nextElementSibling === row) {
            list.insertBefore(row, other);
          }
        });
      });

      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        row.classList.remove('dragging');
        row.style.transform = '';
        /* 按 DOM 顺序持久化 */
        const names = [...list.querySelectorAll('.cat-manage-row')].map(r => r.dataset.name);
        const type = this.state.catManageType;
        const ordered = names.map(n => Store.cats(type).find(c => c.name === n)).filter(Boolean);
        if (ordered.length === Store.cats(type).length) Store.setCats(type, ordered);
        this.render();
      };
      handle.addEventListener('pointerup', endDrag);
      handle.addEventListener('pointercancel', endDrag);
    });
  },

  /* 自定义分类页：实时刷新保存按钮可用态 */
  refreshSaveBtn() {
    const btn = document.querySelector('.ce-save');
    if (!btn) return;
    btn.classList.toggle('disabled', !catNameValid(this.state.catEditName, this.state.catEditType));
  },

  /* 「···」按钮：弹出悬浮上拉菜单 */
  openBillMenu(id, anchorEl) {
    this.state.billMenuId = id;
    const POP_W = 112, POP_H = 92;
    let top = 80, left = 0;
    if (anchorEl) {
      const r = anchorEl.getBoundingClientRect();
      top = r.top - POP_H - 6;
      if (top < 70) top = r.bottom + 6; /* 空间不足时向下展开 */
      left = r.right - POP_W;
      left = Math.max(8, Math.min(left, window.innerWidth - POP_W - 8));
    }
    this.state.billMenuPos = { top, left };
    this.renderModal();
    /* 滚动时自动收起 */
    const close = () => this.closeBillMenu();
    window.addEventListener('scroll', close, { once: true, capture: true });
  },

  closeBillMenu() {
    if (!this.state.billMenuId) return;
    this.state.billMenuId = null;
    this.renderModal();
  },

  /* ---------- 全局事件委托 ---------- */
  bindGlobal() {
    document.getElementById('app').addEventListener('click', ev => {
      const el = ev.target.closest('[data-action]');
      if (!el) return;
      this.onAction(el.dataset.action, el, ev);
    });
    document.getElementById('modal-root').addEventListener('click', ev => {
      const el = ev.target.closest('[data-action]');
      if (!el) return;
      if (el.hasAttribute('data-stop')) { ev.stopPropagation(); return; }
      this.onAction(el.dataset.action, el, ev);
    });
  },

  onAction(action, el, ev) {
    const st = this.state;
    switch (action) {
      /* ---- 首页 ---- */
      case 'book-menu':
        toast('账本管理功能即将上线');
        break;
      case 'toggle-search':
        st.searchOpen = !st.searchOpen;
        if (!st.searchOpen) { st.keyword = ''; }
        this.render();
        if (st.searchOpen) {
          setTimeout(() => { const i = document.getElementById('search-input'); if (i) i.focus(); }, 60);
        }
        break;
      case 'clear-search':
        st.keyword = '';
        this.render();
        break;
      case 'pick-day': {
        const d = el.dataset.date;
        st.selectedDate = st.selectedDate === d ? null : d;
        this.render();
        break;
      }
      case 'clear-day':
        st.selectedDate = null;
        this.render();
        break;
      case 'prev-month':
        this.changeMonth(-1);
        break;
      case 'next-month':
        this.changeMonth(1);
        break;
      case 'del-bill':
        Store.removeBill(el.dataset.id);
        toast('已删除');
        this.render();
        break;
      case 'bill-more':
        this.openBillMenu(el.dataset.id, el);
        break;
      case 'bill-edit': {
        const bill = Store.allBills().find(b => b.id === st.billMenuId);
        st.billMenuId = null;
        this.renderModal();
        if (bill) this.openEntry(bill);
        break;
      }
      case 'bill-delete':
        st.deleteConfirmId = st.billMenuId;
        st.billMenuId = null;
        this.renderModal();
        break;
      case 'confirm-delete-bill':
        Store.removeBill(st.deleteConfirmId);
        st.deleteConfirmId = null;
        this.renderModal();
        toast('已删除');
        this.render();
        break;
      case 'close-bill-menu':
        this.closeBillMenu();
        break;
      case 'go-entry':
        this.openEntry(null);
        break;

      /* ---- 录入页 ---- */
      case 'back':
        this.navigate('home');
        break;
      case 'seg-type': {
        const t = el.dataset.type;
        if (st.entry && st.entry.type !== t) {
          st.entry.type = t;
          st.entry.cat = 0;
          st.entryCatPage = 0;
          this.render();
        }
        break;
      }
      case 'pick-cat':
        st.entry.cat = Number(el.dataset.i);
        this.render();
        break;
      case 'cat-dot':
        st.entryCatPage = Number(el.dataset.i);
        this.render();
        break;
      case 'open-cat-manage':
        st.catManageType = st.entry.type;
        st.page = 'cats';
        this.render();
        break;
      case 'back-from-cats':
        this.navigate('entry');
        break;
      case 'cat-manage-tab':
        st.catManageType = el.dataset.type;
        this.render();
        break;
      case 'del-cat': {
        const name = el.dataset.name;
        const cat = Store.cats(st.catManageType).find(c => c.name === name);
        if (cat && cat.special === 'setting') { toast('「设置」为固定入口，不可删除'); break; }
        st.catDeleteName = name;
        this.renderModal();
        break;
      }
      case 'confirm-del-cat':
        Store.removeCat(st.catManageType, st.catDeleteName);
        st.catDeleteName = null;
        this.renderModal();
        toast('已删除');
        this.render();
        break;
      case 'go-cat-edit':
        st.catEditType = st.catManageType;
        st.catEditName = '';
        st.catEditIcon = 0;
        st.catEditPage = 0;
        st.page = 'catEdit';
        this.render();
        break;
      case 'back-from-cat-edit':
        st.page = 'cats';
        this.render();
        break;
      case 'cat-edit-tab':
        st.catEditType = el.dataset.type;
        st.catEditName = '';
        this.render();
        break;
      case 'focus-cat-name': {
        const input = document.getElementById('cat-name-input');
        if (input) input.focus();
        break;
      }
      case 'pick-cat-icon':
        st.catEditIcon = Number(el.dataset.i);
        this.render();
        break;
      case 'cat-edit-dot':
        st.catEditPage = Number(el.dataset.i);
        this.render();
        break;
      case 'save-custom-cat': {
        const type = st.catEditType;
        if (!catNameValid(st.catEditName, type)) { toast('名称限 4 个汉字或 6 个英文字母，且不能重名'); break; }
        const icon = CAT_ICON_POOL[st.catEditIcon] || '📌';
        const bg = CAT_BG_POOL[Store.cats(type).length % CAT_BG_POOL.length];
        Store.addCat(type, { name: st.catEditName.trim(), icon, bg, custom: true });
        toast('已添加「' + st.catEditName.trim() + '」');
        st.page = 'cats';
        this.render();
        break;
      }
      case 'key':
        this.entryKey(el.dataset.key);
        break;
      case 'pick-bill-date': {
        const input = document.createElement('input');
        input.type = 'date';
        input.value = st.entry.date;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.addEventListener('change', () => {
          if (input.value) { st.entry.date = input.value; this.render(); }
          input.remove();
        });
        input.showPicker ? input.showPicker() : input.click();
        break;
      }

      /* ---- 月份选择（首页标题 / 统计页共用） ---- */
      case 'open-month-picker':
        st.monthPickerTarget = el.dataset.target || 'stats';
        st.monthPickerYear = Number((st.monthPickerTarget === 'home' ? st.viewMonth : st.statsMonth).split('-')[0]);
        st.monthPickerOpen = true;
        this.renderModal();
        break;
      case 'mp-range':
        if (el.dataset.range !== 'month') toast('该维度即将上线');
        break;
      case 'mp-year':
        st.monthPickerYear += Number(el.dataset.d);
        this.renderModal();
        break;
      case 'mp-pick': {
        const ym = el.dataset.ym;
        if (st.monthPickerTarget === 'home') {
          st.viewMonth = ym;
          st.selectedDate = null;
        } else {
          st.statsMonth = ym;
          this.resetRangeDefaults();
        }
        st.monthPickerOpen = false;
        this.renderModal();
        this.render();
        break;
      }

      case 'calc-range': {
        const s = document.getElementById('range-start').value;
        const e = document.getElementById('range-end').value;
        if (!s || !e) { toast('请先选择起止日期'); break; }
        if (s > e) { toast('开始日期不能晚于结束日期'); break; }
        st.rangeStart = s;
        st.rangeEnd = e;
        st.rangeComputed = true;
        const card = document.getElementById('range-card');
        if (card) card.innerHTML = rangeCardHTML();
        toast('已计算 ' + Util.cnDate(s) + ' ~ ' + Util.cnDate(e));
        break;
      }

      /* ---- 资产页 ---- */
      case 'toggle-hide':
        st.hideAmount = !st.hideAmount;
        this.render();
        break;
      case 'trend':
        toast('功能即将上线');
        break;
      case 'add-account':
        st.accountEdit = { id: null, kind: el.dataset.kind, name: '', balance: 0, icon: el.dataset.kind === 'asset' ? '💵' : '💳' };
        this.renderModal();
        break;
      case 'edit-account': {
        const a = Store.data.accounts.find(x => x.id === el.dataset.id);
        if (a) {
          st.accountEdit = { id: a.id, kind: a.kind, name: a.name, balance: a.balance, icon: a.icon };
          this.renderModal();
        }
        break;
      }
      case 'pick-acc-icon':
        st.accountEdit.icon = el.dataset.icon;
        this.renderModal();
        break;
      case 'save-account': {
        const a = st.accountEdit;
        const name = document.getElementById('acc-name').value.trim();
        const balance = parseFloat(document.getElementById('acc-balance').value) || 0;
        if (!name) { toast('请输入账户名称'); return; }
        const data = { id: a.id || Util.uid(), kind: a.kind, name, balance, icon: a.icon };
        if (a.id) { Store.updateAccount(data); toast('已保存'); }
        else { Store.addAccount(data); toast('已添加'); }
        st.accountEdit = null;
        if (st.reopenAccountSheet) {
          st.reopenAccountSheet = false;
          st.accountSheetOpen = true; /* 添加后返回账户选择面板 */
        }
        this.renderModal();
        this.render();
        break;
      }
      case 'del-account':
        if (confirm('确定删除该账户吗？')) {
          Store.removeAccount(st.accountEdit.id);
          st.accountEdit = null;
          this.renderModal();
          this.render();
          toast('已删除');
        }
        break;

      /* ---- 账本 ---- */
      case 'open-books':
        st.booksReturn = el.dataset.from || 'home';
        st.page = 'books';
        this.render();
        break;
      case 'back-from-books':
        this.navigate(st.booksReturn === 'entry' ? 'entry' : 'home');
        break;
      case 'switch-book': {
        const id = el.dataset.id;
        if (id === Store.data.activeBook) { toast('正在使用中'); break; }
        Store.setActiveBook(id);
        st.selectedDate = null;
        st.keyword = '';
        toast('已切换至「' + Store.activeBook().name + '」');
        this.navigate(st.booksReturn === 'entry' ? 'entry' : 'home');
        break;
      }
      case 'edit-book': {
        ev.stopPropagation();
        const b = Store.books().find(x => x.id === el.dataset.id);
        if (b) {
          st.bookEdit = { id: b.id, name: b.name, icon: b.icon, bg: b.bg };
          this.renderModal();
        }
        break;
      }
      case 'new-book':
        st.bookEdit = { id: null, name: '', icon: '📔', bg: '#E8F0FF' };
        this.renderModal();
        break;
      case 'pick-book-icon':
        st.bookEdit.icon = el.dataset.icon;
        this.renderModal();
        break;
      case 'save-book': {
        const b = st.bookEdit;
        const name = document.getElementById('book-name-input').value.trim();
        if (!name) { toast('请输入账本名称'); break; }
        if (b.id) {
          Store.updateBook({ id: b.id, name, icon: b.icon, bg: b.bg, example: Store.books().find(x => x.id === b.id).example });
          toast('已保存');
        } else {
          Store.addBook({ id: Util.uid(), name, icon: b.icon, bg: b.bg });
          toast('已创建「' + name + '」并切换');
          st.selectedDate = null;
        }
        st.bookEdit = null;
        this.renderModal();
        this.render();
        break;
      }
      case 'del-book':
        st.bookDeleteId = st.bookEdit.id;
        st.bookEdit = null;
        this.renderModal();
        break;
      case 'confirm-del-book':
        Store.removeBook(st.bookDeleteId);
        st.bookDeleteId = null;
        this.renderModal();
        toast('已删除账本');
        this.render();
        break;

      /* ---- 录入页：选择资产账户 ---- */
      case 'open-account-sheet':
        st.accountSheetOpen = true;
        this.renderModal();
        break;
      case 'pick-bill-account':
        st.entry.accountId = el.dataset.id || null;
        st.accountSheetOpen = false;
        this.renderModal();
        this.render();
        break;
      case 'add-account-from-sheet':
        st.accountSheetOpen = false;
        st.reopenAccountSheet = true;
        st.accountEdit = { id: null, kind: 'asset', name: '', balance: 0, icon: '💵' };
        this.renderModal();
        break;

      /* ---- Tab ---- */
      case 'tab':
        this.navigate(el.dataset.page);
        break;

      /* ---- 弹窗 ---- */
      case 'close-modal':
        st.monthPickerOpen = false;
        st.accountEdit = null;
        st.billMenuId = null;
        st.deleteConfirmId = null;
        st.catDeleteName = null;
        st.bookEdit = null;
        st.bookDeleteId = null;
        st.accountSheetOpen = false;
        this.renderModal();
        break;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());

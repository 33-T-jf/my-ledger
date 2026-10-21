/* 各页面模板渲染 */
const Pages = {};

/* ============ 首页：日历 / 明细 ============ */
Pages.home = function () {
  const st = App.state;
  const ym = st.viewMonth;
  const [y, m] = ym.split('-').map(Number);
  const sum = Store.monthSummary(ym);

  return `
  <header class="navbar">
    <button class="nav-btn" data-action="open-books" data-from="home">
      <span>${Util.esc(Store.activeBook().name)}</span>${Icons.chevronDown(14)}
    </button>
    <button class="nav-title nav-title-btn" data-action="open-month-picker" data-target="home">
      ${y} 年 ${m} 月 账目明细${Icons.chevronDown(14)}
    </button>
    <button class="nav-icon" data-action="toggle-search" aria-label="搜索">${Icons.search(20)}</button>
  </header>

  <div class="search-wrap ${st.searchOpen ? 'open' : ''}">
    <div class="search-box">
      ${Icons.search(15)}
      <input id="search-input" placeholder="搜索备注 / 分类" value="${Util.esc(st.keyword)}">
      ${st.keyword ? `<button class="search-clear" data-action="clear-search">${Icons.close(14)}</button>` : ''}
    </div>
  </div>

  <section class="summary-bar card">
    <div class="sum-item">
      <span class="sum-label">本月支出</span>
      <span class="sum-val expense">-¥${Util.fmt(sum.expense)}</span>
    </div>
    <div class="sum-item sum-balance">
      <span class="sum-label">本月结余</span>
      <span class="sum-val primary">¥${Util.fmt(sum.balance)}</span>
    </div>
    <div class="sum-item">
      <span class="sum-label">本月收入</span>
      <span class="sum-val income">+¥${Util.fmt(sum.income)}</span>
    </div>
  </section>

  <section class="card calendar" id="calendar">
    <div class="cal-head">
      <button class="cal-nav" data-action="prev-month" aria-label="上一个月">${Icons.chevronLeft(18)}</button>
      <span class="cal-month">${y} 年 ${m} 月</span>
      <button class="cal-nav" data-action="next-month" aria-label="下一个月">${Icons.chevronRight(18)}</button>
    </div>
    <div class="cal-weekdays">
      ${['一', '二', '三', '四', '五', '六', '日'].map(w => `<span>${w}</span>`).join('')}
    </div>
    <div class="cal-grid">${calendarCellsHTML(ym)}</div>
  </section>

  <div class="list-head">
    <span class="list-title">${st.selectedDate ? Util.cnDate(st.selectedDate) + ' ' + Util.weekdayCN(st.selectedDate) : y + ' 年 ' + m + ' 月明细'}</span>
    ${st.selectedDate ? `<button class="link-btn" data-action="clear-day">查看全月</button>` : ''}
  </div>
  <section id="bill-list">${billListHTML()}</section>

  <button class="fab" data-action="go-entry" aria-label="记一笔">${Icons.plus(24)}</button>
  `;
};

function calendarCellsHTML(ym) {
  const st = App.state;
  const first = Util.firstWeekday(ym);
  const days = Util.daysInMonth(ym);
  const today = Util.todayStr();
  let html = '';
  for (let i = 0; i < first; i++) html += '<div class="cal-cell empty"></div>';
  for (let d = 1; d <= days; d++) {
    const date = `${ym}-${Util.pad(d)}`;
    const ds = Store.daySummary(date);
    const cls = [
      date === today ? 'today' : '',
      date === st.selectedDate ? 'selected' : ''
    ].filter(Boolean).join(' ');
    let amt = '';
    if (ds.expense > 0) amt = `<span class="cal-amt expense">-¥${Util.fmt(ds.expense)}</span>`;
    else if (ds.income > 0) amt = `<span class="cal-amt income">+¥${Util.fmt(ds.income)}</span>`;
    html += `<div class="cal-cell ${cls}" data-action="pick-day" data-date="${date}">
      <span class="cal-day">${d}</span>${amt}
    </div>`;
  }
  return html;
}

function billListHTML() {
  const st = App.state;
  let bills = st.selectedDate ? Store.billsOfDate(st.selectedDate) : Store.billsOfMonth(st.viewMonth);
  if (st.keyword) {
    const kw = st.keyword.trim().toLowerCase();
    bills = bills.filter(b =>
      (b.note || '').toLowerCase().includes(kw) || b.category.toLowerCase().includes(kw));
  }
  bills = bills.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id > a.id ? 1 : -1)));

  if (!bills.length) {
    const emptyText = st.keyword ? '没有找到相关记录'
      : (st.selectedDate ? '这一天还没有记录，点右下角 + 记一笔吧' : '还没有记录，点右下角 + 记一笔吧');
    return `
    <div class="empty-state">
      ${catIllustration()}
      <p class="empty-text">${emptyText}</p>
    </div>`;
  }

  const groups = {};
  bills.forEach(b => { (groups[b.date] = groups[b.date] || []).push(b); });

  return Object.keys(groups).sort().reverse().map(date => {
    const ds = Store.daySummary(date);
    const sub = [];
    if (ds.expense > 0) sub.push(`支出 ¥${Util.fmt(ds.expense)}`);
    if (ds.income > 0) sub.push(`收入 ¥${Util.fmt(ds.income)}`);
    return `
    <div class="list-group">
      <div class="group-title">
        <span>${Util.cnDate(date)} ${Util.weekdayCN(date)}${date === Util.todayStr() ? ' · 今天' : ''}</span>
        <span class="group-sub">${sub.join('　')}</span>
      </div>
      ${groups[date].map(billRowHTML).join('')}
    </div>`;
  }).join('');
}

function billRowHTML(b) {
  const meta = Store.catMeta(b.type, b.category);
  const acc = b.accountId ? Store.accountById(b.accountId) : null;
  return `
  <div class="bill-row-wrap">
    <button class="bill-delete" data-action="del-bill" data-id="${b.id}">删除</button>
    <div class="bill-row" data-id="${b.id}">
      <span class="bill-icon" style="background:${meta.bg}">${meta.icon}</span>
      <div class="bill-info">
        <div class="bill-name">${Util.esc(b.category)}</div>
        ${b.note ? `<div class="bill-note">${Util.esc(b.note)}</div>` : ''}
        ${acc ? `<div class="bill-note bill-acc">${acc.icon} ${Util.esc(acc.name)}</div>` : ''}
      </div>
      <div class="bill-amt ${b.type === 'income' ? 'income' : 'expense'}">${Util.signed(b.amount, b.type)}</div>
      <button class="row-more" data-action="bill-more" data-id="${b.id}" aria-label="更多操作"><span>···</span></button>
    </div>
  </div>`;
}

/* ============ 记账录入页 ============ */
Pages.entry = function () {
  const st = App.state;
  const e = st.entry;
  const book = Store.activeBook();
  const account = e.accountId ? Store.accountById(e.accountId) : null;
  const all = Store.cats(e.type);
  const perPage = 16;
  const pageCount = Math.max(1, Math.ceil(all.length / perPage));
  const page = Math.min(st.entryCatPage, pageCount - 1);
  const cats = all.slice(page * perPage, (page + 1) * perPage);

  return `
  <header class="navbar entry-nav">
    <button class="nav-icon" data-action="back" aria-label="返回">${Icons.back(22)}</button>
    <div class="seg-tabs">
      <button class="seg-btn ${e.type === 'expense' ? 'active' : ''}" data-action="seg-type" data-type="expense">支出</button>
      <button class="seg-btn ${e.type === 'income' ? 'active' : ''}" data-action="seg-type" data-type="income">收入</button>
    </div>
    <button class="entry-book" data-action="open-books" data-from="entry">
      <span class="eb-icon">${book.icon}</span><span class="eb-name">${Util.esc(book.name)}</span>${Icons.chevronDown(12)}
    </button>
  </header>

  <div class="date-chip-row">
    <button class="date-chip" data-action="pick-bill-date">
      ${Icons.calendarSmall(14)}
      <span>${Util.cnDate(e.date)} ${Util.weekdayCN(e.date)}${e.date === Util.todayStr() ? ' · 今天' : ''}</span>
      ${Icons.chevronDown(13)}
    </button>
    <button class="date-chip account-chip" data-action="open-account-sheet">
      ${Icons.wallet(14)}
      <span>${account ? Util.esc(account.name) : '不计入账户'}</span>
      ${Icons.chevronDown(13)}
    </button>
  </div>

  <div class="entry-scroll">
    <section class="cat-grid" id="cat-grid">
      ${cats.map((c, i) => {
        const idx = page * perPage + i;
        const isSetting = c.special === 'setting';
        return `
        <button class="cat-cell ${idx === e.cat ? 'active' : ''}" data-action="${isSetting ? 'open-cat-manage' : 'pick-cat'}" data-i="${idx}">
          <span class="cat-ic" style="background:${c.bg}">${c.icon}</span>
          <span class="cat-name">${c.name}</span>
        </button>`;
      }).join('')}
    </section>

    ${pageCount > 1 ? `
    <div class="page-dots" id="cat-dots">
      ${Array.from({ length: pageCount }, (_, i) =>
        `<span class="dot ${i === page ? 'active' : ''}" data-action="cat-dot" data-i="${i}"></span>`).join('')}
    </div>` : ''}

    <section class="amount-card">
      <button class="amt-wallet" data-action="open-account-sheet" aria-label="选择资产账户">${Icons.wallet(24)}</button>
      <input class="note-input" id="note-input" placeholder="点击输入备注…" value="${Util.esc(e.note)}" maxlength="30">
      <div class="amt-val ${e.type}">
        <span class="amt-yen">¥</span><span id="amt-text">${Util.fmt(entryAmount(e))}</span>
        ${e.pendingOp ? `<span class="op-hint">${e.pendingOp}</span>` : ''}
      </div>
    </section>
  </div>

  <div class="keypad">
    <button class="key" data-action="key" data-key="1">1</button>
    <button class="key" data-action="key" data-key="2">2</button>
    <button class="key" data-action="key" data-key="3">3</button>
    <button class="key key-fn" data-action="key" data-key="today">今天</button>
    <button class="key" data-action="key" data-key="4">4</button>
    <button class="key" data-action="key" data-key="5">5</button>
    <button class="key" data-action="key" data-key="6">6</button>
    <button class="key key-op" data-action="key" data-key="+">+</button>
    <button class="key" data-action="key" data-key="7">7</button>
    <button class="key" data-action="key" data-key="8">8</button>
    <button class="key" data-action="key" data-key="9">9</button>
    <button class="key key-op" data-action="key" data-key="-">-</button>
    <button class="key" data-action="key" data-key=".">.</button>
    <button class="key" data-action="key" data-key="0">0</button>
    <button class="key key-fn" data-action="key" data-key="del">${Icons.deleteKey(20)}</button>
    <button class="key key-ok ${entryAmount(e) > 0 ? '' : 'disabled'}" data-action="key" data-key="ok">完成</button>
  </div>`;
};

/* 当前显示的金额数值 */
function entryAmount(e) {
  return parseFloat(e.amt) || 0;
}

/* ============ 统计页 ============ */
Pages.stats = function () {
  const st = App.state;
  const ym = st.statsMonth;
  const [y, m] = ym.split('-').map(Number);
  const sum = Store.monthSummary(ym);
  const prevSum = Store.monthSummary(Util.prevMonth(ym));
  const maxBar = Math.max(sum.expense, sum.income, 0.01);

  return `
  <header class="navbar">
    <span class="nav-btn-placeholder"></span>
    <div class="nav-title">${y} 年 ${m} 月 收支统计</div>
    <button class="nav-btn" data-action="open-month-picker" data-target="stats">
      <span>${m} 月</span>${Icons.chevronDown(14)}
    </button>
  </header>

  <section class="card balance-card">
    <div class="bc-top">
      <span class="bc-label">本月结余</span>
      <span class="bc-last">上月结余：¥${Util.fmt(prevSum.balance)}</span>
    </div>
    <div class="bc-value">¥ ${Util.fmt(sum.balance)}</div>
    <div class="bar-row">
      <span class="bar-label">本月支出</span>
      <div class="bar-track"><div class="bar-fill yellow" style="width:${(sum.expense / maxBar * 100).toFixed(1)}%"></div></div>
      <span class="bar-val expense">-¥${Util.fmt(sum.expense)}</span>
    </div>
    <div class="bar-row">
      <span class="bar-label">本月收入</span>
      <div class="bar-track"><div class="bar-fill primary" style="width:${(sum.income / maxBar * 100).toFixed(1)}%"></div></div>
      <span class="bar-val income">¥${Util.fmt(sum.income)}</span>
    </div>
  </section>

  <section class="card range-card" id="range-card">${rangeCardHTML()}</section>
  `;
};

function rangeCardHTML() {
  const st = App.state;
  const start = st.rangeStart, end = st.rangeEnd;

  const head = `
  <div class="card-title">区间花费统计</div>
  <div class="range-inputs">
    <input type="date" id="range-start" class="date-input" value="${start}">
    <span class="range-sep">～</span>
    <input type="date" id="range-end" class="date-input" value="${end}">
  </div>
  <button class="calc-btn" data-action="calc-range">计算</button>`;

  if (!st.rangeComputed) {
    return head + `<div class="range-empty">选好日期后，点击「计算」查看区间收支统计</div>`;
  }

  const bills = Store.allBills().filter(b => b.date >= start && b.date <= end);
  const expenseBills = bills.filter(b => b.type === 'expense');
  const incomeBills = bills.filter(b => b.type === 'income');
  const expense = expenseBills.reduce((s, b) => s + b.amount, 0);
  const income = incomeBills.reduce((s, b) => s + b.amount, 0);
  const days = Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000) + 1);

  const topOf = list => {
    const byCat = {};
    list.forEach(b => { byCat[b.category] = (byCat[b.category] || 0) + b.amount; });
    return Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
  };
  const topExpense = topOf(expenseBills);
  const topIncome = topOf(incomeBills);
  const maxExpense = topExpense.length ? topExpense[0][1] : 1;
  const maxIncome = topIncome.length ? topIncome[0][1] : 1;

  const topRows = (top, max, type) => top.map(([name, amt]) => {
    const meta = Store.catMeta(type, name);
    return `
    <div class="top-cat-row">
      <span class="tc-icon" style="background:${meta.bg}">${meta.icon}</span>
      <span class="tc-name">${Util.esc(name)}</span>
      <div class="bar-track"><div class="bar-fill ${type === 'income' ? 'green' : 'expense'}" style="width:${(amt / max * 100).toFixed(1)}%"></div></div>
      <span class="tc-amt ${type === 'income' ? 'income' : 'expense'}">¥${Util.fmt(amt)}</span>
    </div>`;
  }).join('');

  if (!bills.length) {
    return head + `<div class="range-empty">该区间暂无收支记录</div>`;
  }

  return head + `
  <div class="range-sum">
    <div class="rs-item"><span class="rs-label">区间收入</span><b class="income">+¥${Util.fmt(income)}</b></div>
    <div class="rs-item"><span class="rs-label">区间支出</span><b class="expense">-¥${Util.fmt(expense)}</b></div>
    <div class="rs-item"><span class="rs-label">区间结余</span><b class="primary">¥${Util.fmt(income - expense)}</b></div>
  </div>
  <div class="range-total">该区间共支出 <b class="expense">¥ ${Util.fmt(expense)}</b></div>
  <div class="range-sub">共 ${bills.length} 笔（支出 ${expenseBills.length} 笔・收入 ${incomeBills.length} 笔）・日均支出 ¥${Util.fmt(expense / days)}</div>
  ${topExpense.length ? `<div class="top-title">支出分类 Top ${topExpense.length}</div><div class="top-cats">${topRows(topExpense, maxExpense, 'expense')}</div>` : ''}
  ${topIncome.length ? `<div class="top-title">收入分类 Top ${topIncome.length}</div><div class="top-cats">${topRows(topIncome, maxIncome, 'income')}</div>` : ''}`;
}

/* ============ 资产页 ============ */
Pages.assets = function () {
  const st = App.state;
  const hide = st.hideAmount;
  const mask = v => hide ? '****' : '¥ ' + Util.fmt(v);
  const assets = Store.accounts('asset');
  const lis = Store.accounts('liability');
  const ta = Store.accountSum('asset');
  const tl = Store.accountSum('liability');
  const net = ta - tl;
  const maxRow = Math.max(ta, tl, 0.01);

  const accountRow = a => `
    <button class="account-row" data-action="edit-account" data-id="${a.id}">
      <span class="acc-icon">${a.icon}</span>
      <div class="acc-info">
        <div class="acc-name">${Util.esc(a.name)}</div>
        <div class="acc-kind">${a.kind === 'asset' ? '资产账户' : '负债账户'}</div>
      </div>
      <span class="acc-balance ${a.kind === 'asset' ? 'income' : 'expense'}">${mask(a.balance)}</span>
      ${Icons.chevronRight(16)}
    </button>`;

  return `
  <header class="navbar">
    <span class="nav-btn-placeholder"></span>
    <div class="nav-title">我的资产</div>
    <span class="nav-icon-placeholder"></span>
  </header>

  <section class="card net-card">
    <div class="nc-head">
      <span class="nc-label">净资产</span>
      <button class="nc-eye" data-action="toggle-hide" aria-label="隐藏金额">
        ${hide ? Icons.eyeOff(20) : Icons.eye(20)}
      </button>
    </div>
    <div class="nc-value primary">¥ ${hide ? '****' : Util.fmt(net)}</div>
    <div class="nc-row">
      <span class="nc-row-label">总资产</span>
      <div class="bar-track"><div class="bar-fill green" style="width:${(ta / maxRow * 100).toFixed(1)}%"></div></div>
      <span class="nc-row-val income">${ta > 0 ? mask(ta) : '暂无'}</span>
    </div>
    <div class="nc-row">
      <span class="nc-row-label">负债</span>
      <div class="bar-track"><div class="bar-fill red" style="width:${(tl / maxRow * 100).toFixed(1)}%"></div></div>
      <span class="nc-row-val expense">${tl > 0 ? mask(tl) : '暂无'}</span>
    </div>
    <button class="nc-link" data-action="trend">查看资产趋势 &gt;</button>
  </section>

  <div class="section-head">
    <span class="section-title">资产账户</span>
    <button class="add-btn" data-action="add-account" data-kind="asset">+ 添加</button>
  </div>
  <section class="card account-list">
    ${assets.length ? assets.map(accountRow).join('') : '<div class="acc-empty">还没添加账户，点右上角 + 添加</div>'}
  </section>

  <div class="section-head">
    <span class="section-title">我的负债</span>
    <button class="add-btn" data-action="add-account" data-kind="liability">+ 添加</button>
  </div>
  <section class="card account-list">
    ${lis.length ? lis.map(accountRow).join('') : '<div class="acc-empty">还没有负债账户，点右上角 + 添加</div>'}
  </section>
  `;
};

/* ============ 我的账本页 ============ */
Pages.books = function () {
  const books = Store.books();
  const activeId = Store.data.activeBook;
  const total = Store.booksTotal();

  return `
  <header class="navbar">
    <button class="nav-icon" data-action="back-from-books" aria-label="返回">${Icons.back(22)}</button>
    <div class="nav-title">我的账本</div>
    <span class="nav-icon-placeholder"></span>
  </header>

  <div class="books-head">
    <div class="books-head-row">
      <h2 class="books-title">我的账本</h2>
      <span class="books-total">总结余：<b class="primary">¥${Util.fmt(total)}</b></span>
    </div>
  </div>

  <div class="book-list">
    ${books.map(b => {
      const active = b.id === activeId;
      const balance = Store.bookBalance(b.id);
      const count = Store.bookBills(b.id).length;
      return `
      <div class="book-card ${active ? 'active' : ''}" data-action="switch-book" data-id="${b.id}">
        <span class="book-cover" style="background:${b.bg || '#E8F0FF'}">${b.icon}</span>
        <div class="book-info">
          <div class="book-name">${Util.esc(b.name)}${b.example ? '<em>（示例）</em>' : ''}</div>
          <div class="book-balance">结余：<b class="primary">¥${Util.fmt(balance)}</b></div>
        </div>
        <button class="book-edit" data-action="edit-book" data-id="${b.id}" aria-label="编辑账本">${Icons.pencil(16)}</button>
        ${active ? `
        <div class="book-foot">
          <span>${count ? `共 ${count} 笔记录` : '暂无记录'}</span>
          <span class="using">正在使用中</span>
        </div>` : ''}
      </div>`;
    }).join('')}
  </div>

  <button class="add-book-bar" data-action="new-book">+ 新建账本</button>
  `;
};

/* 账本编辑 / 新建弹窗 */
function bookEditorHTML() {
  const b = App.state.bookEdit;
  if (!b) return '';
  const isNew = !b.id;
  return `
  <div class="modal-mask" data-action="close-modal">
    <div class="modal book-editor" data-stop>
      <div class="modal-title">${isNew ? '新建账本' : '编辑账本'}</div>
      <label class="field">
        <span>账本名称</span>
        <input id="book-name-input" maxlength="12" placeholder="请输入账本名称" value="${Util.esc(b.name)}">
      </label>
      <div class="field">
        <span>选择图标</span>
        <div class="icon-picker">
          ${BOOK_ICONS.map(ic =>
            `<button class="icon-opt ${ic === b.icon ? 'active' : ''}" data-action="pick-book-icon" data-icon="${ic}">${ic}</button>`
          ).join('')}
        </div>
      </div>
      <div class="modal-btns">
        ${isNew ? '' : `<button class="btn-danger" data-action="del-book">删除账本</button>`}
        <button class="btn-primary" data-action="save-book">保存</button>
      </div>
    </div>
  </div>`;
}

/* 删除账本二次确认 */
function bookDeleteConfirmHTML() {
  const b = Store.books().find(x => x.id === App.state.bookDeleteId);
  if (!b) return '';
  return `
  <div class="modal-mask" data-action="close-modal">
    <div class="modal confirm-modal" data-stop>
      <div class="modal-title">删除账本</div>
      <p class="confirm-text">确定删除账本「${Util.esc(b.name)}」吗？该账本下的 ${Store.bookBills(b.id).length} 笔记录将一并删除。</p>
      <div class="modal-btns">
        <button class="btn-cancel" data-action="close-modal">取消</button>
        <button class="btn-danger-solid" data-action="confirm-del-book">删除</button>
      </div>
    </div>
  </div>`;
}

/* 选择资产账户（录入页钱包图标） */
function accountSheetHTML() {
  const st = App.state;
  const sel = st.entry ? st.entry.accountId : null;
  const assets = Store.accounts('asset');
  const check = '<span class="as-check">✓</span>';
  return `
  <div class="modal-mask" data-action="close-modal">
    <div class="modal account-sheet" data-stop>
      <div class="as-cat">${catIllustration()}</div>
      <div class="as-title">选择资产账户</div>
      <button class="as-account ${!sel ? 'active' : ''}" data-action="pick-bill-account" data-id="">
        <span class="as-acc-icon">${Icons.wallet(20)}</span>
        <span class="as-acc-name none">不计入账户</span>
        ${!sel ? check : ''}
      </button>
      ${assets.map(a => `
      <button class="as-account ${sel === a.id ? 'active' : ''}" data-action="pick-bill-account" data-id="${a.id}">
        <span class="as-acc-icon">${a.icon}</span>
        <span class="as-acc-name">${Util.esc(a.name)}</span>
        ${sel === a.id ? check : ''}
      </button>`).join('')}
      <button class="as-add" data-action="add-account-from-sheet">+ 添加</button>
    </div>
  </div>`;
}

/* ============ 分类管理页 ============ */
Pages.cats = function () {
  const st = App.state;
  const type = st.catManageType;
  const cats = Store.cats(type);

  return `
  <header class="navbar">
    <button class="nav-icon" data-action="back-from-cats" aria-label="返回">${Icons.back(22)}</button>
    <div class="nav-title">分类管理</div>
    <span class="nav-icon-placeholder"></span>
  </header>

  <div class="cat-manage-head">
    <span class="cm-count">目前共${cats.length}个类别</span>
    <div class="cm-tabs">
      <button class="cm-tab ${type === 'expense' ? 'active' : ''}" data-action="cat-manage-tab" data-type="expense">支出</button>
      <span class="cm-sep">/</span>
      <button class="cm-tab ${type === 'income' ? 'active' : ''}" data-action="cat-manage-tab" data-type="income">收入</button>
    </div>
  </div>

  <section class="card cat-manage-list" id="cat-manage-list">
    ${cats.map(c => `
    <div class="cat-manage-row" data-name="${Util.esc(c.name)}">
      <span class="cm-icon" style="background:${c.bg}">
        ${c.icon}
        <button class="cm-del" data-action="del-cat" data-name="${Util.esc(c.name)}" aria-label="删除分类">−</button>
      </span>
      <span class="cm-name">${Util.esc(c.name)}${c.special === 'setting' ? '<em>（功能入口）</em>' : ''}</span>
      <button class="drag-handle" aria-label="拖拽排序">${Icons.drag(18)}</button>
    </div>`).join('')}
  </section>

  <button class="add-cat-bar" data-action="go-cat-edit">+ 自定义分类</button>
  `;
};

/* ============ 自定义分类页 ============ */
Pages.catEdit = function () {
  const st = App.state;
  const type = st.catEditType;
  const perPage = 16;
  const pageCount = Math.ceil(CAT_ICON_POOL.length / perPage);
  const page = Math.min(st.catEditPage, pageCount - 1);
  const icons = CAT_ICON_POOL.slice(page * perPage, (page + 1) * perPage);
  const valid = catNameValid(st.catEditName, type);

  return `
  <header class="navbar">
    <button class="nav-icon" data-action="back-from-cat-edit" aria-label="返回">${Icons.back(22)}</button>
    <div class="nav-title">设定自定义分类</div>
    <span class="nav-icon-placeholder"></span>
  </header>

  <div class="ce-tab-row">
    <div class="cm-tabs">
      <button class="cm-tab ${type === 'expense' ? 'active' : ''}" data-action="cat-edit-tab" data-type="expense">支出</button>
      <span class="cm-sep">/</span>
      <button class="cm-tab ${type === 'income' ? 'active' : ''}" data-action="cat-edit-tab" data-type="income">收入</button>
    </div>
  </div>

  <section class="ce-name-card">
    <input id="cat-name-input" placeholder="新建分类名称" maxlength="12" value="${Util.esc(st.catEditName)}">
    <button class="ce-pencil" data-action="focus-cat-name" aria-label="输入名称">${Icons.pencil(18)}</button>
    <span class="ce-hint">限4个汉字或6个英文字母...</span>
  </section>

  <div class="ce-section-title">选择图标</div>
  <section class="ce-icon-grid" id="ce-icon-grid">
    ${icons.map((ic, i) => {
      const idx = page * perPage + i;
      return `<button class="ce-icon-opt ${idx === st.catEditIcon ? 'active' : ''}" data-action="pick-cat-icon" data-i="${idx}">${ic}</button>`;
    }).join('')}
  </section>
  <div class="ce-dots">
    ${Array.from({ length: pageCount }, (_, i) =>
      `<span class="dot ${i === page ? 'active' : ''}" data-action="cat-edit-dot" data-i="${i}"></span>`).join('')}
  </div>

  <button class="ce-save ${valid ? '' : 'disabled'}" data-action="save-custom-cat">
    <span class="ce-save-circle">${Icons.check(22)}</span>
    <span class="ce-save-text">保存</span>
  </button>
  `;
};

/* 自定义分类名称校验：4 个汉字或 6 个英文字母，且不重名 */
function catNameValid(name, type) {
  const n = (name || '').trim();
  if (!n) return false;
  if (!/^[\u4e00-\u9fa5]{1,4}$/.test(n) && !/^[a-zA-Z]{1,6}$/.test(n)) return false;
  return !Store.cats(type).some(c => c.name === n);
}

/* 分类删除二次确认 */
function catDeleteConfirmHTML() {
  const name = App.state.catDeleteName;
  if (!name) return '';
  return `
  <div class="modal-mask" data-action="close-modal">
    <div class="modal confirm-modal" data-stop>
      <div class="modal-title">删除分类</div>
      <p class="confirm-text">确定删除分类「${Util.esc(name)}」吗？已有记录仍会保留该分类名称。</p>
      <div class="modal-btns">
        <button class="btn-cancel" data-action="close-modal">取消</button>
        <button class="btn-danger-solid" data-action="confirm-del-cat">删除</button>
      </div>
    </div>
  </div>`;
}

/* ============ 底部 Tab ============ */
function tabbarHTML() {
  const page = App.state.page;
  const item = (p, label, icon) => `
    <button class="tab-item ${page === p ? 'active' : ''}" data-action="tab" data-page="${p}">
      ${icon(22)}<span>${label}</span>
    </button>`;
  return `
  <nav class="tabbar">
    ${item('home', '日历/明细', Icons.calendar)}
    ${item('stats', '统计', Icons.chart)}
    ${item('assets', '资产', Icons.wallet)}
  </nav>`;
}

/* ============ 月份选择弹窗（按月 / 按周 / 按年） ============ */
function monthPickerHTML() {
  const st = App.state;
  const year = st.monthPickerYear;
  const cur = Util.monthOf(Util.todayStr());
  const activeYm = st.monthPickerTarget === 'home' ? st.viewMonth : st.statsMonth;
  return `
  <div class="modal-mask" data-action="close-modal">
    <div class="modal month-picker" data-stop>
      <div class="mp-tabs">
        <button class="mp-tab" data-action="mp-range" data-range="week">按周</button>
        <button class="mp-tab active" data-action="mp-range" data-range="month">按月</button>
        <button class="mp-tab" data-action="mp-range" data-range="year">按年</button>
      </div>
      <div class="mp-head">
        <button class="mp-nav" data-action="mp-year" data-d="-1">${Icons.chevronLeft(18)}</button>
        <span>${year} 年</span>
        <button class="mp-nav" data-action="mp-year" data-d="1">${Icons.chevronRight(18)}</button>
      </div>
      <div class="mp-grid">
        ${Array.from({ length: 12 }, (_, i) => {
          const ym = `${year}-${Util.pad(i + 1)}`;
          return `<button class="mp-cell ${ym === activeYm ? 'active' : ''}" data-action="mp-pick" data-ym="${ym}">${i + 1} 月</button>`;
        }).join('')}
      </div>
      <button class="mp-today" data-action="mp-pick" data-ym="${cur}">回到本月</button>
    </div>
  </div>`;
}

/* ============ 记录「···」悬浮上拉菜单 ============ */
function billMenuHTML() {
  const st = App.state;
  const bill = Store.allBills().find(b => b.id === st.billMenuId);
  if (!bill) return '';
  const pos = st.billMenuPos || { top: 80, left: 0 };
  return `
  <div class="popover-mask" data-action="close-bill-menu"></div>
  <div class="bill-popover" style="top:${pos.top}px;left:${pos.left}px">
    <button class="bp-item" data-action="bill-edit">修改</button>
    <button class="bp-item danger" data-action="bill-delete">删除</button>
  </div>`;
}

/* ============ 删除二次确认弹窗 ============ */
function deleteConfirmHTML() {
  const bill = Store.allBills().find(b => b.id === App.state.deleteConfirmId);
  if (!bill) return '';
  const meta = Store.catMeta(bill.type, bill.category);
  return `
  <div class="modal-mask" data-action="close-modal">
    <div class="modal confirm-modal" data-stop>
      <div class="modal-title">删除记录</div>
      <p class="confirm-text">确定删除这条记录吗？删除后不可恢复。</p>
      <div class="confirm-info">
        <span class="bill-icon" style="background:${meta.bg}">${meta.icon}</span>
        <div class="bill-info">
          <div class="bill-name">${Util.esc(bill.category)}
            <span class="${bill.type === 'income' ? 'income' : 'expense'}">${Util.signed(bill.amount, bill.type)}</span>
          </div>
          <div class="bill-note">${Util.cnDate(bill.date)}${bill.note ? ' · ' + Util.esc(bill.note) : ''}</div>
        </div>
      </div>
      <div class="modal-btns">
        <button class="btn-cancel" data-action="close-modal">取消</button>
        <button class="btn-danger-solid" data-action="confirm-delete-bill">删除</button>
      </div>
    </div>
  </div>`;
}

/* ============ 账户编辑弹窗 ============ */
function accountEditorHTML() {
  const a = App.state.accountEdit;
  if (!a) return '';
  const isNew = !a.id;
  return `
  <div class="modal-mask" data-action="close-modal">
    <div class="modal account-editor" data-stop>
      <div class="modal-title">${isNew ? '添加账户' : '编辑账户'}</div>
      <label class="field">
        <span>账户名称</span>
        <input id="acc-name" maxlength="12" placeholder="请输入名称" value="${Util.esc(a.name)}">
      </label>
      <label class="field">
        <span>余额</span>
        <input id="acc-balance" type="number" inputmode="decimal" step="0.01" placeholder="0.00" value="${a.balance || ''}">
      </label>
      <div class="field">
        <span>选择图标</span>
        <div class="icon-picker">
          ${ACCOUNT_ICONS.map(ic =>
            `<button class="icon-opt ${ic === a.icon ? 'active' : ''}" data-action="pick-acc-icon" data-icon="${ic}">${ic}</button>`
          ).join('')}
        </div>
      </div>
      <div class="modal-btns">
        ${isNew ? '' : `<button class="btn-danger" data-action="del-account">删除账户</button>`}
        <button class="btn-primary" data-action="save-account">保存</button>
      </div>
    </div>
  </div>`;
}

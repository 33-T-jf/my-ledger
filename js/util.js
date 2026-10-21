/* 工具函数：日期 / 金额 / 转义 */
const Util = {
  pad(n) { return String(n).padStart(2, '0'); },

  todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
  },

  monthOf(dateStr) { return dateStr.slice(0, 7); },

  daysInMonth(ym) {
    const [y, m] = ym.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  },

  /* 0 = 周一 */
  firstWeekday(ym) {
    const [y, m] = ym.split('-').map(Number);
    return (new Date(y, m - 1, 1).getDay() + 6) % 7;
  },

  prevMonth(ym) {
    let [y, m] = ym.split('-').map(Number);
    m -= 1; if (m < 1) { m = 12; y -= 1; }
    return `${y}-${this.pad(m)}`;
  },

  nextMonth(ym) {
    let [y, m] = ym.split('-').map(Number);
    m += 1; if (m > 12) { m = 1; y += 1; }
    return `${y}-${this.pad(m)}`;
  },

  isCurrentMonth(ym) { return ym === this.monthOf(this.todayStr()); },

  /* 1234.5 -> "1,234.50" */
  fmt(n) {
    const v = Math.round((Number(n) || 0) * 100) / 100;
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  /* 带符号与 ¥：收入 + / 支出 - */
  signed(n, type) {
    n = Number(n) || 0;
    const sign = type === 'income' ? '+' : (type === 'expense' ? '-' : '');
    return `${sign}¥${this.fmt(Math.abs(n))}`;
  },

  weekdayCN(ymd) {
    const w = ['日', '一', '二', '三', '四', '五', '六'][new Date(ymd + 'T00:00:00').getDay()];
    return '周' + w;
  },

  cnDate(ymd) {
    const [, m, d] = ymd.split('-');
    return `${Number(m)}月${Number(d)}日`;
  },

  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  },

  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
};

/* 全局 Toast */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

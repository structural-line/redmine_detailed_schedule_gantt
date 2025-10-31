class TodayChecker {
  constructor() {
    // 今日の日付をYYYY-MM-DD形式で保持する
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    this._today = `${y}-${m}-${d}`; // 'YYYY-MM-DD'
  }

  // 本日の日付になっているかチェックする
  isToday(ymd) {
    // string型かチェック
    if (typeof ymd !== 'string') {
        return false;
    }

    // YYYY-MM-DD形式になっているかチェック
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        return false;
    }

    // 本日の日付と一致しなければfalse
    if (ymd !== this._today) {
        return false;
    }

    // 全ての条件を満たさなければtrue
    return true;
  }
}

// グローバルに公開
window.TodayChecker = TodayChecker;
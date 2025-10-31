// 休日判定クラス（週末 / 固定祝日 / 連休明けの振替休日 まで対応）
// 振替休日: 「日曜の祝日」から始まる連休の“最初の平日”
class HolidayChecker {
  constructor() {
    this._holidaySet = new Set(window.CONSTANTS.PUBLIC_HOLIDAY_JA || []); // 'MM-DD' 形式
  }

  // 休日であるかをチェックする
  isNonWorkingDay(ymd) {
    // 日付形式のセルでなければfalseを返す
    if (!HolidayChecker._isValidYMD(ymd)) return false;
    return (
      this.isSaturday(ymd) ||
      this.isSunday(ymd)   ||
      this.isHoliday(ymd) ||
      this.isSubstituteHoliday(ymd)
    );
  }

  // -------- ユーティリティ --------
  // 日付形式のセルの値が送られてきたかチェックする
  static _isValidYMD(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  }

  // Date型に変換する
  static _toDate(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // Date型から'MM-DD'形式の文字列を生成する
  static _mmdd(date) {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
  }

  // 祝日であるか判定する
  _isHolidayDate(date) {
    return this._holidaySet.has(HolidayChecker._mmdd(date));
  }

  // -------- 単体判定 --------
  isSaturday(ymd) {
    const d = HolidayChecker._toDate(ymd);
    return d.getDay() === 6;
  }
  isSunday(ymd) {
    const d = HolidayChecker._toDate(ymd);
    return d.getDay() === 0;
  }
  isHoliday(ymd) {
    if (!HolidayChecker._isValidYMD(ymd)) return false;
    return this._holidaySet.has(ymd.slice(5));
  }

  // 振替休日（火曜以降も可）をチェックする:
  // その日が平日 かつ 祝日ではない とき、
  // 前日にさかのぼって「祝日が連続」している間調べ、
  // その連続のどこかに「日曜の祝日」があれば true
  isSubstituteHoliday(ymd) {
    if (!HolidayChecker._isValidYMD(ymd)) return false;

    const today = HolidayChecker._toDate(ymd);
    const dow = today.getDay(); // 0:日 .. 6:土

    // 平日以外は振替にならない（振替は月〜金のいずれか）
    if (dow === 0 || dow === 6) return false;
    // その日自体が祝日なら「振替休日」ではない
    if (this.isHoliday(ymd)) return false;

    // 連続祝日を後ろにたどる
    const prev = new Date(today);
    prev.setDate(prev.getDate() - 1);

    // 少なくとも前日が祝日でなければ振替は発生しない
    if (!this._isHolidayDate(prev)) return false;

    // 祝日が続く限りさかのぼる。どこかで「日曜の祝日」があればOK。
    while (this._isHolidayDate(prev)) {
      if (prev.getDay() === 0) return true; // 日曜の祝日を検出
      prev.setDate(prev.getDate() - 1);
    }
    return false;
  }
}

window.HolidayChecker = HolidayChecker;
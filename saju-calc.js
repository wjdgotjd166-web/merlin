/**
 * saju-calc.js — 사주팔자 사주(四柱) 결정론적 계산기
 *
 * 생년월일시로부터 연주·월주·일주·시주를 수학적으로 계산합니다.
 * 절기 날짜는 근사값(±1일)을 사용합니다.
 */

const STEMS_KR = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const STEMS_HJ = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES_KR = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const BRANCHES_HJ = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// Heavenly Stem elements
const STEM_ELEMENTS = ['Wood', 'Wood', 'Fire', 'Fire', 'Earth', 'Earth', 'Metal', 'Metal', 'Water', 'Water'];
// Earthly Branch elements (based on primary qi)
const BRANCH_ELEMENTS = ['Water', 'Earth', 'Wood', 'Wood', 'Earth', 'Fire', 'Fire', 'Earth', 'Metal', 'Metal', 'Earth', 'Water'];

// 절입일 근사값 — [그레고리월, 근사일, 사주월인덱스(0=寅月 ~ 11=丑月)]
// 각 절기가 해당 사주월의 시작점
const MONTH_BOUNDARIES = [
  [1, 6, 11],   // 소한 → 丑月 (month 12)
  [2, 4, 0],    // 입춘 → 寅月 (month 1)
  [3, 6, 1],    // 경칩 → 卯月 (month 2)
  [4, 5, 2],    // 청명 → 辰月 (month 3)
  [5, 6, 3],    // 입하 → 巳月 (month 4)
  [6, 6, 4],    // 망종 → 午月 (month 5)
  [7, 7, 5],    // 소서 → 未月 (month 6)
  [8, 8, 6],    // 입추 → 申月 (month 7)
  [9, 8, 7],    // 백로 → 酉月 (month 8)
  [10, 8, 8],   // 한로 → 戌月 (month 9)
  [11, 7, 9],   // 입동 → 亥月 (month 10)
  [12, 7, 10],  // 대설 → 子月 (month 11)
];

/**
 * 그레고리력 → 율리우스 적일 (Julian Day Number)
 */
function getJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

/**
 * 절기 기준 사주월 인덱스 (0=寅月 ~ 11=丑月)
 */
function getSajuMonthIndex(month, day) {
  let result = 10; // 기본값: 子月 (1월 소한 전 = 아직 대설 기간)
  for (const [gm, gd, idx] of MONTH_BOUNDARIES) {
    if (month > gm || (month === gm && day >= gd)) {
      result = idx;
    }
  }
  return result;
}

/**
 * 시간 문자열 → { hour, minute } 파싱
 * "오전 9시", "오후 3시 30분", "14:00", "새벽 2시" 등
 */
function parseTime(timeStr) {
  if (!timeStr || timeStr === '모름' || timeStr === 'Unknown' || timeStr.trim() === '') return null;

  let hour = null, minute = 0;

  // "HH:MM" 형식
  let match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    hour = parseInt(match[1]);
    minute = parseInt(match[2]);
  } else {
    const isPM = /오후|pm|PM|저녁|밤/.test(timeStr);
    const isAM = /오전|am|AM|새벽|아침/.test(timeStr);

    // "N시 M분" 형식
    match = timeStr.match(/(\d{1,2})\s*시\s*(\d{1,2})?\s*분?/);
    if (match) {
      hour = parseInt(match[1]);
      if (match[2]) minute = parseInt(match[2]);
    } else {
      // 숫자만
      match = timeStr.match(/(\d{1,2})/);
      if (match) hour = parseInt(match[1]);
    }

    if (hour !== null) {
      if (isPM && hour < 12) hour += 12;
      if (isAM && hour === 12) hour = 0;
    }
  }

  return hour !== null ? { hour, minute } : null;
}

/**
 * 시·분 → 지지(시진) 인덱스
 *
 * 한국 만세력 관례: 홀수 정각(1시, 3시, 5시...)은 이전 시진에 포함
 * 자시: 23:01~01:00, 축시: 01:01~03:00, 인시: 03:01~05:00, ...
 * 즉 시진 전환은 홀수시 0분 이후(01분~)에 발생
 */
function getHourBranch(hour, minute) {
  minute = minute || 0;
  // 총 분으로 변환해서 판단
  const totalMin = hour * 60 + minute;

  // 자시: 23:01(1381) ~ 01:00(60)
  if (totalMin >= 1381 || totalMin <= 60) return 0;   // 子
  if (totalMin <= 180) return 1;   // 丑 (~03:00)
  if (totalMin <= 300) return 2;   // 寅 (~05:00)
  if (totalMin <= 420) return 3;   // 卯 (~07:00)
  if (totalMin <= 540) return 4;   // 辰 (~09:00)
  if (totalMin <= 660) return 5;   // 巳 (~11:00)
  if (totalMin <= 780) return 6;   // 午 (~13:00)
  if (totalMin <= 900) return 7;   // 未 (~15:00)
  if (totalMin <= 1020) return 8;  // 申 (~17:00)
  if (totalMin <= 1140) return 9;  // 酉 (~19:00)
  if (totalMin <= 1260) return 10; // 戌 (~21:00)
  return 11;                        // 亥 (~23:00)
}

/**
 * 기둥 포맷팅
 */
function formatPillar(stemIdx, branchIdx) {
  // 기둥의 대표 오행은 천간 기준
  return {
    hanja: STEMS_HJ[stemIdx] + BRANCHES_HJ[branchIdx],
    korean: STEMS_KR[stemIdx] + BRANCHES_KR[branchIdx],
    element: STEM_ELEMENTS[stemIdx],
    stem: { index: stemIdx, kr: STEMS_KR[stemIdx], hj: STEMS_HJ[stemIdx], element: STEM_ELEMENTS[stemIdx] },
    branch: { index: branchIdx, kr: BRANCHES_KR[branchIdx], hj: BRANCHES_HJ[branchIdx], element: BRANCH_ELEMENTS[branchIdx] }
  };
}

/**
 * 로컬 시간을 KST(한국표준시, UTC+9)로 변환
 * @param {string} birthDate "YYYY-MM-DD"
 * @param {{ hour: number, minute: number }} parsedTime
 * @param {string} timezone IANA 시간대 (예: "America/New_York", "Asia/Seoul")
 * @returns {{ year, month, day, hour, minute }} KST 기준 날짜/시간
 */
function convertToKST(birthDate, parsedTime, timezone) {
  if (!timezone || timezone === 'Asia/Seoul') {
    // 한국이면 변환 불필요
    const [y, m, d] = birthDate.split('-').map(Number);
    return { year: y, month: m, day: d, hour: parsedTime.hour, minute: parsedTime.minute };
  }

  const [y, m, d] = birthDate.split('-').map(Number);

  // 사용자 시간대의 UTC 오프셋 구하기 (분 단위, DST 자동 반영)
  function getOffsetMinutes(tz, date) {
    const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzStr = date.toLocaleString('en-US', { timeZone: tz });
    return (new Date(tzStr) - new Date(utcStr)) / 60000;
  }

  // 생년월일 기준 오프셋 (해당 날짜의 DST 상태 반영)
  const refDate = new Date(y, m - 1, d);
  const userOffsetMin = getOffsetMinutes(timezone, refDate);
  const kstOffsetMin = 9 * 60; // KST = UTC+9 = 540분

  // KST 시간 = 사용자 로컬 시간 + (KST오프셋 - 사용자오프셋)
  const diffMin = kstOffsetMin - userOffsetMin;
  const totalLocalMin = parsedTime.hour * 60 + parsedTime.minute;
  const totalKstMin = totalLocalMin + diffMin;

  // 날짜 넘김 처리
  let kstDay = d, kstMonth = m, kstYear = y;
  let kstHour = Math.floor(totalKstMin / 60);
  let kstMinute = totalKstMin % 60;

  if (kstMinute < 0) { kstMinute += 60; kstHour--; }

  if (kstHour >= 24) {
    kstHour -= 24;
    // 다음 날
    const nextDate = new Date(y, m - 1, d + 1);
    kstYear = nextDate.getFullYear();
    kstMonth = nextDate.getMonth() + 1;
    kstDay = nextDate.getDate();
  } else if (kstHour < 0) {
    kstHour += 24;
    // 전날
    const prevDate = new Date(y, m - 1, d - 1);
    kstYear = prevDate.getFullYear();
    kstMonth = prevDate.getMonth() + 1;
    kstDay = prevDate.getDate();
  }

  return { year: kstYear, month: kstMonth, day: kstDay, hour: kstHour, minute: kstMinute };
}

/**
 * 사주 사주(四柱) 계산
 * @param {string} birthDate "YYYY-MM-DD"
 * @param {string} birthTime 자유 형식 ("오전 9시", "14:00", etc.) 또는 빈 문자열
 * @param {string} [timezone] IANA 시간대 (예: "America/New_York"). 없으면 KST 가정.
 * @returns {{ year, month, day, hour }} 각 기둥 객체
 */
function calculate(birthDate, birthTime, timezone) {
  const parsedTime = parseTime(birthTime);

  // 시간이 있고 해외 시간대면 KST로 변환
  let year, month, day, kstHour = null, kstMinute = 0;

  if (parsedTime && timezone && timezone !== 'Asia/Seoul') {
    const kst = convertToKST(birthDate, parsedTime, timezone);
    year = kst.year;
    month = kst.month;
    day = kst.day;
    kstHour = kst.hour;
    kstMinute = kst.minute;
  } else {
    const parts = birthDate.split('-').map(Number);
    year = parts[0]; month = parts[1]; day = parts[2];
    if (parsedTime) {
      kstHour = parsedTime.hour;
      kstMinute = parsedTime.minute;
    }
  }

  // ── 연주 (年柱) ──
  // 입춘(~2/4) 기준: 입춘 전이면 전년도
  let sajuYear = year;
  if (month < 2 || (month === 2 && day < 4)) {
    sajuYear = year - 1;
  }
  const yearStem = ((sajuYear - 4) % 10 + 10) % 10;
  const yearBranch = ((sajuYear - 4) % 12 + 12) % 12;

  // ── 월주 (月柱) ──
  const monthIdx = getSajuMonthIndex(month, day); // 0=寅月 ~ 11=丑月
  const monthBranch = (monthIdx + 2) % 12;        // 寅=2, 卯=3, ..., 丑=1
  // 연간(年干)에 따른 월간 시작: 갑기→병(2), 을경→무(4), 병신→경(6), 정임→임(8), 무계→갑(0)
  const monthStemStart = ((yearStem % 5) * 2 + 2) % 10;
  const monthStem = (monthStemStart + monthIdx) % 10;

  // ── 일주 (日柱) ──
  const jdn = getJDN(year, month, day);
  // 육십갑자 인덱스: (JDN + 49) % 60, 0 = 甲子
  const dayGanZhi = ((jdn + 49) % 60 + 60) % 60;
  const dayStem = dayGanZhi % 10;
  const dayBranch = dayGanZhi % 12;

  // ── 시주 (時柱) ──
  let hourPillar = null;
  if (kstHour !== null) {
    const hourBranch = getHourBranch(kstHour, kstMinute);
    // 일간(日干)에 따른 시간 시작: 갑기→갑(0), 을경→병(2), 병신→무(4), 정임→경(6), 무계→임(8)
    const hourStemStart = (dayStem % 5) * 2;
    const hourStem = (hourStemStart + hourBranch) % 10;
    hourPillar = formatPillar(hourStem, hourBranch);
  }

  return {
    year: formatPillar(yearStem, yearBranch),
    month: formatPillar(monthStem, monthBranch),
    day: formatPillar(dayStem, dayBranch),
    hour: hourPillar || { hanja: null, korean: null, element: null, stem: null, branch: null }
  };
}

/**
 * 오행 분포 계산
 */
function getElementDistribution(pillars) {
  const count = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  for (const key of ['year', 'month', 'day', 'hour']) {
    const p = pillars[key];
    if (p.stem) count[p.stem.element]++;
    if (p.branch) count[p.branch.element]++;
  }
  return count;
}

module.exports = { calculate, getElementDistribution };

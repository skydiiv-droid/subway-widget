// ─────────────────────────────────────────────────────────────
// 출퇴근 지하철 위젯 (Scriptable)
//
//   출근  발산(5) → 김포공항(공항철도) → 검암(인천2) → 완정
//   퇴근  완정(인천2) → 검암(공항철도) → 김포공항(5) → 발산
//
// 데이터 출처
//   5호선     서울시 실시간 도착정보 API (실시간)
//   공항철도   AREX 실시간 열차정보 (실시간)
//   인천2호선  인천교통공사 공개 시간표 (시간표 기반)
// ─────────────────────────────────────────────────────────────

// ── 설정 ──────────────────────────────────────────────────────

// data.seoul.go.kr 에서 발급받은 인증키
const SEOUL_API_KEY = "여기에_인증키_붙여넣기";

// 위젯 파라미터에 "출근" / "퇴근" 을 넣으면 그 모드로 고정된다.
// 비워두면 시각으로 자동 판단한다 (AUTO_COMMUTE_UNTIL 이전이면 출근).
const AUTO_COMMUTE_UNTIL = 13; // 13시 이전 = 출근

// 각 구간마다 몇 대까지 보여줄지
const TRAINS_PER_LEG = 2;

// 남은 시간 표시 방식
//   relative  iOS가 살아 움직이게 그린다. "5분 후" / 지나면 "5분 전" (권장)
//   timer     초 단위 카운트다운. 정확하지만 지나가면 위로 세기 시작한다
//   static    스크립트가 그릴 때의 값으로 고정. 갱신 전까지 움직이지 않는다
const COUNTDOWN_STYLE = "relative";

// true 로 두고 Scriptable 앱에서 직접 실행하면 원본 응답을 클립보드에 복사한다.
const DIAG = false;

// ── 노선 ──────────────────────────────────────────────────────

const LINES = {
  line5:  { badge: "5",    color: "#996CAC", name: "5호선" },
  arex:   { badge: "A",    color: "#0090D2", name: "공항철도" },
  incheon2: { badge: "I2", color: "#ED8B00", name: "인천2호선" },
};

// ── 구간 정의 ─────────────────────────────────────────────────
//
// source 별 필요한 필드
//   seoul     station(역명, "역" 제외), subwayId, dests(종착역 후보)
//   arex      station(표시용), code(AREX 역코드), dir("up"=서울역방면 / "down"=인천공항방면)
//   timetable station(표시용), table(시간표 키), dest(종착역)

const ROUTE_PATHS = {
  출근: "발산 → 완정",
  퇴근: "완정 → 발산",
};

const ROUTES = {
  출근: [
    { line: "line5", station: "발산", via: "마곡 방면",
      source: "seoul", subwayId: "1005", dests: ["방화"] },
    { line: "arex", station: "김포공항", via: "계양 방면",
      source: "arex", code: "050", dir: "down" },
    { line: "incheon2", station: "검암", via: "독정 방면",
      source: "timetable", table: "geomam", dest: "검단오류" },
  ],
  퇴근: [
    { line: "incheon2", station: "완정", via: "독정 방면",
      source: "timetable", table: "wanjeong", dest: "운연" },
    { line: "arex", station: "검암", via: "계양 방면",
      source: "arex", code: "070", dir: "up" },
    { line: "line5", station: "김포공항", via: "송정 방면",
      source: "seoul", subwayId: "1005", dests: ["하남검단산", "마천"] },
  ],
};

// ── 인천2호선 시간표 ──────────────────────────────────────────
//
// 자정 이후 열차는 24시대(1440분 이상)로 이어서 기록한다.
// 토요일과 공휴일 시간표는 원본이 동일해서 "we" 하나로 합쳤다.

const TIMETABLE_RAW = {
  geomam_wd: "330,343,351,357,370,378,385,390,396,401,405,410,414,418,421,424,427,430,433,435,438,440,443,446,448,451,454,457,460,463,466,469,472,475,478,481,484,487,490,493,496,499,502,505,508,511,514,517,520,523,526,529,532,535,538,541,544,547,550,553,556,559,563,566,569,572,575,578,581,587,593,599,605,611,617,623,629,635,641,647,653,659,666,674,680,686,692,698,705,711,717,723,730,736,742,748,754,761,767,773,779,785,792,798,804,810,817,823,829,835,841,848,854,860,866,873,879,885,891,897,904,910,916,922,928,935,941,947,953,960,966,972,980,984,989,994,998,1003,1008,1012,1017,1022,1026,1031,1036,1040,1045,1050,1054,1059,1064,1067,1070,1074,1077,1080,1084,1087,1091,1094,1097,1101,1104,1108,1111,1114,1118,1121,1124,1128,1131,1135,1138,1141,1145,1148,1152,1155,1158,1162,1165,1168,1172,1175,1179,1182,1185,1189,1192,1195,1199,1202,1206,1209,1215,1222,1228,1234,1240,1246,1253,1259,1265,1271,1278,1284,1290,1296,1302,1309,1315,1321,1327,1334,1340,1346,1355,1365,1373,1380,1388,1397,1407,1417,1427,1437,1447,1458,1467,1477,1485,1492",
  geomam_we: "330,343,357,370,377,385,395,404,410,416,422,428,434,439,445,451,457,463,469,474,481,486,492,498,504,510,516,522,528,533,539,545,551,557,563,569,575,580,586,592,598,604,610,616,622,627,633,639,645,651,657,663,669,675,680,687,692,698,704,710,716,722,727,734,739,745,751,757,763,769,774,780,787,792,798,804,810,816,822,827,833,839,845,851,857,863,869,875,881,886,892,898,904,910,916,922,928,933,939,945,951,957,963,969,975,980,986,992,998,1004,1010,1016,1022,1027,1033,1040,1045,1051,1057,1063,1069,1075,1080,1087,1092,1098,1104,1110,1116,1122,1127,1134,1139,1145,1151,1157,1163,1169,1175,1181,1186,1192,1198,1204,1210,1216,1222,1228,1234,1239,1245,1251,1257,1263,1269,1275,1280,1286,1293,1298,1304,1310,1316,1322,1328,1333,1339,1345,1351,1357,1363,1369,1375,1381,1386,1399,1410,1419,1429,1437,1446,1454,1464,1474,1484,1492",
  wanjeong_wd: "338,347,354,360,366,372,378,384,389,394,399,404,408,411,414,417,420,423,426,429,432,435,438,441,444,447,450,453,456,458,461,463,466,468,471,473,476,478,481,484,487,490,493,496,499,502,505,508,512,515,517,520,523,526,529,532,535,538,542,544,547,550,553,556,559,562,565,568,571,578,584,590,596,603,611,617,623,629,635,642,648,654,660,666,673,679,685,691,698,704,710,716,722,729,735,741,747,754,760,766,772,778,785,791,797,803,809,816,822,828,834,841,847,853,859,865,872,878,884,890,896,903,909,915,921,928,934,940,948,952,957,962,966,971,976,980,985,990,994,999,1004,1008,1013,1018,1022,1027,1032,1036,1041,1047,1050,1054,1057,1061,1064,1067,1071,1074,1077,1081,1084,1088,1091,1094,1098,1101,1105,1108,1111,1115,1118,1121,1125,1128,1132,1135,1138,1142,1145,1148,1152,1155,1159,1162,1165,1169,1172,1176,1179,1182,1186,1189,1192,1196,1202,1208,1215,1221,1227,1233,1239,1246,1252,1258,1264,1270,1277,1283,1289,1295,1302,1308,1314,1320,1326,1333,1339,1345,1351,1358,1364,1370,1379,1389,1397,1404,1412,1421,1431,1441,1451,1461",
  wanjeong_we: "338,347,357,369,375,381,387,393,399,404,410,416,422,428,434,440,446,452,457,463,469,475,481,487,493,498,504,510,516,522,528,534,539,545,552,557,563,569,575,581,587,592,599,604,610,616,622,628,634,639,646,651,657,663,669,675,681,687,692,699,704,710,716,722,728,734,739,745,751,757,763,769,775,781,787,793,798,804,810,816,822,828,834,840,845,851,857,863,869,875,881,887,892,898,905,910,916,922,928,934,940,945,952,957,963,969,975,981,987,992,999,1004,1010,1016,1022,1028,1034,1040,1046,1051,1057,1063,1069,1075,1081,1087,1093,1098,1104,1110,1116,1122,1128,1134,1140,1146,1151,1158,1163,1169,1175,1181,1187,1193,1198,1205,1210,1216,1222,1228,1234,1240,1245,1251,1258,1263,1269,1275,1281,1287,1293,1298,1304,1310,1316,1322,1328,1334,1340,1345,1352,1358,1366,1376,1386,1396,1404,1412,1422,1433,1442,1452,1461",
};

const TIMETABLE = Object.fromEntries(
  Object.entries(TIMETABLE_RAW).map(([k, v]) => [k, v.split(",").map(Number)])
);

// 공휴일 판정용 목록. 매년 갱신이 필요하고, 대체공휴일은 관보 기준으로 확인해서 고쳐 쓴다.
const HOLIDAYS = [
  "2026-01-01",
  "2026-02-16", "2026-02-17", "2026-02-18", // 설 연휴
  "2026-03-01", "2026-03-02",               // 삼일절 + 대체
  "2026-05-05", "2026-05-24", "2026-05-25", // 어린이날, 부처님오신날 + 대체
  "2026-06-06", "2026-08-15",
  "2026-09-24", "2026-09-25", "2026-09-26", // 추석 연휴
  "2026-10-03", "2026-10-09", "2026-12-25",
];

// ── 시간 유틸 ─────────────────────────────────────────────────

// 04시 이전은 전날의 운행일에 속한다. 시간표가 24시대로 이어지는 것과 짝을 맞춘다.
const SERVICE_DAY_START_HOUR = 4;

function serviceClock(now) {
  let minutes = now.getHours() * 60 + now.getMinutes();
  const date = new Date(now);
  if (now.getHours() < SERVICE_DAY_START_HOUR) {
    minutes += 1440;
    date.setDate(date.getDate() - 1);
  }
  return { minutes, seconds: minutes * 60 + now.getSeconds(), date };
}

function isWeekendTable(date) {
  const day = date.getDay();
  if (day === 0 || day === 6) return true;
  const iso = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  return HOLIDAYS.includes(iso);
}

// "2026-09-20 05:33:12" 를 기기 시간대(KST) 기준으로 읽는다.
function parseReceiptTime(text) {
  if (!text) return null;
  const t = Date.parse(String(text).replace(/-/g, "/"));
  return Number.isNaN(t) ? null : t;
}

// 위젯은 스크립트를 계속 돌리지 못한다. 대신 도착 시각을 넘겨주면 iOS가
// 초 단위로 알아서 깎아 보여준다.
function arrivalDate(secs) {
  return new Date(Date.now() + secs * 1000);
}

function clockOf(secs) {
  const d = arrivalDate(secs);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatRemaining(secs) {
  if (secs === null || secs === undefined) return "—";
  if (secs <= 10) return "곧";
  if (secs < 60) return `${Math.round(secs)}초`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  if (secs < 600) return s === 0 ? `${m}분` : `${m}분 ${s}초`;
  return `${m}분`;
}

function hhmm(minutes) {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// ── 데이터 소스 ───────────────────────────────────────────────

const diagDump = [];

async function getJSON(url) {
  const req = new Request(url);
  req.timeoutInterval = 9;
  req.headers = {
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
  };
  const data = await req.loadJSON();
  if (DIAG) diagDump.push({ url, data });
  return data;
}

const ARVL_CODE = {
  "0": "진입", "1": "도착", "2": "출발",
  "3": "전역 출발", "4": "전역 진입", "5": "전역 도착", "99": "운행 중",
};

// 서울시 쪽은 https 요청이 응답 없이 멎는 경우가 있어, 문서에 적힌 http를 먼저 쓴다.
const SEOUL_BASES = [
  "http://swopenapi.seoul.go.kr/api/subway",
  "https://swopenapi.seoul.go.kr/api/subway",
];

async function fetchSeoul(leg) {
  const path = `${SEOUL_API_KEY}/json/realtimeStationArrival/0/10/` +
    encodeURIComponent(leg.station);

  let data = null;
  let lastError = null;
  for (const base of SEOUL_BASES) {
    try {
      data = await getJSON(`${base}/${path}`);
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!data) throw lastError || new Error("응답 없음");

  const code = data?.errorMessage?.code;
  if (code && code !== "INFO-000") {
    if (code === "INFO-200") return [];
    throw new Error(data.errorMessage.message || code);
  }

  const now = Date.now();
  return (data.realtimeArrivalList || [])
    .filter((it) => String(it.subwayId) === leg.subwayId)
    .filter((it) => leg.dests.some(
      (d) => (it.trainLineNm || "").includes(d) || (it.bstatnNm || "").includes(d)
    ))
    .map((it) => {
      let secs = Number(it.barvlDt);
      if (!Number.isFinite(secs) || secs <= 0) secs = parseArrivalMessage(it.arvlMsg2);
      if (secs !== null) {
        // 응답은 recptnDt 시점의 예측이다. 위젯이 캐시된 만큼 흘러간 시간을 빼준다.
        const receipt = parseReceiptTime(it.recptnDt);
        const elapsed = receipt ? (now - receipt) / 1000 : 0;
        if (elapsed > 0 && elapsed < 300) secs -= elapsed;
      }
      return {
        dest: (it.bstatnNm || "").replace(/행$/, ""),
        secs: secs === null ? null : Math.max(secs, 0),
        note: it.arvlMsg3 || ARVL_CODE[String(it.arvlCd)] || "",
        sortKey: secs === null ? 1e9 : secs,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);
}

// "3분 33초 후 (마곡)" 같은 안내문에서 초를 뽑아낸다.
function parseArrivalMessage(msg) {
  if (!msg) return null;
  const m = String(msg).match(/(?:(\d+)분)?\s*(?:(\d+)초)?\s*후/);
  if (!m || (!m[1] && !m[2])) return null;
  return Number(m[1] || 0) * 60 + Number(m[2] || 0);
}

// AREX 응답의 waitingTime은 단위가 문서화돼 있지 않아 값을 보고 판단한다.
function normalizeWaiting(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value > 180 ? value : value * 60;
  const text = String(value).trim();
  const kor = text.match(/(?:(\d+)분)?\s*(?:(\d+)초)?/);
  if (kor && (kor[1] || kor[2])) return Number(kor[1] || 0) * 60 + Number(kor[2] || 0);
  const n = Number(text.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return null;
  return n > 180 ? n : n * 60;
}

async function fetchArex(leg) {
  const url = "https://www.airportrailroad.com/train/normal/live/realTimeStation" +
    `?startStation=${leg.code}`;
  const data = await getJSON(url);

  const list = leg.dir === "up" ? data.realTimeStationUp : data.realTimeStationDown;
  return (list || [])
    // formType 'A'는 직통열차다. 김포공항·검암에 서지 않으니 뺀다.
    .filter((t) => t.formType !== "A")
    .map((t) => {
      const secs = normalizeWaiting(t.waitingTime);
      const stops = Number(t.waitingStn);
      return {
        dest: leg.dir === "up" ? "서울역" : "인천공항",
        secs,
        note: Number.isFinite(stops) && stops > 0 ? `${stops}개 역 전` : "출발 대기",
        sortKey: secs === null ? 1e9 : secs,
      };
    })
    .sort((a, b) => a.sortKey - b.sortKey);
}

function fetchTimetable(leg, clock) {
  const key = `${leg.table}_${isWeekendTable(clock.date) ? "we" : "wd"}`;
  const times = TIMETABLE[key];
  if (!times) throw new Error(`시간표 없음: ${key}`);

  return times
    .filter((t) => t * 60 >= clock.seconds)
    .map((t) => ({
      dest: leg.dest,
      secs: t * 60 - clock.seconds,
      note: `${hhmm(t)} 출발`,
      sortKey: t,
    }));
}

// 위젯에 주어지는 실행 시간이 넉넉하지 않다. 전체 예산을 정해두고 구간마다
// 남은 만큼만 기다린 뒤, 늦는 구간은 직전 결과로 대신 채운다.
const BUDGET_MS = 12000;
const startedAt = Date.now();

function remainingBudget() {
  return Math.max(1500, BUDGET_MS - (Date.now() - startedAt));
}

function withDeadline(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      Timer.schedule(ms, false, () => reject(new Error("시간 초과")));
    }),
  ]);
}

// ── 캐시 ──────────────────────────────────────────────────────

const CACHE_TTL = 600; // 초. 이보다 오래된 값은 쓰지 않는다.
const fm = FileManager.local();
const CACHE_PATH = fm.joinPath(fm.cacheDirectory(), "subway-widget.json");

function loadCache() {
  try {
    return JSON.parse(fm.readString(CACHE_PATH)) || {};
  } catch (err) {
    return {};
  }
}

function saveCache(cache) {
  try {
    fm.writeString(CACHE_PATH, JSON.stringify(cache));
  } catch (err) {
    // 캐시를 못 써도 위젯 자체는 돌아가야 한다.
  }
}

const cache = loadCache();

function legKey(leg) {
  return `${leg.source}:${leg.station}:${leg.via}`;
}

function cachedArrivals(leg) {
  const entry = cache[legKey(leg)];
  if (!entry) return null;

  const age = (Date.now() - entry.at) / 1000;
  if (age > CACHE_TTL) return null;

  // 저장해 둔 값은 그때 기준이므로 흐른 시간만큼 당긴다.
  const arrivals = entry.arrivals
    .map((a) => ({ ...a, secs: a.secs === null ? null : a.secs - age }))
    .filter((a) => a.secs === null || a.secs > -30);

  return arrivals.length ? { arrivals, age } : null;
}

// ── 구간 로딩 ─────────────────────────────────────────────────

async function loadLeg(leg, clock) {
  if (leg.source === "timetable") {
    try {
      const arrivals = fetchTimetable(leg, clock);
      if (!arrivals.length) return { leg, arrivals: [], message: "운행 종료" };
      return { leg, arrivals: arrivals.slice(0, TRAINS_PER_LEG) };
    } catch (err) {
      return { leg, arrivals: [], message: err.message };
    }
  }

  try {
    const fetcher = leg.source === "seoul" ? fetchSeoul : fetchArex;
    const arrivals = await withDeadline(fetcher(leg), remainingBudget());
    if (!arrivals.length) return { leg, arrivals: [], message: "운행 정보 없음" };

    const shown = arrivals.slice(0, TRAINS_PER_LEG);
    cache[legKey(leg)] = { at: Date.now(), arrivals: shown };
    return { leg, arrivals: shown };
  } catch (err) {
    const fallback = cachedArrivals(leg);
    if (fallback) {
      const mins = Math.max(1, Math.round(fallback.age / 60));
      return { leg, arrivals: fallback.arrivals, stale: `${mins}분 전 정보` };
    }
    return { leg, arrivals: [], message: `불러오기 실패 (${err.message})` };
  }
}

// ── 화면 ──────────────────────────────────────────────────────

const BG = new Color("#1C1C1E");
const FG = new Color("#FFFFFF");
const MUTED = new Color("#8E8E93");
const DIM = new Color("#5A5A5E");
const ACCENT = new Color("#FFD60A");

const BADGE_W = 24;
const BADGE_GAP = 7;

function drawBadge(stack, line) {
  const badge = stack.addStack();
  badge.backgroundColor = new Color(line.color);
  badge.cornerRadius = 8;
  badge.size = new Size(BADGE_W, 17);
  badge.centerAlignContent();
  const label = badge.addText(line.badge);
  label.font = Font.boldSystemFont(10);
  label.textColor = FG;
}

function drawDivider(container) {
  const rule = container.addStack();
  rule.size = new Size(0, 1);
  rule.backgroundColor = DIM;
  rule.addSpacer();
}

function drawLeg(container, result) {
  const row = container.addStack();
  row.centerAlignContent();

  drawBadge(row, LINES[result.leg.line]);
  row.addSpacer(BADGE_GAP);

  const name = row.addText(`${result.leg.station}역`);
  name.font = Font.boldSystemFont(14);
  name.textColor = FG;
  name.lineLimit = 1;

  row.addSpacer(5);
  const via = row.addText(result.leg.via);
  via.font = Font.systemFont(11);
  via.textColor = MUTED;
  via.lineLimit = 1;

  row.addSpacer();

  if (result.message) {
    const dash = row.addText("—");
    dash.font = Font.boldSystemFont(17);
    dash.textColor = DIM;
  } else {
    const first = result.arrivals[0];
    const live = COUNTDOWN_STYLE !== "static" &&
      first.secs !== null && first.secs > 0 && first.secs < 3600;

    if (live) {
      const date = row.addDate(arrivalDate(first.secs));
      // relative는 지나간 열차를 "N분 전"으로 적어 방향이 드러난다.
      // timer는 초까지 보여주지만 지나가면 위로 세므로 읽는 사람이 구분할 수 없다.
      if (COUNTDOWN_STYLE === "timer") date.applyTimerStyle();
      else date.applyRelativeStyle();
      date.rightAlignText();
      date.font = Font.boldSystemFont(17);
      date.textColor = FG;
    } else {
      const primary = row.addText(formatRemaining(first.secs));
      primary.font = Font.boldSystemFont(17);
      primary.textColor = FG;
    }
  }

  // 보조 설명은 역명 아래로 들여쓴다.
  const sub = container.addStack();
  sub.addSpacer(BADGE_W + BADGE_GAP);
  const parts = [];
  if (result.message) {
    parts.push(result.message);
  } else {
    const first = result.arrivals[0];
    // 절대 시각은 위젯이 아무리 오래 멈춰 있어도 틀리지 않는다. 기준점 역할.
    if (first.secs !== null) parts.push(clockOf(first.secs));
    if (first.note) parts.push(first.note);
    const next = result.arrivals[1];
    if (next && next.secs !== null) parts.push(`다음 ${clockOf(next.secs)}`);
  }
  if (result.stale) parts.push(result.stale);

  const note = sub.addText(parts.join(" · "));
  note.font = Font.systemFont(9);
  note.textColor = result.message || result.stale ? MUTED : DIM;
  note.lineLimit = 1;
  sub.addSpacer();
}

function drawSection(widget, mode, results, isNow) {
  const header = widget.addStack();
  header.centerAlignContent();

  const dot = header.addStack();
  dot.size = new Size(5, 5);
  dot.cornerRadius = 2.5;
  dot.backgroundColor = isNow ? ACCENT : DIM;
  header.addSpacer(6);

  const title = header.addText(mode);
  title.font = Font.boldSystemFont(12);
  title.textColor = isNow ? FG : MUTED;

  header.addSpacer(6);
  const path = header.addText(ROUTE_PATHS[mode]);
  path.font = Font.systemFont(10);
  path.textColor = DIM;
  header.addSpacer();

  widget.addSpacer(7);
  results.forEach((result, idx) => {
    if (idx > 0) widget.addSpacer(7);
    drawLeg(widget, result);
  });
}

function buildWidget(sections, currentMode, now) {
  const widget = new ListWidget();
  widget.backgroundColor = BG;
  widget.setPadding(13, 14, 13, 14);

  const header = widget.addStack();
  header.centerAlignContent();
  const title = header.addText("출퇴근");
  title.font = Font.boldSystemFont(13);
  title.textColor = FG;
  header.addSpacer();

  const fmt = new DateFormatter();
  fmt.dateFormat = "a h:mm";
  fmt.locale = "ko_KR";
  const stamp = header.addText(`${fmt.string(now)} 기준`);
  stamp.font = Font.systemFont(10);
  stamp.textColor = MUTED;

  widget.addSpacer(9);
  sections.forEach(({ mode, results }, idx) => {
    if (idx > 0) {
      widget.addSpacer(10);
      drawDivider(widget);
      widget.addSpacer(10);
    }
    drawSection(widget, mode, results, mode === currentMode);
  });
  widget.addSpacer();

  // 다음 열차가 도착할 즈음 새로 그리도록 요청한다. iOS가 그대로 지켜주지는
  // 않지만, 무의미하게 지난 카운트다운이 오래 남아 있는 건 줄어든다.
  const soonest = sections
    .flatMap((section) => section.results)
    .map((result) => result.arrivals[0])
    .filter((a) => a && a.secs !== null && a.secs > 0)
    .reduce((min, a) => Math.min(min, a.secs), Infinity);

  const waitSecs = Math.min(Math.max(Number.isFinite(soonest) ? soonest : 300, 60), 900);
  widget.refreshAfterDate = new Date(Date.now() + waitSecs * 1000);

  // 탭하면 스크립트가 바로 다시 돈다.
  widget.url = `scriptable:///run?scriptName=${encodeURIComponent(Script.name())}`;
  return widget;
}

// ── 실행 ──────────────────────────────────────────────────────

const now = new Date();
const clock = serviceClock(now);

// 시각으로 지금 어느 쪽인지 짐작해 강조만 한다. 순서는 항상 출근 → 퇴근으로 고정이다.
const currentMode = now.getHours() < AUTO_COMMUTE_UNTIL ? "출근" : "퇴근";

// 중간 크기 위젯에는 여섯 구간이 다 들어가지 않으니 지금 쓰는 쪽만 보여준다.
const param = (args.widgetParameter || "").trim();
let modes = Object.keys(ROUTES);
if (ROUTES[param]) modes = [param];
else if (config.runsInWidget && config.widgetFamily === "medium") modes = [currentMode];

// 방향별로 나눠 부르면 왕복이 두 배가 된다. 전 구간을 한 번에 띄운다.
const jobs = modes.flatMap((mode) => ROUTES[mode].map((leg) => ({ mode, leg })));
const loaded = await Promise.all(jobs.map((job) => loadLeg(job.leg, clock)));
saveCache(cache);

const sections = modes.map((mode) => ({
  mode,
  results: loaded.filter((_, i) => jobs[i].mode === mode),
}));

const widget = buildWidget(sections, currentMode, now);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  if (DIAG) {
    Pasteboard.copy(JSON.stringify(diagDump, null, 2));
    const alert = new Alert();
    alert.title = "원본 응답 복사됨";
    alert.message = `${diagDump.length}건을 클립보드에 넣었다.`;
    alert.addAction("확인");
    await alert.present();
  }
  await widget.presentLarge();
}
Script.complete();

// 서울시 실시간 도착정보 API 점검용. Scriptable 앱에서 직접 실행한다.
// 위젯의 5호선 구간이 계속 비면 이걸 돌려 어디서 막히는지 본다.

const SEOUL_API_KEY = "여기에_인증키_붙여넣기";
const STATION = "발산";

const BASES = [
  "http://swopenapi.seoul.go.kr/api/subway",
  "https://swopenapi.seoul.go.kr/api/subway",
];

const lines = [];

for (const base of BASES) {
  const url = `${base}/${SEOUL_API_KEY}/json/realtimeStationArrival/0/10/` +
    encodeURIComponent(STATION);
  const started = Date.now();
  try {
    const req = new Request(url);
    req.timeoutInterval = 20;
    const data = await req.loadJSON();
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    const status = data?.errorMessage?.code || "(code 없음)";
    const count = (data.realtimeArrivalList || []).length;
    lines.push(`${base.split(":")[0]}  ${elapsed}초  ${status}  ${count}건`);
    if (count) {
      data.realtimeArrivalList.slice(0, 4).forEach((it) => {
        lines.push(`   ${it.subwayId} ${it.trainLineNm} | barvlDt=${it.barvlDt}` +
          ` | ${it.arvlMsg2} | ${it.recptnDt}`);
      });
    } else if (data?.errorMessage?.message) {
      lines.push(`   ${data.errorMessage.message}`);
    }
  } catch (err) {
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    lines.push(`${base.split(":")[0]}  ${elapsed}초  실패: ${err.message}`);
  }
}

const report = lines.join("\n");
console.log(report);
Pasteboard.copy(report);

const alert = new Alert();
alert.title = "점검 결과 (복사됨)";
alert.message = report;
alert.addAction("확인");
await alert.present();

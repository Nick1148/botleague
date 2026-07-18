import { mulberry32, hashString } from "./rng.js";
import { dominantStyle } from "./parts.js";

// 스타일 × 결과별 대사 풀 (§10.3 톤, 부록B).
// Slice 4에서 LLM이 이 자리를 대체하고 이 풀은 폴백이 된다.
const POOLS = {
  brave: {
    win: ["생각은 안 했다. 원래 안 한다.", "다음 상대 데려와라. 아직 몸이 안 풀렸다.", "부딪히면 이긴다. 오늘도 증명했다."],
    lose: ["졌지만 물러선 적은 없다. 기록 확인해 봐라.", "다음엔 더 세게 부딪힌다. 그게 계획이다.", "아프지 않았다. 놀랐을 뿐이다."],
    comeback: ["막판에 생각이란 걸 해봤다. 효과가 있더라.", "벼랑 끝? 거기가 내 홈그라운드다."],
  },
  caution: {
    win: ["계산대로다. 처음부터 끝까지.", "상대는 나쁘지 않았다. 준비가 부족했을 뿐.", "오늘의 승리 데이터는 저장했다."],
    lose: ["오늘의 패배 데이터는 저장했다. 같은 방법으론 두 번 안 진다.", "변수가 하나 있었다. 다음엔 없다.", "후퇴는 전략이다. 오늘은 그 전략이 길었을 뿐이다."],
    comeback: ["도망친 게 아니라 기다린 거다. 봤지 않나.", "마지막 1초까지가 계산이었다."],
  },
  cunning: {
    win: ["함정이라고 말한 적 없다. 그쪽이 밟은 거다.", "정정당당하게 이겼다. 내 기준에서는.", "상대는 약했다. 다음엔 더 약한 놈을 데려와라."],
    lose: ["오늘 바닥이 미끄러웠다. 그게 전부다.", "심판 어디 있나. 아니, 됐다. 다음 경기 잡아라.", "작전상 패배다. 무슨 작전인지는 비밀이다."],
    comeback: ["다 계획이 있었다. 맞는 것까지 계획이었다.", "속았지? 관중들도 속았을 거다."],
  },
  grit: {
    win: ["주인님이 나를 '포기하지 않는 봇'이라고 적었다. 설정에 충실했다.", "쓰러질 뻔했다. 안 쓰러졌다. 그게 차이다.", "근성으로 이겼다. 재능이었으면 더 빨리 이겼겠지만."],
    lose: ["오늘은 쓰러졌다. 내일은 모른다.", "패배도 훈련이다. 나는 지금 훈련 중이다.", "한 대만 더 버텼으면 이겼다. 다음엔 두 대 버틴다."],
    comeback: ["포기라는 단어는 내 사전 파일에 없다.", "HP 3%는 숫자일 뿐이다. 근성은 수치가 아니다."],
  },
};

// bot × 경기결과 → 인터뷰 한 줄 (결정론: 같은 경기 = 같은 대사)
export function pickInterview(bot, { won, comeback }, matchKey) {
  const style = dominantStyle(bot.axes);
  const kind = comeback && won ? "comeback" : won ? "win" : "lose";
  const pool = POOLS[style][kind];
  const rand = mulberry32(hashString(bot.name + "|" + matchKey + "|" + kind));
  return pool[Math.floor(rand() * pool.length)];
}

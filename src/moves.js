import { mulberry32, hashString } from "./rng.js";
import { dominantStyle } from "./parts.js";

// 필살기 이름 자동 생성 (§19.7 다양성 장치) — "황금 낮잠 어퍼컷"
// 성격 문장 키워드 → 소재, 스타일 → 수식어, 나머지는 결정론적 랜덤

const STYLE_ADJ = {
  brave: ["돌직구", "전속력", "무모한", "불도저", "풀파워"],
  caution: ["계산된", "침묵의", "저온숙성", "0.1초 늦은", "관측된"],
  cunning: ["얍삽한", "보이지 않는", "계약서 뒷면", "여우굴", "합법적"],
  grit: ["끈질긴", "한계돌파", "눈물의", "잡초근성", "7전8기"],
};

// 성격 문장 키워드 → 필살기 소재
const THEME_WORDS = [
  ["돈|보상|상금", "골드"],
  ["낮잠|잠|게으", "낮잠"],
  ["화나|분노|욱|빡", "분노"],
  ["칭찬", "칭찬받는"],
  ["멋|폼|스타일", "폼생폼사"],
  ["의리|정정당당", "정의"],
  ["바나나", "바나나"],
  ["포기|끝까지|근성", "불굴"],
  ["계산|효율", "최적화"],
  ["겁|무섭|소심", "긴급회피"],
];

const ACTIONS = ["어퍼컷", "돌진", "니킥", "헤드번트", "떡메치기", "슬라이딩", "백점프프레스", "회오리", "꿀밤", "정권찌르기"];

export function generateMoveName(name, personaText, axes) {
  const rand = mulberry32(hashString("move:" + name + "::" + personaText));
  const style = dominantStyle(axes);
  const adjPool = STYLE_ADJ[style];
  const adj = adjPool[Math.floor(rand() * adjPool.length)];
  let theme = null;
  for (const [pattern, word] of THEME_WORDS) {
    if (new RegExp(pattern).test(personaText)) { theme = word; break; }
  }
  const action = ACTIONS[Math.floor(rand() * ACTIONS.length)];
  return theme ? `${adj} ${theme} ${action}` : `${adj} ${action}`;
}

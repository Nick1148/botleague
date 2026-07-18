import { createBot } from "./bot.js";

// 데뷔전 상대 풀 — 드립 이름 (§11.3). createBot이 성격까지 파싱하므로 데이터만 있으면 된다.
const NPC_DEFS = [
  ["두부킹", "물렁해 보여도 왕은 왕이다. 정정당당하게 싸운다"],
  ["겁쟁이9000", "겁이 많다. 숫자가 클수록 더 무섭다"],
  ["돌진맨", "일단 부딪히고 생각한다"],
  ["여우코어", "몰래 뒤에서 치는 게 특기다"],
  ["시무룩", "이길 때도 시무룩. 근성 하나로 버틴다"],
  ["낮잠보스", "싸움 전에 꼭 낮잠을 잔다"],
  ["폼생폼사", "이기는 것보다 멋있는 게 중요하다"],
  ["가성비", "계산이 서기 전엔 안 움직인다"],
  ["불꽃탱크", "화나면 아무것도 안 보인다"],
  ["칭찬바라기", "칭찬받으면 강해진다"],
];

export function randomNpc() {
  const [name, persona] = NPC_DEFS[Math.floor(Math.random() * NPC_DEFS.length)];
  return createBot(name, persona);
}

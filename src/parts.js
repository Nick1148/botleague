import { mulberry32, hashString } from "./rng.js";

// v0.4 파츠 세트 (§19.3, §19.7) — "대충 그린 SNS 캐릭터" 문법
export const BODIES = ["round", "jelly", "cube", "ghost", "bean", "drop", "mochi", "egg"];
export const EYES = ["tiny", "dot", "half", "crescent", "sharp", "scared", "sleepy", "teary", "chill", "star", "line", "cross"];
export const MOUTHS = ["smile", "tight", "smirk", "open", "wavy", "fang", "pout", "dotm", "triangle", "omega"];
export const MARKS = ["none", "blush", "sweat", "tearline", "starpatch", "bandage", "lightning", "oil"];
export const ACCESSORIES = ["none", "ribbon", "antenna", "horn", "ears", "headband", "sprout", "cap"];

// 스타일별 기준 색상(hue) — 저채도 파스텔은 botPalette에서 생성 (§19.7-⑤)
export const STYLE_HUES = { brave: 12, caution: 160, cunning: 265, grit: 45 };

// (구버전 호환) 스타일 대표색 — 신규 코드는 botPalette 사용
export const STYLE_COLORS = {
  brave:   { body: "#FF8A76", accent: "#FF6B57" },
  caution: { body: "#7FE6C9", accent: "#4ED9B5" },
  cunning: { body: "#C3B1FA", accent: "#A78BFA" },
  grit:    { body: "#FFD86B", accent: "#FFC93C" },
};

export function dominantStyle(axes) {
  if (axes.honest <= -25) return "cunning";
  if (axes.brave >= 20) return "brave";
  if (axes.brave <= -20) return "caution";
  return "grit";
}

// 개체별 저채도 파스텔 배색 (결정론: 이름+성격 시드) — 같은 타입도 색이 전부 다르다
export function botPalette(bot) {
  const rand = mulberry32(hashString("pal:" + bot.name + "::" + bot.personaText));
  const baseHue = STYLE_HUES[bot.parts.style];
  const h = (baseHue + Math.round((rand() - 0.5) * 36) + 360) % 360;
  const s = 42 + Math.round(rand() * 18);      // 42~60% 저채도
  const l = 76 + Math.round(rand() * 8);       // 76~84% 밝은 파스텔
  return {
    body: `hsl(${h}, ${s}%, ${l}%)`,
    shade: `hsl(${h}, ${Math.min(70, s + 10)}%, ${l - 14}%)`,   // 은은한 1톤 음영
    accent: `hsl(${h}, ${Math.min(80, s + 25)}%, ${l - 30}%)`,  // 카드·포인트
    neon: `hsl(${h}, 95%, 62%)`,                                // 트리거·필살기 순간만 (최고심st 형광)
  };
}

// 성격 → 파츠 (규칙 우선, 나머지는 결정론적 랜덤) — §19.3 매핑표 + §19.7 트렌드 문법
export function pickParts(axes, rand) {
  const style = dominantStyle(axes);
  // 기본은 절제된 표정(점눈·실눈·멍눈) 쪽으로 기울인다 (§19.7-②)
  const calmPool = ["tiny", "tiny", "dot", "half", "chill", "line", "sleepy"];
  const eye =
    axes.brave <= -40 ? "scared" :
    style === "cunning" ? "crescent" :
    axes.brave >= 40 ? "sharp" :
    axes.calm >= 40 ? "sleepy" :
    axes.grit >= 40 ? "teary" :
    calmPool[Math.floor(rand() * calmPool.length)];
  const mouthPool = ["pout", "dotm", "tight", "smile", "omega", "wavy", "triangle", "fang"];
  const mouth =
    style === "cunning" ? "smirk" :
    axes.brave >= 40 ? "open" :
    mouthPool[Math.floor(rand() * mouthPool.length)];
  const body = BODIES[Math.floor(rand() * BODIES.length)];
  const mark =
    axes.calm <= -30 ? "blush" :
    axes.grit >= 40 ? "bandage" :
    MARKS[Math.floor(rand() * MARKS.length)];
  const accessory = ACCESSORIES[Math.floor(rand() * ACCESSORIES.length)];
  return { body, eye, mouth, mark, accessory, style };
}

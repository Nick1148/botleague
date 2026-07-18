export const BODIES = ["round", "jelly", "cube", "ghost"];
export const EYES = ["dot", "crescent", "sharp", "scared", "sleepy", "star", "line", "cross"];
export const MOUTHS = ["smile", "tight", "smirk", "open", "wavy", "fang"];
export const MARKS = ["none", "blush"];

// 스타일별 몸 색 (§19.2 포인트 컬러 계열)
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

// 성격 → 파츠 (규칙 우선, 나머지는 결정론적 랜덤) — §19.3 매핑표
export function pickParts(axes, rand) {
  const style = dominantStyle(axes);
  const eye =
    axes.brave <= -40 ? "scared" :
    style === "cunning" ? "crescent" :
    axes.brave >= 40 ? "sharp" :
    axes.calm >= 40 ? "sleepy" :
    EYES[Math.floor(rand() * EYES.length)];
  const mouth =
    style === "cunning" ? "smirk" :
    axes.brave >= 40 ? "open" :
    MOUTHS[Math.floor(rand() * MOUTHS.length)];
  const body = BODIES[Math.floor(rand() * BODIES.length)];
  const mark = axes.calm <= -30 ? "blush" : MARKS[Math.floor(rand() * MARKS.length)];
  return { body, eye, mouth, mark, style };
}

// 성격 키워드 사전 — 규칙 추가만으로 파싱이 풍부해진다 (§6.2 1차)
export const KEYWORD_RULES = [
  { match: ["겁", "무섭", "소심", "쫄보"], effects: { brave: -30 } },
  { match: ["용감", "저돌", "돌진", "겁없", "일단"], effects: { brave: 35 } },
  { match: ["화나", "분노", "욱", "빡"], effects: { calm: -40 } },
  { match: ["침착", "차분", "냉정", "조용"], effects: { calm: 40 } },
  { match: ["의리", "정정당당", "정직", "우직"], effects: { honest: 40 } },
  { match: ["거짓", "얍삽", "몰래", "속임", "교활", "치사"], effects: { honest: -40 } },
  { match: ["포기", "끝까지", "근성", "악착", "버티"], effects: { grit: 40 } },
  { match: ["효율", "계산", "가성비"], effects: { grit: -30 } },
  { match: ["멋", "폼", "스타일"], effects: { brave: 15, grit: -15 } },
  { match: ["낮잠", "게으", "귀찮", "잠"], effects: { brave: -10, calm: 15 } },
];

export const TRIGGER_RULES = [
  { match: ["돈", "보상", "상금"], trigger: { id: "prize", label: "돈이 걸리면 각성한다", effects: { brave: 60 } } },
  { match: ["칭찬"], trigger: { id: "praise", label: "칭찬받으면 강해진다", effects: { grit: 40 } } },
  { match: ["화나면", "빡치면"], trigger: { id: "rage", label: "연속 피격 시 광폭화", effects: { brave: 40, calm: -40 } } },
  { match: ["멋있", "멋진", "폼"], trigger: { id: "style", label: "필살기만 노린다", effects: {} } },
  { match: ["낮잠", "잠"], trigger: { id: "nap", label: "졸다가 기력을 회복한다", effects: {} } },
];

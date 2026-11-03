/**
 * 시드 데이터: 그리스신화 14명, 삼국지 20명, 수호지 15명, 초한지 14명
 * 능력치: 코에이 수치를 참고한 원래 값을, 아이 영웅과 같은 규칙(합 300 이하, 별 = 합의 구간)으로 줄인 값입니다.
 *   잘하는 능력치는 덜 줄이고 약한 능력치는 더 줄여서 인물의 개성을 살렸습니다 (docs/HERO_MAKER.md 18장).
 * 별(rarity)은 카드 배틀 비용과 같습니다 (src/lib/battle/cards.ts의 OFFICIAL_CARDS). 둘을 함께 바꾸세요.
 * 여러 번 실행해도 같은 결과가 됩니다(이미 있으면 수정).
 * 실행 진입점은 prisma/seed.ts 입니다.
 */
import { type PrismaClient, RelationType } from "../src/generated/prisma/client";
import { buildSearchText, toChoseong } from "../src/lib/search/choseong";

/** 능력치 5칸: [stat1, stat2, stat3, stat4, stat5] (이름은 세계관 statLabels) */
type Stats = [stat1: number, stat2: number, stat3: number, stat4: number, stat5: number];

type CharacterSeed = {
  slug: string;
  name: string;
  title: string;
  aliases?: string[];
  /** 세계관의 factions 중 하나 (편이 없는 세계관은 생략) */
  faction?: string;
  /** 세계관의 kinds 중 하나 */
  kind: string;
  /** 카드 배틀 특별한 힘을 종류와 다르게 줄 때 (src/lib/battle/cards.ts의 KIND_ABILITY) */
  ability?: "guard" | "charge" | "scheme" | "divine" | "fire";
  rarity: number;
  stats: Stats;
  summary: string;
  /** 인물 열전. 빈 줄로 문단을 나눕니다. 없으면 summary를 씁니다. */
  biography?: string;
  funFacts?: string[];
};

/** [from, to, type]: "to는 from의 type" (예: ["zhuge-liang", "liu-bei", LORD] → 유비는 제갈량의 주군) */
type RelationSeed = [from: string, to: string, type: RelationType];

type SeriesSeed = {
  slug: string;
  name: string;
  description: string;
  themeColor: string;
  order: number;
  era: string;
  statLabels: Record<"stat1" | "stat2" | "stat3" | "stat4" | "stat5", string>;
  factions: { name: string; color: string }[];
  /** 종류 (화면 순서대로) */
  kinds: string[];
  /** 종류별 카드 배경색 (편이 없는 세계관용) */
  kindColors?: Record<string, string>;
  characters: CharacterSeed[];
  relations: RelationSeed[];
};

const [GENERAL, STRATEGIST, RULER, GOD, HERO, MONSTER] = ["장수", "책사", "군주", "신", "영웅", "괴물"];
const [CHIEF, OUTLAW, TAOIST] = ["두령", "호걸", "도사"];
const { SWORN_BROTHER, LORD, RIVAL, SIBLING, PARENT, MENTOR } = RelationType;

const THREE_KINGDOMS: SeriesSeed = {
  slug: "three-kingdoms",
  name: "삼국지",
  description: "위·촉·오 세 나라 장수들의 대결",
  themeColor: "#58cc02",
  order: 1,
  era: "후한 말",
  statLabels: { stat1: "통솔", stat2: "무력", stat3: "지력", stat4: "정치", stat5: "매력" },
  kinds: [RULER, GENERAL, STRATEGIST],
  factions: [
    { name: "촉", color: "#d7ffb8" },
    { name: "위", color: "#ddf4ff" },
    { name: "오", color: "#ffe2cc" },
    { name: "기타", color: "#fff4cc" },
  ],
  characters: [
    { slug: "guan-yu", name: "관우", title: "미염공", aliases: ["운장", "관운장"], faction: "촉", kind: GENERAL, rarity: 5, stats: [72, 76, 45, 31, 69], summary: "유비, 장비와 형제가 되기로 약속하고 평생 그 약속을 지킨 의리의 장수예요.", biography: "관우는 아주 먼 옛날 중국에 살았던 장수예요. 키가 크고 수염이 길고 멋져서 사람들은 관우를 '미염공'이라고 불렀어요.\n\n어느 봄날, 관우는 유비, 장비와 복숭아 꽃밭에 모여 \"우리는 오늘부터 형제다!\" 하고 약속했어요. 이 약속을 도원결의라고 해요.\n\n한때 조조가 관우에게 좋은 말과 선물을 잔뜩 주며 \"내 편이 되어 줘\" 하고 부탁했지만, 관우는 형님 유비를 잊지 않고 먼 길을 달려 돌아갔어요.\n\n그래서 지금도 사람들은 관우를 의리를 지킨 사람으로 기억하고, 관우를 모시는 사당을 지어 소중히 여겨요.", funFacts: ["관우의 무기는 청룡언월도예요.", "관우가 탄 말은 적토마예요."] },
    { slug: "liu-bei", name: "유비", title: "마음이 따뜻한 임금", aliases: ["현덕"], faction: "촉", kind: RULER, rarity: 4, stats: [44, 41, 43, 47, 76], summary: "백성을 아끼는 마음으로 촉나라를 세운 임금이에요.", biography: "유비는 어릴 때 엄마와 함께 돗자리와 짚신을 만들어 팔며 살았어요.\n\n나라가 어지러워지자 관우, 장비와 형제가 되어 백성을 지키기로 했어요. 처음에는 군사도 땅도 없어서 여러 번 쫓겨 다녔지만, 사람을 아끼는 마음 덕분에 많은 사람이 유비를 따랐어요.\n\n제갈량을 세 번이나 찾아가 모셔 온 뒤, 마침내 촉나라를 세우고 임금이 되었어요.", funFacts: ["유비는 귀가 아주 컸다고 전해져요."] },
    { slug: "zhang-fei", name: "장비", title: "장판교의 호랑이", aliases: ["익덕"], faction: "촉", kind: GENERAL, rarity: 4, stats: [86, 99, 11, 6, 24], summary: "다리 위에서 큰 소리 한 번으로 적군을 멈추게 한 용감한 장수예요." },
    { slug: "zhuge-liang", name: "제갈량", title: "와룡 선생", aliases: ["공명", "제갈공명"], faction: "촉", kind: STRATEGIST, rarity: 4, stats: [58, 10, 67, 62, 58], summary: "깃털 부채를 든 천재 책사. 유비가 세 번이나 찾아가 모셔 왔어요.", biography: "제갈량은 시골에서 농사를 지으며 책을 읽던 젊은이였어요. 사람들은 그를 '누워 있는 용', 와룡이라고 불렀어요.\n\n유비가 세 번이나 찾아와 도와 달라고 부탁하자, 제갈량은 마음을 열고 유비의 책사가 되었어요.\n\n적벽대전에서는 바람의 방향을 미리 알고 작전을 짜서 큰 승리를 도왔어요. 평생 촉나라를 위해 꾀를 내고 열심히 일했어요.", funFacts: ["유비가 세 번 찾아간 이야기를 '삼고초려'라고 해요."] },
    { slug: "zhao-yun", name: "조운", title: "상산의 용", aliases: ["자룡", "조자룡"], faction: "촉", kind: GENERAL, rarity: 4, stats: [62, 68, 43, 31, 49], summary: "적군 한가운데를 뚫고 유비의 아기를 구해 낸 용감한 장수예요." },
    { slug: "ma-chao", name: "마초", title: "비단 같은 장수", aliases: ["맹기"], faction: "촉", kind: GENERAL, rarity: 3, stats: [58, 70, 14, 5, 50], summary: "멋진 갑옷을 입고 말을 잘 타서 '금마초'라고 불렸어요." },
    { slug: "huang-zhong", name: "황충", title: "늙지 않는 명궁", aliases: ["한승"], faction: "촉", kind: GENERAL, rarity: 3, stats: [54, 63, 26, 20, 41], summary: "할아버지가 되어서도 활을 백발백중 쏘았던 장수예요." },
    { slug: "cao-cao", name: "조조", title: "난세의 영웅", aliases: ["맹덕"], faction: "위", kind: RULER, rarity: 5, stats: [67, 38, 61, 65, 67], summary: "꾀가 많고 용감해서 위나라의 기틀을 세운 사람이에요.", biography: "조조는 어릴 때부터 꾀가 많고 행동이 빨랐어요.\n\n나라가 어지러울 때 군사를 모아 북쪽 땅을 하나로 합쳤고, 재능 있는 사람이라면 누구든 아끼고 뽑아 썼어요.\n\n싸움을 잘하는 장군이면서, 멋진 시를 남긴 시인이기도 했어요. 조조가 닦아 놓은 터전 위에 위나라가 세워졌어요.", funFacts: ["조조는 시를 아주 잘 지었어요."] },
    { slug: "sima-yi", name: "사마의", title: "참을성의 책사", aliases: ["중달"], faction: "위", kind: STRATEGIST, rarity: 3, stats: [54, 22, 52, 49, 43], summary: "제갈량과 지혜를 겨룬 위나라의 책사. 꾹 참고 기다리는 데 선수였어요." },
    { slug: "xiahou-dun", name: "하후돈", title: "외눈의 장군", aliases: ["원양"], faction: "위", kind: GENERAL, rarity: 3, stats: [53, 54, 22, 32, 49], summary: "조조를 가장 오래 지킨 든든한 장수예요." },
    { slug: "zhang-liao", name: "장료", title: "합비의 수호자", aliases: ["문원"], faction: "위", kind: GENERAL, rarity: 4, stats: [66, 64, 46, 26, 49], summary: "적은 병사로 많은 적을 막아 낸 위나라의 명장이에요." },
    { slug: "xu-chu", name: "허저", title: "호랑이 바보", aliases: ["중강"], faction: "위", kind: GENERAL, rarity: 2, stats: [28, 62, 9, 5, 25], summary: "힘이 장사여서 조조를 곁에서 지킨 경호 대장이에요." },
    { slug: "sun-quan", name: "손권", title: "강동의 임금", aliases: ["중모"], faction: "오", kind: RULER, rarity: 3, stats: [37, 28, 41, 50, 57], summary: "젊은 나이에 오나라를 이어받아 오래오래 지킨 임금이에요." },
    { slug: "zhou-yu", name: "주유", title: "적벽의 지휘관", aliases: ["공근"], faction: "오", kind: STRATEGIST, rarity: 4, stats: [62, 33, 60, 48, 57], summary: "적벽대전에서 불 공격으로 조조의 큰 배들을 물리쳤어요." },
    { slug: "lu-meng", name: "여몽", title: "공부하는 장수", aliases: ["자명"], faction: "오", kind: GENERAL, rarity: 2, stats: [39, 31, 37, 28, 31], summary: "어른이 되어서 열심히 공부해 지혜로운 장수가 되었어요.", funFacts: ["'괄목상대'라는 말이 여몽 이야기에서 나왔어요."] },
    { slug: "gan-ning", name: "감녕", title: "방울 소리 장수", aliases: ["흥패"], faction: "오", kind: GENERAL, rarity: 2, stats: [41, 50, 29, 5, 21], summary: "허리에 방울을 달고 다녀서 소리만 들어도 알 수 있었대요." },
    { slug: "sun-ce", name: "손책", title: "작은 패왕", aliases: ["백부"], faction: "오", kind: RULER, rarity: 3, stats: [52, 52, 29, 30, 52], summary: "손권의 형. 용감하게 싸워 강동 땅을 얻었어요." },
    { slug: "lu-bu", name: "여포", title: "천하제일 무장", aliases: ["봉선"], faction: "기타", kind: GENERAL, rarity: 5, stats: [100, 100, 18, 5, 43], summary: "삼국지에서 가장 힘이 센 장수. 적토마를 타고 방천화극을 휘둘렀어요." },
    { slug: "dong-zhuo", name: "동탁", title: "욕심쟁이 권력자", aliases: ["중영"], faction: "기타", kind: RULER, rarity: 1, stats: [29, 30, 16, 5, 5], summary: "황제를 마음대로 움직이려 해서 모두가 힘을 모아 맞섰어요." },
    { slug: "yuan-shao", name: "원소", title: "명문가의 대장", aliases: ["본초"], faction: "기타", kind: RULER, rarity: 2, stats: [34, 25, 26, 29, 42], summary: "많은 군사를 가졌지만 관도 싸움에서 조조에게 졌어요." },
  ],
  relations: [
    ["guan-yu", "liu-bei", SWORN_BROTHER],
    ["guan-yu", "zhang-fei", SWORN_BROTHER],
    ["liu-bei", "zhang-fei", SWORN_BROTHER],
    ["zhuge-liang", "liu-bei", LORD],
    ["zhao-yun", "liu-bei", LORD],
    ["ma-chao", "liu-bei", LORD],
    ["huang-zhong", "liu-bei", LORD],
    ["guan-yu", "cao-cao", RIVAL],
    ["zhuge-liang", "sima-yi", RIVAL],
    ["zhuge-liang", "zhou-yu", RIVAL],
    ["sima-yi", "cao-cao", LORD],
    ["xiahou-dun", "cao-cao", LORD],
    ["zhang-liao", "cao-cao", LORD],
    ["xu-chu", "cao-cao", LORD],
    ["sun-quan", "sun-ce", SIBLING],
    ["zhou-yu", "sun-quan", LORD],
    ["lu-meng", "sun-quan", LORD],
    ["gan-ning", "sun-quan", LORD],
    ["lu-bu", "dong-zhuo", LORD],
    ["lu-bu", "zhang-fei", RIVAL],
    ["cao-cao", "yuan-shao", RIVAL],
  ],
};

const GREEK: SeriesSeed = {
  slug: "greek-myth",
  name: "그리스신화",
  description: "올림포스의 신들과 괴물을 물리친 영웅들",
  themeColor: "#ce82ff",
  order: 0,
  era: "신화 시대",
  statLabels: { stat1: "권능", stat2: "힘", stat3: "지혜", stat4: "용기", stat5: "매력" },
  kinds: [GOD, HERO, MONSTER],
  // 편을 두면 종류(신·영웅·괴물)와 겹쳐서, 그리스신화는 편 없이 종류 색으로 카드를 칠합니다.
  kindColors: { [GOD]: "#f3e1ff", [HERO]: "#ddf4ff", [MONSTER]: "#ffe2cc" },
  factions: [],
  characters: [
    { slug: "zeus", name: "제우스", title: "천둥의 신", kind: GOD, rarity: 5, stats: [70, 63, 51, 57, 59], summary: "올림포스 신들의 왕. 하늘을 다스리고 번개를 던져요.", biography: "제우스는 하늘과 번개를 다스리는 신들의 왕이에요.\n\n아주 옛날, 거인 티탄들이 세상을 다스리던 때에 제우스는 형제자매들과 힘을 합쳐 티탄들을 물리쳤어요.\n\n그 뒤 형 포세이돈은 바다를, 하데스는 땅속 세계를 맡고, 제우스는 하늘과 올림포스산을 맡았어요.", funFacts: ["제우스의 상징 동물은 독수리예요."] },
    { slug: "athena", name: "아테나", title: "지혜의 여신", kind: GOD, rarity: 5, stats: [59, 51, 70, 63, 57], summary: "지혜와 전쟁 전략의 여신. 영웅들을 몰래 도와주었어요.", funFacts: ["아테네라는 도시 이름이 아테나에게서 왔어요."] },
    { slug: "poseidon", name: "포세이돈", title: "바다의 신", kind: GOD, rarity: 4, stats: [65, 65, 35, 46, 44], summary: "삼지창을 휘둘러 파도와 지진을 일으키는 바다의 왕이에요." },
    { slug: "hades", name: "하데스", title: "저승의 왕", kind: GOD, rarity: 4, stats: [70, 62, 54, 39, 24], summary: "땅속 세계를 다스리는 신. 무섭게 보이지만 규칙을 잘 지켜요." },
    { slug: "apollo", name: "아폴론", title: "태양과 음악의 신", kind: GOD, rarity: 3, stats: [45, 41, 45, 33, 55], summary: "리라를 연주하고 활을 잘 쏘는 빛나는 신이에요." },
    { slug: "artemis", name: "아르테미스", title: "사냥의 여신", kind: GOD, rarity: 3, stats: [43, 44, 38, 50, 43], summary: "숲과 동물을 지키는 사냥의 여신. 아폴론의 쌍둥이예요." },
    { slug: "hermes", name: "헤르메스", title: "날개 달린 전령", kind: GOD, rarity: 1, stats: [23, 15, 30, 23, 29], summary: "날개 달린 신발로 누구보다 빨리 소식을 전하는 신이에요." },
    { slug: "heracles", name: "헤라클레스", title: "열두 과업의 영웅", kind: HERO, rarity: 5, stats: [50, 79, 28, 76, 61], summary: "어려운 일 열두 가지를 모두 해낸 그리스 최고의 힘센 영웅이에요.", biography: "헤라클레스는 제우스의 아들로, 그리스에서 가장 힘이 센 영웅이에요.\n\n잘못을 갚기 위해 아무도 해낼 수 없을 것 같은 열두 가지 과업을 맡았어요. 사자를 물리치고, 머리가 여러 개인 물뱀 히드라와 싸우고, 하늘을 떠받치기도 했어요.\n\n포기하지 않고 열두 가지를 모두 해낸 헤라클레스는 마침내 신들과 함께 올림포스에서 살게 되었어요.", funFacts: ["아기 때 뱀 두 마리를 맨손으로 물리쳤대요."] },
    { slug: "perseus", name: "페르세우스", title: "메두사를 이긴 영웅", kind: HERO, rarity: 3, stats: [34, 44, 41, 53, 45], summary: "거울 방패로 메두사를 직접 보지 않고 물리쳤어요." },
    { slug: "theseus", name: "테세우스", title: "미궁의 영웅", kind: HERO, rarity: 3, stats: [39, 45, 41, 53, 41], summary: "실타래를 따라 미궁을 빠져나오며 미노타우로스를 물리쳤어요." },
    { slug: "achilles", name: "아킬레우스", title: "가장 빠른 전사", kind: HERO, rarity: 4, stats: [49, 65, 26, 62, 55], summary: "트로이 전쟁에서 가장 강했던 전사. 발뒤꿈치만 약했어요.", funFacts: ["'아킬레스건'이라는 말이 여기서 나왔어요."] },
    { slug: "odysseus", name: "오디세우스", title: "꾀 많은 영웅", kind: HERO, rarity: 2, stats: [33, 28, 43, 34, 32], summary: "트로이 목마 작전을 생각해 낸 지혜로운 영웅이에요." },
    { slug: "medusa", name: "메두사", title: "뱀 머리 괴물", kind: MONSTER, rarity: 2, stats: [30, 41, 26, 21, 8], summary: "머리카락이 뱀이고, 눈을 마주치면 돌로 변하게 만들었어요." },
    { slug: "minotaur", name: "미노타우로스", title: "미궁의 황소", kind: MONSTER, rarity: 3, stats: [29, 95, 7, 40, 5], summary: "황소 머리를 한 괴물. 복잡한 미궁 깊은 곳에 살았어요." },
  ],
  relations: [
    ["athena", "zeus", PARENT],
    ["apollo", "zeus", PARENT],
    ["artemis", "zeus", PARENT],
    ["hermes", "zeus", PARENT],
    ["heracles", "zeus", PARENT],
    ["perseus", "zeus", PARENT],
    ["apollo", "artemis", SIBLING],
    ["zeus", "poseidon", SIBLING],
    ["zeus", "hades", SIBLING],
    ["perseus", "medusa", RIVAL],
    ["theseus", "minotaur", RIVAL],
    ["odysseus", "athena", MENTOR],
    ["perseus", "athena", MENTOR],
  ],
};

const WATER_MARGIN: SeriesSeed = {
  slug: "water-margin",
  name: "수호지",
  description: "양산박에 모인 108 호걸의 의리 이야기",
  themeColor: "#1cb0f6",
  order: 2,
  era: "북송 말",
  statLabels: { stat1: "통솔", stat2: "무력", stat3: "지력", stat4: "의리", stat5: "매력" },
  kinds: [CHIEF, GENERAL, OUTLAW, STRATEGIST, TAOIST],
  // 거의 모두 양산박 사람이라 편 없이 종류 색으로 카드를 칠합니다.
  kindColors: { [CHIEF]: "#fff4cc", [GENERAL]: "#ddf4ff", [OUTLAW]: "#ffe2cc", [STRATEGIST]: "#d7ffb8", [TAOIST]: "#f3e1ff" },
  factions: [],
  characters: [
    { slug: "song-jiang", name: "송강", title: "급시우", aliases: ["공명", "호보의"], kind: CHIEF, rarity: 4, stats: [62, 28, 52, 58, 56], summary: "어려운 사람을 보면 꼭 도와줘서 '때맞춰 내리는 비'라고 불린 양산박의 두령이에요.", biography: "송강은 작은 고을에서 일하던 관리였어요. 키는 작고 얼굴은 까맸지만, 어려운 사람을 보면 돈이든 쌀이든 아낌없이 나눠 주었어요.\n\n그래서 사람들은 송강을 '급시우', 가뭄에 때맞춰 내리는 반가운 비라고 불렀어요.\n\n억울한 일을 당해 쫓기게 된 송강은 양산박이라는 물가 산채로 가게 되었어요. 그곳에는 송강처럼 억울한 일을 겪은 호걸들이 모여 있었고, 모두 송강을 믿고 따랐어요.\n\n송강은 108명의 호걸을 하나로 묶어 양산박의 큰형님이 되었어요.", funFacts: ["양산박에 모인 호걸은 모두 108명이에요.", "송강의 별명 '급시우'는 때맞춰 내리는 비라는 뜻이에요."] },
    { slug: "lu-junyi", name: "노준의", title: "옥기린", kind: CHIEF, rarity: 4, stats: [58, 72, 38, 40, 44], summary: "창술이 뛰어난 부자 어르신. 양산박의 두 번째 두령이 되었어요." },
    { slug: "chao-gai", name: "조개", title: "탁탑천왕", kind: CHIEF, rarity: 3, stats: [52, 50, 34, 48, 30], summary: "양산박의 첫 번째 두령. 송강을 아우처럼 아꼈어요.", funFacts: ["'탁탑천왕'은 탑을 손에 든 하늘의 왕이라는 뜻이에요."] },
    { slug: "lin-chong", name: "임충", title: "표자두", kind: GENERAL, rarity: 5, stats: [74, 92, 40, 52, 30], summary: "80만 군사에게 창 쓰는 법을 가르치던 최고의 창술 사범이에요.", biography: "임충은 나라의 군사 80만 명에게 창 쓰는 법을 가르치던 사범이었어요. 창을 휘두르면 아무도 막지 못했어요.\n\n그런데 높은 벼슬아치 고구가 임충을 미워해서 억울한 누명을 씌웠어요. 임충은 먼 곳으로 쫓겨 가면서도 꾹 참았어요.\n\n끝내 갈 곳이 없어진 임충은 눈 내리는 밤길을 걸어 양산박으로 갔어요. 그 뒤 양산박을 지키는 다섯 호랑이 장수 가운데 한 명이 되었어요.", funFacts: ["임충의 별명 '표자두'는 표범 머리라는 뜻이에요.", "임충이 쓰던 무기는 장팔사모라는 긴 창이에요."] },
    { slug: "guan-sheng", name: "관승", title: "대도", kind: GENERAL, rarity: 4, stats: [66, 80, 36, 44, 30], summary: "삼국지 관우의 후손. 조상처럼 큰 칼을 들고 붉은 말을 탔어요.", funFacts: ["관우처럼 청룡언월도를 썼대요."] },
    { slug: "hua-rong", name: "화영", title: "소이광", kind: GENERAL, rarity: 3, stats: [50, 70, 30, 46, 24], summary: "날아가는 기러기도 맞히는 양산박 최고의 활잡이예요.", funFacts: ["'소이광'은 옛날 활의 명인 이광을 닮았다는 뜻이에요."] },
    { slug: "yang-zhi", name: "양지", title: "청면수", kind: GENERAL, rarity: 3, stats: [52, 64, 30, 30, 16], summary: "얼굴에 푸른 점이 있는 무예 고수. 임충과 싸워 비길 만큼 강했어요." },
    { slug: "zhang-qing", name: "장청", title: "몰우전", kind: GENERAL, rarity: 2, stats: [36, 56, 26, 30, 16], summary: "돌멩이를 던지면 백 번 던져 백 번 맞혔어요.", funFacts: ["'몰우전'은 깃털 없는 화살이라는 뜻이에요. 돌멩이가 화살처럼 날아갔대요."] },
    { slug: "wu-song", name: "무송", title: "호랑이 잡은 행자", kind: OUTLAW, rarity: 5, stats: [44, 96, 36, 74, 30], summary: "고개 위에서 만난 커다란 호랑이를 맨주먹으로 물리친 장사예요.", biography: "무송은 키가 크고 힘이 아주 센 젊은이였어요.\n\n어느 날 경양강이라는 고개를 넘으려는데, 사람들이 \"그 고개에는 무서운 호랑이가 있어요!\" 하고 말렸어요. 무송은 겁내지 않고 고개를 올라갔어요.\n\n정말로 커다란 호랑이가 나타났어요! 들고 있던 몽둥이는 부러졌지만, 무송은 맨주먹으로 호랑이와 싸워 이겼어요.\n\n마을 사람들은 무송을 영웅이라며 크게 반겼고, 무송은 나중에 양산박의 호걸이 되었어요.", funFacts: ["무송이 호랑이를 잡은 고개는 '경양강'이에요.", "나중에는 스님 차림을 해서 '행자'라고 불렸어요."] },
    { slug: "lu-zhishen", name: "노지심", title: "화화상", kind: OUTLAW, rarity: 4, stats: [44, 90, 22, 70, 22], summary: "버드나무를 뿌리째 뽑아 버린 힘센 스님. 약한 사람을 괴롭히는 걸 못 참았어요.", biography: "노지심은 원래 군인이었는데, 억울하게 괴롭힘당하는 사람을 도와주다가 쫓기게 되어 스님이 되었어요.\n\n몸에 꽃무늬 문신이 있어서 '꽃 스님', 화화상이라고 불렸어요.\n\n어느 날 까마귀가 시끄럽게 우는 버드나무를 보고는, 두 팔로 나무를 끌어안아 뿌리째 쑥 뽑아 버렸어요! 구경하던 사람들은 입이 떡 벌어졌어요.\n\n친구 임충이 위험에 빠졌을 때는 몰래 따라가 구해 주었어요.", funFacts: ["노지심의 무기는 아주 무거운 쇠 지팡이예요.", "버드나무를 뽑은 이야기가 가장 유명해요."] },
    { slug: "li-kui", name: "이규", title: "흑선풍", aliases: ["철우"], kind: OUTLAW, rarity: 3, stats: [20, 90, 5, 60, 10], summary: "도끼 두 자루를 들고 까만 회오리바람처럼 달려드는 성미 급한 호걸이에요.", funFacts: ["'흑선풍'은 까만 회오리바람이라는 뜻이에요.", "송강 형님 말이라면 무엇이든 들었어요."] },
    { slug: "yan-qing", name: "연청", title: "낭자", aliases: ["소을"], kind: OUTLAW, ability: "scheme", rarity: 2, stats: [20, 44, 34, 46, 26], summary: "씨름과 피리 솜씨가 최고인 날렵한 젊은이. 노준의를 끝까지 지켰어요." },
    { slug: "dai-zong", name: "대종", title: "신행태보", kind: OUTLAW, ability: "scheme", rarity: 1, stats: [14, 18, 30, 32, 24], summary: "다리에 부적을 붙이면 하루에 800리를 달리는 양산박의 전령이에요.", funFacts: ["800리는 300킬로미터가 넘는 아주 먼 거리예요."] },
    { slug: "wu-yong", name: "오용", title: "지다성", aliases: ["가량"], kind: STRATEGIST, rarity: 4, stats: [56, 16, 90, 46, 40], summary: "꾀가 많은 별이라는 뜻의 '지다성'. 양산박의 작전을 도맡은 선생님이에요." },
    { slug: "gongsun-sheng", name: "공손승", title: "입운룡", kind: TAOIST, rarity: 3, stats: [44, 34, 62, 34, 40], summary: "바람과 비를 부르는 도술을 쓰는 도사예요.", funFacts: ["'입운룡'은 구름 속으로 들어가는 용이라는 뜻이에요."] },
  ],
  relations: [
    ["song-jiang", "chao-gai", LORD],
    ["wu-yong", "song-jiang", LORD],
    ["gongsun-sheng", "chao-gai", LORD],
    ["li-kui", "song-jiang", LORD],
    ["dai-zong", "song-jiang", LORD],
    ["guan-sheng", "song-jiang", LORD],
    ["zhang-qing", "song-jiang", LORD],
    ["yan-qing", "lu-junyi", LORD],
    ["hua-rong", "song-jiang", SWORN_BROTHER],
    ["lu-zhishen", "lin-chong", SWORN_BROTHER],
    ["lin-chong", "yang-zhi", RIVAL],
  ],
};

const CHU_HAN: SeriesSeed = {
  slug: "chu-han",
  name: "초한지",
  description: "유방과 항우, 천하를 두고 겨룬 두 영웅",
  themeColor: "#ff9600",
  order: 3,
  era: "진나라 말",
  statLabels: { stat1: "통솔", stat2: "무력", stat3: "지력", stat4: "정치", stat5: "매력" },
  kinds: [RULER, GENERAL, STRATEGIST],
  factions: [
    { name: "한", color: "#ffe2cc" },
    { name: "초", color: "#f3e1ff" },
    { name: "진", color: "#ddf4ff" },
    { name: "기타", color: "#fff4cc" },
  ],
  characters: [
    { slug: "liu-bang", name: "유방", title: "한 고조", aliases: ["계"], faction: "한", kind: RULER, rarity: 4, stats: [52, 30, 40, 58, 76], summary: "시골 마을 관리에서 시작해 한나라를 세운 첫 황제예요.", biography: "유방은 작은 마을에서 일하던 평범한 사람이었어요. 공부도 싸움도 아주 뛰어나지는 않았지만, 사람을 좋아하고 잘 믿어 주었어요.\n\n진나라가 백성을 힘들게 하자 유방은 친구들과 함께 일어섰어요. 그리고 힘센 항우와 오랫동안 천하를 두고 겨루었어요.\n\n여러 번 졌지만 포기하지 않았고, 한신·장량·소하처럼 훌륭한 사람들이 유방을 도왔어요.\n\n마침내 항우를 이기고 한나라를 세웠어요. 지금 중국 사람을 '한족', 중국 글자를 '한자'라고 부르는 것도 이 한나라에서 왔어요.", funFacts: ["'한자'라는 이름이 유방이 세운 한나라에서 왔어요."] },
    { slug: "xiang-yu", name: "항우", title: "서초패왕", aliases: ["적"], faction: "초", kind: RULER, ability: "charge", rarity: 5, stats: [96, 100, 30, 10, 54], summary: "무거운 솥을 번쩍 들어 올릴 만큼 힘이 셌던 초나라의 왕이에요.", biography: "항우는 어릴 때부터 키가 크고 힘이 아주 셌어요. 무거운 솥을 혼자 번쩍 들어 올렸다고 해요.\n\n싸움터에 나가면 언제나 맨 앞에서 달렸고, 항우를 이길 장수는 아무도 없었어요. 그래서 스스로를 '서초패왕'이라고 불렀어요.\n\n하지만 다른 사람의 말을 잘 듣지 않아서, 함께하던 사람들이 하나둘 떠나갔어요.\n\n마지막 싸움에서 사방에서 초나라 노래가 들려오자, 항우는 친구들이 모두 떠났다고 생각하며 슬퍼했어요. 이 이야기에서 '사면초가'라는 말이 나왔어요.", funFacts: ["'사면초가'는 사방이 모두 적이라는 뜻이에요.", "항우가 탄 말의 이름은 오추마예요."] },
    { slug: "qin-shi-huang", name: "진시황", title: "첫 번째 황제", aliases: ["영정"], faction: "진", kind: RULER, rarity: 4, stats: [60, 30, 60, 76, 30], summary: "여러 나라를 하나로 합치고 처음으로 '황제'라는 이름을 쓴 왕이에요.", funFacts: ["진시황 무덤에는 흙으로 빚은 병사 인형, 병마용이 수천 개나 있어요.", "글자와 돈, 길이 재는 단위를 하나로 맞췄어요."] },
    { slug: "chen-sheng", name: "진승", title: "처음 일어선 농부", faction: "기타", kind: RULER, rarity: 1, stats: [30, 30, 20, 14, 24], summary: "농부였지만 \"왕이 될 사람이 따로 있나!\" 하고 맨 먼저 진나라에 맞섰어요." },
    { slug: "han-xin", name: "한신", title: "국사무쌍", faction: "한", kind: GENERAL, rarity: 5, stats: [100, 70, 80, 22, 20], summary: "군사를 많이 맡길수록 더 잘 싸웠던 천재 장군이에요.", biography: "한신은 젊을 때 가난해서 밥도 제대로 못 먹었어요. 동네 불량배가 \"내 다리 밑으로 기어가라!\" 하고 놀렸을 때도, 큰 꿈을 위해 꾹 참았어요.\n\n처음에는 항우 밑에 있었지만 아무도 알아주지 않았어요. 유방에게 간 뒤, 소하가 한신의 재능을 알아보고 대장군으로 추천했어요.\n\n한신은 강을 등지고 진을 치는 '배수진'처럼 아무도 생각 못 한 작전으로 싸울 때마다 이겼어요. 그리고 마지막에 항우를 물리쳤어요.", funFacts: ["'배수진'은 강을 등지고 물러설 곳 없이 싸운다는 뜻이에요.", "\"군사는 많을수록 좋다\"는 '다다익선'이 한신의 말이에요."] },
    { slug: "fan-kuai", name: "번쾌", title: "홍문연의 용사", faction: "한", kind: GENERAL, ability: "charge", rarity: 3, stats: [46, 80, 16, 30, 40], summary: "잔치 자리에서 위험에 빠진 유방을 방패를 들고 뛰어 들어가 구했어요." },
    { slug: "xiahou-ying", name: "하후영", title: "수레를 모는 장수", faction: "한", kind: GENERAL, ability: "charge", rarity: 2, stats: [38, 46, 30, 30, 24], summary: "유방의 수레를 몰며 위험할 때마다 유방을 태우고 빠져나왔어요." },
    { slug: "ying-bu", name: "영포", title: "구강왕", aliases: ["경포"], faction: "한", kind: GENERAL, rarity: 3, stats: [58, 72, 28, 26, 20], summary: "처음엔 항우 편이었다가 유방 편으로 온 날쌘 장수예요." },
    { slug: "zhongli-mo", name: "종리매", title: "초나라의 맹장", faction: "초", kind: GENERAL, rarity: 3, stats: [56, 66, 36, 24, 26], summary: "항우를 끝까지 도운 초나라의 용감한 장수예요.", funFacts: ["한신과 어릴 적 친구였대요."] },
    { slug: "ji-bu", name: "계포", title: "약속을 지키는 장수", faction: "초", kind: GENERAL, rarity: 2, stats: [40, 50, 30, 22, 26], summary: "한 번 한 약속은 꼭 지켜서 모두가 믿었던 장수예요.", funFacts: ["'계포의 약속 한 번이 황금 백 근보다 낫다'는 말이 있어요."] },
    { slug: "zhang-liang", name: "장량", title: "한나라의 꾀주머니", aliases: ["자방"], faction: "한", kind: STRATEGIST, rarity: 5, stats: [50, 20, 98, 66, 56], summary: "천막 안에서 작전을 짜서 천 리 밖 싸움을 이기게 한 책사예요.", biography: "장량은 젊을 때 다리 위에서 신발을 떨어뜨린 할아버지를 만났어요. 할아버지가 \"주워 와라\" 하자, 장량은 공손하게 신발을 주워 신겨 드렸어요.\n\n할아버지는 장량을 기특하게 여겨 귀한 병법책을 주었어요. 장량은 그 책을 열심히 공부했어요.\n\n나중에 유방의 책사가 된 장량은, 항우가 연 위험한 잔치 '홍문연'에서 유방을 무사히 빠져나오게 도왔어요.\n\n유방은 \"천막 안에서 작전을 짜서 천 리 밖 싸움을 이기는 사람은 장량이다\" 하고 칭찬했어요.", funFacts: ["유방은 한신·장량·소하를 '세 사람의 영웅'이라고 불렀어요."] },
    { slug: "xiao-he", name: "소하", title: "든든한 살림꾼", faction: "한", kind: STRATEGIST, rarity: 4, stats: [40, 10, 70, 88, 44], summary: "군사들이 배고프지 않도록 쌀과 물건을 꼬박꼬박 보낸 한나라의 재상이에요.", funFacts: ["떠나려던 한신을 밤새 쫓아가 데려온 사람이 소하예요."] },
    { slug: "chen-ping", name: "진평", title: "여섯 가지 꾀", faction: "한", kind: STRATEGIST, rarity: 3, stats: [40, 20, 78, 40, 30], summary: "위기 때마다 기발한 꾀를 여섯 번이나 내서 유방을 구했어요." },
    { slug: "fan-zeng", name: "범증", title: "항우의 할아버지 책사", aliases: ["아부"], faction: "초", kind: STRATEGIST, rarity: 4, stats: [46, 14, 90, 50, 30], summary: "항우가 아버지처럼 모신 나이 많은 책사. 장량과 꾀를 겨루었어요." },
  ],
  relations: [
    ["han-xin", "liu-bang", LORD],
    ["zhang-liang", "liu-bang", LORD],
    ["xiao-he", "liu-bang", LORD],
    ["fan-kuai", "liu-bang", LORD],
    ["xiahou-ying", "liu-bang", LORD],
    ["chen-ping", "liu-bang", LORD],
    ["ying-bu", "liu-bang", LORD],
    ["fan-zeng", "xiang-yu", LORD],
    ["zhongli-mo", "xiang-yu", LORD],
    ["ji-bu", "xiang-yu", LORD],
    ["liu-bang", "xiang-yu", RIVAL],
    ["han-xin", "xiang-yu", RIVAL],
    ["zhang-liang", "fan-zeng", RIVAL],
    ["han-xin", "xiao-he", MENTOR],
  ],
};

export const SEED_SERIES: SeriesSeed[] = [GREEK, THREE_KINGDOMS, WATER_MARGIN, CHU_HAN];

/** 시드 데이터를 넣고 행 수를 돌려줍니다. 어떤 드라이버 어댑터의 PrismaClient든 받을 수 있습니다. */
export async function seed(db: PrismaClient) {
  // upsert는 내부적으로 트랜잭션을 쓰므로, HTTP 드라이버에서도 돌도록 조회 후 생성/수정합니다.
  for (const s of SEED_SERIES) {
    const seriesData = {
      name: s.name,
      description: s.description,
      themeColor: s.themeColor,
      statLabels: s.statLabels,
      order: s.order,
    };
    const existingSeries = await db.series.findUnique({ where: { slug: s.slug } });
    const series = existingSeries
      ? await db.series.update({ where: { id: existingSeries.id }, data: seriesData })
      : await db.series.create({ data: { slug: s.slug, ...seriesData } });

    const factionIds = new Map<string, string>();
    for (const f of s.factions) {
      const existing = await db.faction.findUnique({
        where: { seriesId_name: { seriesId: series.id, name: f.name } },
      });
      const faction = existing
        ? await db.faction.update({ where: { id: existing.id }, data: { color: f.color } })
        : await db.faction.create({ data: { seriesId: series.id, name: f.name, color: f.color } });
      factionIds.set(f.name, faction.id);
    }

    const kindIds = new Map<string, string>();
    for (const [order, name] of s.kinds.entries()) {
      const existing = await db.characterKind.findUnique({
        where: { seriesId_name: { seriesId: series.id, name } },
      });
      const kind = existing
        ? await db.characterKind.update({ where: { id: existing.id }, data: { order, color: s.kindColors?.[name] ?? null } })
        : await db.characterKind.create({ data: { seriesId: series.id, name, order, color: s.kindColors?.[name] ?? null } });
      kindIds.set(name, kind.id);
    }

    for (const c of s.characters) {
      const [stat1, stat2, stat3, stat4, stat5] = c.stats;
      const kindId = kindIds.get(c.kind);
      if (!kindId) throw new Error(`종류 시드 오류: ${c.slug} → ${c.kind}`);
      const aliases = c.aliases ?? [];
      const data = {
        seriesId: series.id,
        factionId: c.faction ? (factionIds.get(c.faction) ?? null) : null,
        name: c.name,
        originalName: null,
        title: c.title,
        aliases,
        searchText: buildSearchText({ name: c.name, aliases, title: c.title }),
        choseong: toChoseong(c.name),
        kindId,
        rarity: c.rarity,
        stat1,
        stat2,
        stat3,
        stat4,
        stat5,
        summary: c.summary,
        biography: c.biography ?? c.summary,
        funFacts: c.funFacts ?? [],
        era: s.era,
        ability: c.ability ?? null,
        published: true,
      };
      const existing = await db.character.findUnique({ where: { slug: c.slug }, select: { id: true } });
      if (existing) {
        await db.character.update({ where: { id: existing.id }, data });
      } else {
        await db.character.create({ data: { slug: c.slug, ...data } });
      }
    }
  }

  // 관계: 같은 세계관의 slug로 연결합니다.
  for (const s of SEED_SERIES) {
    const ids = new Map(
      (await db.character.findMany({
        where: { series: { slug: s.slug } },
        select: { id: true, slug: true },
      })).map((c) => [c.slug, c.id]),
    );
    for (const [from, to, type] of s.relations) {
      const fromId = ids.get(from);
      const toId = ids.get(to);
      if (!fromId || !toId) throw new Error(`관계 시드 오류: ${from} → ${to}`);
      const exists = await db.relation.findUnique({ where: { fromId_toId_type: { fromId, toId, type } } });
      if (!exists) await db.relation.create({ data: { fromId, toId, type } });
    }
  }

  const [series, factions, characters] = await Promise.all([
    db.series.count(),
    db.faction.count(),
    db.character.count(),
  ]);
  return { series, factions, characters };
}

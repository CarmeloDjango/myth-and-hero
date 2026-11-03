/**
 * 시드 데이터 (예시): 삼국지 20명, 그리스신화 14명
 * 능력치는 예시 값입니다(삼국지는 코에이 수치를 참고한 근사치).
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
  originalName: string;
  title: string;
  aliases?: string[];
  faction: string;
  /** 세계관의 kinds 중 하나 */
  kind: string;
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
  characters: CharacterSeed[];
  relations: RelationSeed[];
};

const [GENERAL, STRATEGIST, RULER, GOD, HERO, MONSTER] = ["장수", "책사", "군주", "신", "영웅", "괴물"];
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
    { slug: "guan-yu", name: "관우", originalName: "關羽", title: "미염공", aliases: ["운장", "관운장"], faction: "촉", kind: GENERAL, rarity: 5, stats: [95, 97, 75, 62, 93], summary: "유비, 장비와 형제가 되기로 약속하고 평생 그 약속을 지킨 의리의 장수예요.", biography: "관우는 아주 먼 옛날 중국에 살았던 장수예요. 키가 크고 수염이 길고 멋져서 사람들은 관우를 '미염공'이라고 불렀어요.\n\n어느 봄날, 관우는 유비, 장비와 복숭아 꽃밭에 모여 \"우리는 오늘부터 형제다!\" 하고 약속했어요. 이 약속을 도원결의라고 해요.\n\n한때 조조가 관우에게 좋은 말과 선물을 잔뜩 주며 \"내 편이 되어 줘\" 하고 부탁했지만, 관우는 형님 유비를 잊지 않고 먼 길을 달려 돌아갔어요.\n\n그래서 지금도 사람들은 관우를 의리를 지킨 사람으로 기억하고, 관우를 모시는 사당을 지어 소중히 여겨요.", funFacts: ["관우의 무기는 청룡언월도예요.", "관우가 탄 말은 적토마예요."] },
    { slug: "liu-bei", name: "유비", originalName: "劉備", title: "마음이 따뜻한 임금", aliases: ["현덕"], faction: "촉", kind: RULER, rarity: 5, stats: [75, 73, 74, 78, 99], summary: "백성을 아끼는 마음으로 촉나라를 세운 임금이에요.", biography: "유비는 어릴 때 엄마와 함께 돗자리와 짚신을 만들어 팔며 살았어요.\n\n나라가 어지러워지자 관우, 장비와 형제가 되어 백성을 지키기로 했어요. 처음에는 군사도 땅도 없어서 여러 번 쫓겨 다녔지만, 사람을 아끼는 마음 덕분에 많은 사람이 유비를 따랐어요.\n\n제갈량을 세 번이나 찾아가 모셔 온 뒤, 마침내 촉나라를 세우고 임금이 되었어요.", funFacts: ["유비는 귀가 아주 컸다고 전해져요."] },
    { slug: "zhang-fei", name: "장비", originalName: "張飛", title: "장판교의 호랑이", aliases: ["익덕"], faction: "촉", kind: GENERAL, rarity: 4, stats: [85, 98, 30, 22, 45], summary: "다리 위에서 큰 소리 한 번으로 적군을 멈추게 한 용감한 장수예요." },
    { slug: "zhuge-liang", name: "제갈량", originalName: "諸葛亮", title: "와룡 선생", aliases: ["공명", "제갈공명"], faction: "촉", kind: STRATEGIST, rarity: 5, stats: [92, 38, 100, 95, 92], summary: "깃털 부채를 든 천재 책사. 유비가 세 번이나 찾아가 모셔 왔어요.", biography: "제갈량은 시골에서 농사를 지으며 책을 읽던 젊은이였어요. 사람들은 그를 '누워 있는 용', 와룡이라고 불렀어요.\n\n유비가 세 번이나 찾아와 도와 달라고 부탁하자, 제갈량은 마음을 열고 유비의 책사가 되었어요.\n\n적벽대전에서는 바람의 방향을 미리 알고 작전을 짜서 큰 승리를 도왔어요. 평생 촉나라를 위해 꾀를 내고 열심히 일했어요.", funFacts: ["유비가 세 번 찾아간 이야기를 '삼고초려'라고 해요."] },
    { slug: "zhao-yun", name: "조운", originalName: "趙雲", title: "상산의 용", aliases: ["자룡", "조자룡"], faction: "촉", kind: GENERAL, rarity: 5, stats: [91, 96, 76, 65, 81], summary: "적군 한가운데를 뚫고 유비의 아기를 구해 낸 용감한 장수예요." },
    { slug: "ma-chao", name: "마초", originalName: "馬超", title: "비단 같은 장수", aliases: ["맹기"], faction: "촉", kind: GENERAL, rarity: 4, stats: [88, 97, 44, 26, 82], summary: "멋진 갑옷을 입고 말을 잘 타서 '금마초'라고 불렸어요." },
    { slug: "huang-zhong", name: "황충", originalName: "黃忠", title: "늙지 않는 명궁", aliases: ["한승"], faction: "촉", kind: GENERAL, rarity: 4, stats: [86, 93, 60, 52, 75], summary: "할아버지가 되어서도 활을 백발백중 쏘았던 장수예요." },
    { slug: "cao-cao", name: "조조", originalName: "曹操", title: "난세의 영웅", aliases: ["맹덕"], faction: "위", kind: RULER, rarity: 5, stats: [96, 72, 91, 94, 96], summary: "꾀가 많고 용감해서 위나라의 기틀을 세운 사람이에요.", biography: "조조는 어릴 때부터 꾀가 많고 행동이 빨랐어요.\n\n나라가 어지러울 때 군사를 모아 북쪽 땅을 하나로 합쳤고, 재능 있는 사람이라면 누구든 아끼고 뽑아 썼어요.\n\n싸움을 잘하는 장군이면서, 멋진 시를 남긴 시인이기도 했어요. 조조가 닦아 놓은 터전 위에 위나라가 세워졌어요.", funFacts: ["조조는 시를 아주 잘 지었어요."] },
    { slug: "sima-yi", name: "사마의", originalName: "司馬懿", title: "참을성의 책사", aliases: ["중달"], faction: "위", kind: STRATEGIST, rarity: 4, stats: [98, 63, 96, 93, 87], summary: "제갈량과 지혜를 겨룬 위나라의 책사. 꾹 참고 기다리는 데 선수였어요." },
    { slug: "xiahou-dun", name: "하후돈", originalName: "夏侯惇", title: "외눈의 장군", aliases: ["원양"], faction: "위", kind: GENERAL, rarity: 4, stats: [89, 90, 58, 70, 86], summary: "조조를 가장 오래 지킨 든든한 장수예요." },
    { slug: "zhang-liao", name: "장료", originalName: "張遼", title: "합비의 수호자", aliases: ["문원"], faction: "위", kind: GENERAL, rarity: 4, stats: [93, 92, 78, 58, 80], summary: "적은 병사로 많은 적을 막아 낸 위나라의 명장이에요." },
    { slug: "xu-chu", name: "허저", originalName: "許褚", title: "호랑이 바보", aliases: ["중강"], faction: "위", kind: GENERAL, rarity: 3, stats: [65, 96, 36, 20, 60], summary: "힘이 장사여서 조조를 곁에서 지킨 경호 대장이에요." },
    { slug: "sun-quan", name: "손권", originalName: "孫權", title: "강동의 임금", aliases: ["중모"], faction: "오", kind: RULER, rarity: 4, stats: [76, 67, 80, 89, 95], summary: "젊은 나이에 오나라를 이어받아 오래오래 지킨 임금이에요." },
    { slug: "zhou-yu", name: "주유", originalName: "周瑜", title: "적벽의 지휘관", aliases: ["공근"], faction: "오", kind: STRATEGIST, rarity: 5, stats: [97, 71, 96, 86, 93], summary: "적벽대전에서 불 공격으로 조조의 큰 배들을 물리쳤어요." },
    { slug: "lu-meng", name: "여몽", originalName: "呂蒙", title: "공부하는 장수", aliases: ["자명"], faction: "오", kind: GENERAL, rarity: 3, stats: [91, 81, 89, 78, 82], summary: "어른이 되어서 열심히 공부해 지혜로운 장수가 되었어요.", funFacts: ["'괄목상대'라는 말이 여몽 이야기에서 나왔어요."] },
    { slug: "gan-ning", name: "감녕", originalName: "甘寧", title: "방울 소리 장수", aliases: ["흥패"], faction: "오", kind: GENERAL, rarity: 3, stats: [86, 94, 72, 30, 62], summary: "허리에 방울을 달고 다녀서 소리만 들어도 알 수 있었대요." },
    { slug: "sun-ce", name: "손책", originalName: "孫策", title: "작은 패왕", aliases: ["백부"], faction: "오", kind: RULER, rarity: 4, stats: [92, 92, 69, 70, 92], summary: "손권의 형. 용감하게 싸워 강동 땅을 얻었어요." },
    { slug: "lu-bu", name: "여포", originalName: "呂布", title: "천하제일 무장", aliases: ["봉선"], faction: "기타", kind: GENERAL, rarity: 5, stats: [87, 100, 26, 13, 40], summary: "삼국지에서 가장 힘이 센 장수. 적토마를 타고 방천화극을 휘둘렀어요." },
    { slug: "dong-zhuo", name: "동탁", originalName: "董卓", title: "욕심쟁이 권력자", aliases: ["중영"], faction: "기타", kind: RULER, rarity: 2, stats: [84, 86, 64, 18, 22], summary: "황제를 마음대로 움직이려 해서 모두가 힘을 모아 맞섰어요." },
    { slug: "yuan-shao", name: "원소", originalName: "袁紹", title: "명문가의 대장", aliases: ["본초"], faction: "기타", kind: RULER, rarity: 3, stats: [80, 69, 70, 74, 90], summary: "많은 군사를 가졌지만 관도 싸움에서 조조에게 졌어요." },
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
  factions: [
    { name: "올림포스", color: "#f3e1ff" },
    { name: "영웅", color: "#ddf4ff" },
    { name: "괴물", color: "#ffe2cc" },
  ],
  characters: [
    { slug: "zeus", name: "제우스", originalName: "Ζεύς", title: "천둥의 신", faction: "올림포스", kind: GOD, rarity: 5, stats: [100, 95, 85, 90, 92], summary: "올림포스 신들의 왕. 하늘을 다스리고 번개를 던져요.", biography: "제우스는 하늘과 번개를 다스리는 신들의 왕이에요.\n\n아주 옛날, 거인 티탄들이 세상을 다스리던 때에 제우스는 형제자매들과 힘을 합쳐 티탄들을 물리쳤어요.\n\n그 뒤 형 포세이돈은 바다를, 하데스는 땅속 세계를 맡고, 제우스는 하늘과 올림포스산을 맡았어요.", funFacts: ["제우스의 상징 동물은 독수리예요."] },
    { slug: "athena", name: "아테나", originalName: "Ἀθηνᾶ", title: "지혜의 여신", faction: "올림포스", kind: GOD, rarity: 5, stats: [92, 85, 100, 95, 90], summary: "지혜와 전쟁 전략의 여신. 영웅들을 몰래 도와주었어요.", funFacts: ["아테네라는 도시 이름이 아테나에게서 왔어요."] },
    { slug: "poseidon", name: "포세이돈", originalName: "Ποσειδῶν", title: "바다의 신", faction: "올림포스", kind: GOD, rarity: 5, stats: [95, 96, 70, 80, 78], summary: "삼지창을 휘둘러 파도와 지진을 일으키는 바다의 왕이에요." },
    { slug: "hades", name: "하데스", originalName: "Ἅιδης", title: "저승의 왕", faction: "올림포스", kind: GOD, rarity: 4, stats: [94, 88, 82, 70, 55], summary: "땅속 세계를 다스리는 신. 무섭게 보이지만 규칙을 잘 지켜요." },
    { slug: "apollo", name: "아폴론", originalName: "Ἀπόλλων", title: "태양과 음악의 신", faction: "올림포스", kind: GOD, rarity: 4, stats: [88, 84, 88, 75, 98], summary: "리라를 연주하고 활을 잘 쏘는 빛나는 신이에요." },
    { slug: "artemis", name: "아르테미스", originalName: "Ἄρτεμις", title: "사냥의 여신", faction: "올림포스", kind: GOD, rarity: 4, stats: [85, 86, 80, 92, 85], summary: "숲과 동물을 지키는 사냥의 여신. 아폴론의 쌍둥이예요." },
    { slug: "hermes", name: "헤르메스", originalName: "Ἑρμῆς", title: "날개 달린 전령", faction: "올림포스", kind: GOD, rarity: 4, stats: [80, 65, 94, 80, 90], summary: "날개 달린 신발로 누구보다 빨리 소식을 전하는 신이에요." },
    { slug: "heracles", name: "헤라클레스", originalName: "Ἡρακλῆς", title: "열두 과업의 영웅", faction: "영웅", kind: HERO, rarity: 5, stats: [80, 100, 60, 98, 88], summary: "어려운 일 열두 가지를 모두 해낸 그리스 최고의 힘센 영웅이에요.", biography: "헤라클레스는 제우스의 아들로, 그리스에서 가장 힘이 센 영웅이에요.\n\n잘못을 갚기 위해 아무도 해낼 수 없을 것 같은 열두 가지 과업을 맡았어요. 사자를 물리치고, 머리가 여러 개인 물뱀 히드라와 싸우고, 하늘을 떠받치기도 했어요.\n\n포기하지 않고 열두 가지를 모두 해낸 헤라클레스는 마침내 신들과 함께 올림포스에서 살게 되었어요.", funFacts: ["아기 때 뱀 두 마리를 맨손으로 물리쳤대요."] },
    { slug: "perseus", name: "페르세우스", originalName: "Περσεύς", title: "메두사를 이긴 영웅", faction: "영웅", kind: HERO, rarity: 4, stats: [75, 85, 82, 95, 86], summary: "거울 방패로 메두사를 직접 보지 않고 물리쳤어요." },
    { slug: "theseus", name: "테세우스", originalName: "Θησεύς", title: "미궁의 영웅", faction: "영웅", kind: HERO, rarity: 4, stats: [82, 88, 84, 94, 84], summary: "실타래를 따라 미궁을 빠져나오며 미노타우로스를 물리쳤어요." },
    { slug: "achilles", name: "아킬레우스", originalName: "Ἀχιλλεύς", title: "가장 빠른 전사", faction: "영웅", kind: HERO, rarity: 5, stats: [85, 98, 62, 96, 90], summary: "트로이 전쟁에서 가장 강했던 전사. 발뒤꿈치만 약했어요.", funFacts: ["'아킬레스건'이라는 말이 여기서 나왔어요."] },
    { slug: "odysseus", name: "오디세우스", originalName: "Ὀδυσσεύς", title: "꾀 많은 영웅", faction: "영웅", kind: HERO, rarity: 4, stats: [86, 80, 99, 88, 85], summary: "트로이 목마 작전을 생각해 낸 지혜로운 영웅이에요." },
    { slug: "medusa", name: "메두사", originalName: "Μέδουσα", title: "뱀 머리 괴물", faction: "괴물", kind: MONSTER, rarity: 3, stats: [60, 70, 55, 50, 30], summary: "머리카락이 뱀이고, 눈을 마주치면 돌로 변하게 만들었어요." },
    { slug: "minotaur", name: "미노타우로스", originalName: "Μινώταυρος", title: "미궁의 황소", faction: "괴물", kind: MONSTER, rarity: 3, stats: [50, 92, 25, 60, 15], summary: "황소 머리를 한 괴물. 복잡한 미궁 깊은 곳에 살았어요." },
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

export const SEED_SERIES: SeriesSeed[] = [GREEK, THREE_KINGDOMS];

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
        ? await db.characterKind.update({ where: { id: existing.id }, data: { order } })
        : await db.characterKind.create({ data: { seriesId: series.id, name, order } });
      kindIds.set(name, kind.id);
    }

    for (const c of s.characters) {
      const [stat1, stat2, stat3, stat4, stat5] = c.stats;
      const kindId = kindIds.get(c.kind);
      if (!kindId) throw new Error(`종류 시드 오류: ${c.slug} → ${c.kind}`);
      const aliases = c.aliases ?? [];
      const data = {
        seriesId: series.id,
        factionId: factionIds.get(c.faction) ?? null,
        name: c.name,
        originalName: c.originalName,
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

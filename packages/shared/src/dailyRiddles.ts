export const DAILY_RIDDLE_POINTS = 15;

export type DailyRiddlePlayStatus = 'open' | 'won' | 'missed';

export type DailyRiddleCat = 'pic' | 'odd' | 'idiom' | 'math' | 'logic';

export type RiddleVisualPart = {
  text: string;
  size?: 's' | 'm' | 'l';
};

export type RiddleVisual =
  | { kind: 'grid3' }
  | { kind: 'triangles' }
  | { kind: 'row'; parts: RiddleVisualPart[] }
  | { kind: 'stack'; parts: RiddleVisualPart[] }
  | { kind: 'bag'; emoji: string }
  | { kind: 'forest'; hidden: string };

export interface DailyRiddleEntry {
  id: string;
  cat: DailyRiddleCat;
  prompt: string;
  extra?: string;
  visual?: RiddleVisual;
  hint: string;
  answer: string;
  alts?: string[];
  why: string;
  choices: string[];
}

export interface KidDailyRiddle {
  date: string;
  id: string;
  cat: DailyRiddleCat;
  prompt: string;
  extra?: string;
  visual?: RiddleVisual;
  choices: string[];
  points: number;
  status: DailyRiddlePlayStatus;
  attempts: number;
  hint?: string;
  why?: string;
  answer?: string;
}

export interface ParentDailyRiddleKid {
  kidId: string;
  date: string;
  id: string;
  cat: DailyRiddleCat;
  prompt: string;
  extra?: string;
  visual?: RiddleVisual;
  points: number;
  status: DailyRiddlePlayStatus;
  kid?: { displayName: string; avatar: string };
  why?: string;
  answer?: string;
}

export function normalizeRiddleGuess(value: string): string {
  return value
    .trim()
    .replace(/[״"׳'`]/g, '')
    .replace(/[−–—]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function riddleGuessMatches(entry: DailyRiddleEntry, guess: string): boolean {
  const normalized = normalizeRiddleGuess(guess);
  if (!normalized) return false;
  const answers = [entry.answer, ...(entry.alts ?? [])].map(normalizeRiddleGuess);
  return answers.includes(normalized);
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const arr = [...items];
  let s = seed >>> 0 || 1;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const current = arr[i];
    arr[i] = arr[j] as T;
    arr[j] = current as T;
  }
  return arr;
}

/** Unused riddles first; a solved riddle never returns until the pool is empty. */
export const DAILY_RIDDLES: DailyRiddleEntry[] = [
  {
    id: 'sq14',
    cat: 'pic',
    prompt: 'כמה ריבועים יש בתמונה?',
    visual: { kind: 'grid3' },
    hint: 'אל תספרו רק את הקטנים. יש גם ריבועים של 2×2 ושל 3×3.',
    answer: '14',
    why: '9 קטנים + 4 בינוניים (2×2) + 1 גדול.',
    choices: ['9', '10', '14', '16'],
  },
  {
    id: 'beit-sefer',
    cat: 'pic',
    prompt: 'איזה ביטוי מסתתר בתמונה?',
    visual: {
      kind: 'row',
      parts: [
        { text: 'בית', size: 'm' },
        { text: '+', size: 's' },
        { text: '📖', size: 'l' },
      ],
    },
    hint: 'שתי מילים שנצמדות בחיי בית ספר.',
    answer: 'בית ספר',
    alts: ['בית-ספר', 'ביתספר'],
    why: 'בית + ספר.',
    choices: ['בית ספר', 'ספר בית', 'חדר ספרים', 'שיעור בית'],
  },
  {
    id: 'tri4',
    cat: 'pic',
    prompt: 'כמה משולשים?',
    visual: { kind: 'triangles' },
    hint: 'יש קטנים, ויש אחד שיושב על השניים התחתונים.',
    answer: '4',
    why: '3 משולשים קטנים + המשולש הגדול שנוצר מהמבנה כולו.',
    choices: ['3', '4', '5', '6'],
  },
  {
    id: 'yam-tichon',
    cat: 'pic',
    prompt: 'איזה ביטוי?',
    visual: {
      kind: 'stack',
      parts: [
        { text: 'תיכון', size: 'm' },
        { text: 'ים', size: 'l' },
      ],
    },
    hint: 'ים ששוחים בו בקיץ, עם «ה».',
    answer: 'הים התיכון',
    alts: ['ים התיכון', 'ים תיכון'],
    why: 'ים מתחת לתיכון → הים התיכון.',
    choices: ['הים התיכון', 'ים תיכון', 'תיכון ימי', 'ים גדול'],
  },
  {
    id: 'seq-shape',
    cat: 'pic',
    prompt: 'מה חסר בהמשך?',
    extra: '○  □  ○  □  ○  ?',
    hint: 'לא צבע — צורה.',
    answer: '□',
    alts: ['ריבוע', 'מרובע'],
    why: 'עיגול, ריבוע, עיגול, ריבוע…',
    choices: ['○', '□', '△', '☆'],
  },
  {
    id: 'odd-prime',
    cat: 'odd',
    prompt: 'מה יוצא הדופן?',
    extra: '3,  5,  7,  9,  11',
    hint: 'לא «הכי גדול». תחשבו מה אפשר לחלק.',
    answer: '9',
    why: 'כל השאר ראשוניים. 9 מתחלק ב־3.',
    choices: ['3', '7', '9', '11'],
  },
  {
    id: 'odd-squares',
    cat: 'odd',
    prompt: 'מה יוצא הדופן?',
    extra: '16,  25,  36,  49,  64,  81,  99',
    hint: 'שורש ריבועי.',
    answer: '99',
    why: 'כל השאר ריבועים מושלמים (4²…9²). 99 לא.',
    choices: ['16', '49', '81', '99'],
  },
  {
    id: 'odd-palindrome',
    cat: 'odd',
    prompt: 'מה יוצא הדופן?',
    extra: 'שמש,  תות,  אבא,  נגן,  דלת',
    hint: 'קראו גם מהסוף להתחלה.',
    answer: 'דלת',
    why: 'כל השאר פלינדרום. דלת הפוך זה תלד.',
    choices: ['שמש', 'תות', 'אבא', 'דלת'],
  },
  {
    id: 'odd-months',
    cat: 'odd',
    prompt: 'מה יוצא הדופן?',
    extra: 'אפריל,  יוני,  ספטמבר,  נובמבר,  אוגוסט',
    hint: 'כמה ימים בחודש.',
    answer: 'אוגוסט',
    why: 'לאפריל/יוני/ספטמבר/נובמבר יש 30 ימים. לאוגוסט 31.',
    choices: ['אפריל', 'יוני', 'ספטמבר', 'אוגוסט'],
  },
  {
    id: 'odd-3d',
    cat: 'odd',
    prompt: 'מה יוצא הדופן?',
    extra: 'עיגול,  משולש,  ריבוע,  מלבן,  כדור',
    hint: 'שטוח מול לא-שטוח.',
    answer: 'כדור',
    why: 'כל השאר צורות דו-ממדיות. כדור הוא תלת-ממד.',
    choices: ['עיגול', 'משולש', 'מלבן', 'כדור'],
  },
  {
    id: 'odd-doubles',
    cat: 'odd',
    prompt: 'מה יוצא הדופן?',
    extra: '11,  22,  33,  44,  55,  66,  77,  88,  90',
    hint: 'שתי ספרות זהות.',
    answer: '90',
    why: 'כל השאר מספר כפול-ספרה (אותה ספרה פעמיים).',
    choices: ['11', '55', '88', '90'],
  },
  {
    id: 'idiom-birds',
    cat: 'idiom',
    prompt: 'איזה ביטוי מסתתר?',
    visual: {
      kind: 'stack',
      parts: [
        { text: '🐦 🐦', size: 'l' },
        { text: '🔨', size: 'l' },
      ],
    },
    hint: 'פתרון לשתי בעיות בבת אחת.',
    answer: 'שתי ציפורים במכה אחת',
    alts: ['שתי ציפורים במכה', 'לתפוס שתי ציפורים במכה אחת'],
    why: 'שתי ציפורים ומכה (פטיש).',
    choices: ['שתי ציפורים במכה אחת', 'ציפור אחת ביד', 'ציפור מוקדמת', 'מכה על הראש'],
  },
  {
    id: 'idiom-eggs',
    cat: 'idiom',
    prompt: 'איזה ביטוי?',
    visual: {
      kind: 'row',
      parts: [
        { text: '🧺', size: 'l' },
        { text: '🥚🥚🥚🥚', size: 'm' },
      ],
    },
    hint: 'סיכון — הכול במקום אחד.',
    answer: 'לשים את כל הביצים בסל אחד',
    alts: ['כל הביצים בסל אחד', 'לא לשים את כל הביצים בסל אחד'],
    why: 'כל הביצים באותו סל.',
    choices: [
      'לשים את כל הביצים בסל אחד',
      'ביצה על ביצה',
      'תרנגולת וביצה',
      'סל ריק',
    ],
  },
  {
    id: 'idiom-forest',
    cat: 'idiom',
    prompt: 'איזה ביטוי?',
    visual: { kind: 'forest', hidden: 'בית' },
    hint: 'מרוב פרטים לא רואים את התמונה.',
    answer: 'לא רואים את היער מרוב עצים',
    alts: ['לא רואים את היער', 'מרוב עצים לא רואים את היער'],
    why: 'הבית כמעט נבלע בין העצים — אי אפשר לראות את העיקר.',
    choices: [
      'לא רואים את היער מרוב עצים',
      'עץ בודד ביער',
      'בית ביער',
      'יער עד',
    ],
  },
  {
    id: 'idiom-end',
    cat: 'idiom',
    prompt: 'איזה ביטוי?',
    visual: {
      kind: 'row',
      parts: [
        { text: 'סוף', size: 'm' },
        { text: '————————', size: 's' },
        { text: 'עולם', size: 'm' },
      ],
    },
    hint: 'הקצה הכי רחוק.',
    answer: 'סוף העולם',
    alts: ['עד סוף העולם'],
    why: 'המילה סוף בהתחלה, עולם בסוף.',
    choices: ['סוף העולם', 'סוף הסיפור', 'קצה העולם', 'עולם הפוך'],
  },
  {
    id: 'idiom-cat',
    cat: 'idiom',
    prompt: 'איזה ביטוי?',
    visual: { kind: 'bag', emoji: '🐱' },
    hint: 'קונים בלי לבדוק.',
    answer: 'חתול בשק',
    alts: ['לקנות חתול בשק'],
    why: 'החתול בתוך השק.',
    choices: ['חתול בשק', 'חתול שחור', 'שק תפוחים', 'חתול על הגג'],
  },
  {
    id: 'idiom-heart',
    cat: 'idiom',
    prompt: 'איזה ביטוי?',
    visual: { kind: 'stack', parts: [{ text: '💔', size: 'l' }] },
    hint: 'רגש אחרי פרידה.',
    answer: 'לב שבור',
    alts: ['לב שבור לי'],
    why: 'הלב עצמו שבור.',
    choices: ['לב שבור', 'לב זהב', 'לב אבן', 'לב פתוח'],
  },
  {
    id: 'idiom-eye',
    cat: 'idiom',
    prompt: 'איזה ביטוי?',
    visual: {
      kind: 'row',
      parts: [
        { text: '👁️', size: 'l' },
        { text: 'ב', size: 'm' },
        { text: '👁️', size: 'l' },
      ],
    },
    hint: 'לשלם באותו מטבע, פנים אל פנים.',
    answer: 'עין בעין',
    alts: ['עין תחת עין'],
    why: 'עין, האות ב, עין.',
    choices: ['עין בעין', 'עין הרע', 'עין אחת', 'לפקוח עין'],
  },
  {
    id: 'math-eights',
    cat: 'math',
    prompt: 'איך מגיעים ל־6 רק עם שלושה 8?',
    extra: '8   8   8   =   6',
    hint: 'שורש שלישי, לא חיבור רגיל.',
    answer: 'שורש שלישי של 8, שלוש פעמים',
    alts: ['∛8 + ∛8 + ∛8 = 6', '2+2+2', 'שורש שלישי של 8 ועוד שורש שלישי של 8 ועוד שורש שלישי של 8'],
    why: 'שורש שלישי של 8 הוא 2. שלוש פעמים 2 = 6.',
    choices: [
      'שורש שלישי של 8, שלוש פעמים',
      '8 + 8 − 10',
      '8 ÷ 8 + 8 − 3',
      '(8 + 8) ÷ 8',
    ],
  },
  {
    id: 'math-100',
    cat: 'math',
    prompt: 'השתמשו במספרים 1 עד 9 לפי הסדר, ורק + ו־, כדי לקבל 100.',
    extra: '123  45  67  89  =  100',
    hint: 'יש חיבור אחד וחיסורים.',
    answer: '123 − 45 − 67 + 89',
    alts: ['123-45-67+89', '123 - 45 - 67 + 89 = 100'],
    why: '123 − 45 = 78, 78 − 67 = 11, 11 + 89 = 100.',
    choices: [
      '123 − 45 − 67 + 89',
      '123 + 45 − 67 − 1',
      '12 + 3 + 4 + 5 − 6 − 7 + 89',
      '123 − 45 − 67 − 89',
    ],
  },
  {
    id: 'math-pattern',
    cat: 'math',
    prompt: 'אם 1 + 4 = 5,  2 + 5 = 12,  3 + 6 = 21  — אז 5 + 8 = ?',
    hint: 'כל שורה משתמשת גם בכפל מוסתר, לא רק בחיבור.',
    answer: '45',
    why: 'a × b + a:  5×8 + 5 = 45.',
    choices: ['13', '40', '45', '48'],
  },
  {
    id: 'math-cats',
    cat: 'math',
    prompt: '3 חתולים תופסים 3 עכברים ב־3 דקות. כמה זמן ייקח ל־100 חתולים לתפוס 100 עכברים?',
    hint: 'הם עובדים במקביל, לא בתור.',
    answer: '3 דקות',
    alts: ['3', 'שלוש דקות'],
    why: 'כל חתול תופס עכבר אחד ב־3 דקות. מאה חתולים = מאה עכברים באותו זמן.',
    choices: ['3 דקות', '100 דקות', '1 דקה', '300 דקות'],
  },
  {
    id: 'math-fives',
    cat: 'math',
    prompt: 'מלאו את החסר:  (5 × 5 + 5) ÷ 5 = ?',
    extra: '5  5  5  5  =  6',
    hint: 'הסדר: כפל, חיבור, חילוק.',
    answer: '6',
    why: '(25 + 5) ÷ 5 = 6. ארבעה חמשים נותנים שש.',
    choices: ['1', '5', '6', '10'],
  },
  {
    id: 'math-nines',
    cat: 'math',
    prompt: 'כמה פעמים מופיעה הספרה 9 במספרים מ־1 עד 100?',
    hint: 'אל תשכחו את 90 עד 99 — שם יש הרבה תשעות.',
    answer: '20',
    why: '9,19…89 = 9 פעמים. ב־90–99: עשר תשעות בעשרות + עוד אחת ב־99 = 11. סה״כ 20.',
    choices: ['10', '19', '20', '21'],
  },
  {
    id: 'logic-sisters',
    cat: 'logic',
    prompt: 'לארבע אחיות יש אח אחד. כמה ילדים יש במשפחה?',
    hint: 'האח לא מתחלק לארבעה אחים שונים.',
    answer: '5',
    alts: ['חמש', 'חמישה'],
    why: 'ארבע בנות + בן אחד משותף לכולן.',
    choices: ['4', '5', '8', '9'],
  },
  {
    id: 'logic-snowman',
    cat: 'logic',
    prompt: 'בחדר סגור מצאו שלולית מים, כובע וצעיף. מי היה בחדר?',
    hint: 'מישהו שהמים היו פעם הגוף שלו.',
    answer: 'איש שלג',
    alts: ['איש-שלג', 'שלג'],
    why: 'הוא נמס. נשארו המים והבגדים.',
    choices: ['איש שלג', 'שחיין', 'גנן', 'צייר'],
  },
  {
    id: 'logic-28days',
    cat: 'logic',
    prompt: 'באיזה חודש יש 28 ימים?',
    hint: 'פברואר הוא התשובה שכולם ממהרים אליה.',
    answer: 'בכולם',
    alts: ['בכל החודשים', 'כל החודשים', 'כולם'],
    why: 'לכל חודש יש לפחות 28 ימים.',
    choices: ['פברואר', 'בכולם', 'ינואר', 'אף אחד'],
  },
  {
    id: 'logic-letters',
    cat: 'logic',
    prompt: 'מה האות הבאה?',
    extra: 'א, ש, ש, א, ח, ש, ש, ?',
    hint: 'תחשבו איך אומרים מספרים בעברית.',
    answer: 'ש',
    alts: ['שי״ן', 'שין'],
    why: 'האות הראשונה: אחת, שתיים, שלוש, ארבע, חמש, שש, שבע, שמונה.',
    choices: ['א', 'ב', 'ח', 'ש'],
  },
  {
    id: 'logic-apples',
    cat: 'logic',
    prompt: 'שני אבות ושני בנים חילקו שלושה תפוחים, לכל אחד תפוח שלם. איך?',
    hint: 'לא ארבעה אנשים.',
    answer: 'סבא, אבא ובן',
    alts: ['סבא אבא ובן', 'שלושה דורות', 'סבא אבא בן'],
    why: 'שלושה אנשים בלבד: הסבא הוא אב, האבא הוא גם בן וגם אב, והנכד הוא בן.',
    choices: ['סבא, אבא ובן', 'חתכו לשניים', 'אחד ויתר', 'יש תפוח רביעי'],
  },
];

export const DAILY_RIDDLE_POINTS = 15;

export type DailyRiddlePlayStatus = 'open' | 'won' | 'missed' | 'appealed';

/** Kid asked a parent to accept an answer that was right, but not the exact wording. */
export type DailyRiddleAppeal = 'pending' | 'rejected';

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
  /** The answer the kid submitted, once the riddle is no longer open. */
  guess?: string;
  /** Set when the kid appealed a miss, until a parent accepts it (then status is won). */
  appeal?: DailyRiddleAppeal;
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
  /** Kid's submitted answer, present on an appeal. */
  guess?: string;
  appeal?: DailyRiddleAppeal;
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
    id: 'logic-fruits',
    cat: 'logic',
    prompt: 'אבא של נועה קורא לחמש בנותיו לפי שמות של פירות: תות, תמר, תאנה, תפוח. איך קוראים לבת החמישית?',
    hint: 'כל שמות הפירות מתחילים באותה אות. «נועה» היא הפתיח, לא שם של פרי.',
    answer: 'תפוז',
    alts: ['התפוז'],
    why: 'תות, תמר, תאנה, תפוח — וגם תפוז. כולם מתחילים ב־ת.',
    choices: ['נועה', 'תפוז', 'אפרסק', 'מנגו'],
  },
  {
    id: 'logic-hippo',
    cat: 'logic',
    prompt: 'כמה יש בתוך היפופוטם?',
    extra: 'בתוך פיל יש 3\nבתוך ג׳ירפה יש 5\nבתוך צב יש 2',
    hint: 'לא המשקל. סופרים את האותיות שבמילה.',
    answer: '8',
    alts: ['שמונה'],
    why: 'פיל = 3 אותיות, ג׳ירפה = 5, צב = 2. בהיפופוטם יש 8 אותיות.',
    choices: ['4', '6', '8', '9'],
  },
  {
    id: 'logic-levi',
    cat: 'logic',
    prompt: 'במשפחת לוי יש 6 אחים בנים, ולכל אח יש אחות אחת בדיוק. כמה ילדים יש בסך הכל במשפחה?',
    hint: 'האחות לא מתחלקת לשש אחיות שונות.',
    answer: '7',
    alts: ['שבע', 'שבעה'],
    why: 'שישה בנים + אחות אחת משותפת לכולם.',
    choices: ['6', '7', '12', '13'],
  },
];

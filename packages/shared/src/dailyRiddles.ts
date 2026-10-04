export const DAILY_RIDDLE_POINTS = 15;

export type DailyRiddlePlayStatus = 'open' | 'won' | 'missed' | 'appealed';

/** Kid asked a parent to accept an answer that was right, but not the exact wording. */
export type DailyRiddleAppeal = 'pending' | 'rejected';

export type DailyRiddleCat = 'pic' | 'odd' | 'idiom' | 'math' | 'logic' | 'word';

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
    hint: 'רשומים רק ארבעה פירות. השם החמישי כבר נאמר בשאלה.',
    answer: 'נועה',
    why: 'תות, תמר, תאנה ותפוח הן ארבע בנות. הבת החמישית היא נועה — «אבא של נועה». תפוז הוא המלכודת.',
    choices: ['תפוז', 'אפרסק', 'נועה', 'מנגו'],
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
  {
    id: 'logic-train',
    cat: 'logic',
    prompt: 'רכבת חשמלית נוסעת דרומה, והרוח נושבת צפונה. לאן עף העשן?',
    hint: 'אל תחשבו על הרוח. תבדקו אם יש עשן בכלל.',
    answer: 'אין עשן',
    why: 'רכבת חשמלית לא שורפת דלק, אז אין עשן שיעוף.',
    choices: ['צפונה', 'דרומה', 'נשאר במקום', 'אין עשן'],
  },
  {
    id: 'logic-stairs',
    cat: 'logic',
    prompt: 'בית ורוד בן קומה אחת. הקירות ורודים, הרצפה ורודה, והמנורות ורודות. באיזה צבע המדרגות?',
    hint: 'כמה קומות יש בבית?',
    answer: 'אין מדרגות',
    why: 'בבית בן קומה אחת אין מדרגות.',
    choices: ['ורוד', 'לבן', 'שקוף', 'אין מדרגות'],
  },
  {
    id: 'logic-everest',
    cat: 'logic',
    prompt: 'לפני שגילו את האוורסט, מה היה ההר הגבוה בעולם?',
    hint: 'גילוי לא משנה את הגובה.',
    answer: 'האוורסט',
    alts: ['אוורסט', 'הר האוורסט'],
    why: 'האוורסט היה ההר הגבוה גם לפני שמישהו מדד אותו.',
    choices: ['החרמון', 'האוורסט', 'הקילימנג׳רו', 'לא היה הר כזה'],
  },
  {
    id: 'logic-empty',
    cat: 'logic',
    prompt: 'כמה ביצים אפשר לאכול על בטן ריקה?',
    hint: 'מה קורה לבטן אחרי הביצה הראשונה?',
    answer: 'ביצה אחת',
    alts: ['אחת', '1', 'ביצה 1'],
    why: 'אחרי ביצה אחת הבטן כבר לא ריקה.',
    choices: ['ביצה אחת', 'עשר ביצים', 'כמה שרוצים', 'אף ביצה'],
  },
  {
    id: 'logic-rooster',
    cat: 'logic',
    prompt: 'תרנגול עומד על קצה גג משולש ומטיל ביצה. לאיזה צד היא מתגלגלת?',
    hint: 'לפני הצד, תבדקו מי עומד על הגג.',
    answer: 'תרנגול לא מטיל',
    alts: ['אין ביצה', 'תרנגול לא מטיל ביצה'],
    why: 'תרנגול הוא זכר. אין ביצה, אז אין לה צד.',
    choices: ['ימינה', 'שמאלה', 'נשארת למעלה', 'תרנגול לא מטיל'],
  },
  {
    id: 'logic-moses',
    cat: 'logic',
    prompt: 'כמה חיות מכל מין משה הכניס לתיבה?',
    hint: 'מי באמת בנה את התיבה?',
    answer: 'אפס',
    alts: ['0', 'אף אחת', 'כלום'],
    why: 'משה לא הכניס חיות לתיבה. נוח הכניס.',
    choices: ['2', '1', 'אפס', '7'],
  },
  {
    id: 'math-step3',
    cat: 'math',
    prompt: 'מה המספר הבא?',
    extra: '5,  8,  11,  14,  ?',
    hint: 'ההפרש בין שכנים קבוע.',
    answer: '17',
    why: 'מוסיפים 3 בכל פעם: 14 + 3 = 17.',
    choices: ['15', '16', '17', '18'],
  },
  {
    id: 'math-double',
    cat: 'math',
    prompt: 'מה המספר הבא?',
    extra: '2,  4,  8,  16,  ?',
    hint: 'כל מספר גדול פי 2 מקודמו.',
    answer: '32',
    why: 'כל מספר כפול מהקודם. 16 × 2 = 32.',
    choices: ['18', '20', '24', '32'],
  },
  {
    id: 'math-squares',
    cat: 'math',
    prompt: 'מה המספר הבא?',
    extra: '1,  4,  9,  16,  25,  ?',
    hint: '1×1, 2×2, 3×3…',
    answer: '36',
    why: 'אלה ריבועים: 1² עד 5², והבא הוא 6² = 36.',
    choices: ['30', '35', '36', '49'],
  },
  {
    id: 'math-fib',
    cat: 'math',
    prompt: 'מה המספר הבא?',
    extra: '1,  1,  2,  3,  5,  8,  ?',
    hint: 'חברו את שני המספרים האחרונים.',
    answer: '13',
    why: 'כל מספר הוא סכום שני הקודמים: 5 + 8 = 13.',
    choices: ['11', '12', '13', '16'],
  },
  {
    id: 'math-gaps',
    cat: 'math',
    prompt: 'מה המספר הבא?',
    extra: '2,  6,  12,  20,  30,  ?',
    hint: 'ההפרש בין שכנים גדל בכל פעם.',
    answer: '42',
    why: 'ההפרשים: +4, +6, +8, +10, ואז +12. 30 + 12 = 42.',
    choices: ['36', '40', '42', '44'],
  },
  {
    id: 'math-cubes',
    cat: 'math',
    prompt: 'מה המספר הבא?',
    extra: '1,  8,  27,  64,  ?',
    hint: '1×1×1, 2×2×2, 3×3×3…',
    answer: '125',
    why: 'אלה חזקות שלישיות: 1³, 2³, 3³, 4³, ואז 5³ = 125.',
    choices: ['81', '100', '125', '216'],
  },
  {
    id: 'math-weave',
    cat: 'math',
    prompt: 'מה המספר הבא?',
    extra: '1,  10,  2,  9,  3,  8,  ?',
    hint: 'יש כאן שתי סדרות שמשולבות לסירוגין.',
    answer: '4',
    why: 'סדרה אחת עולה: 1, 2, 3, 4. השנייה יורדת: 10, 9, 8.',
    choices: ['4', '5', '7', '9'],
  },
  {
    id: 'math-primes',
    cat: 'math',
    prompt: 'מה המספר הבא?',
    extra: '2,  3,  5,  7,  11,  ?',
    hint: 'מספר שמתחלק רק ב-1 ובעצמו.',
    answer: '13',
    why: 'אלה המספרים הראשוניים. אחרי 11 בא 13.',
    choices: ['12', '13', '14', '15'],
  },
  {
    id: 'math-order',
    cat: 'math',
    prompt: 'על הלוח רשום התרגיל 4 + 6 × 2. כמה יוצא התרגיל?',
    hint: 'כפל לפני חיבור.',
    answer: '16',
    why: 'קודם 6 × 2 = 12, ואז 4 + 12 = 16.',
    choices: ['10', '12', '16', '20'],
  },
  {
    id: 'math-pencil',
    cat: 'math',
    prompt: 'דנה קנתה עיפרון ומחק, ושילמה עליהם יחד 11 שקלים. העיפרון עלה 10 שקלים יותר מהמחק. כמה שילמה על המחק?',
    hint: 'ההפרש הוא 10, והסכום הוא 11.',
    answer: 'חצי שקל',
    alts: ['0.5', '½', 'חצי'],
    why: 'מחק בחצי שקל ועיפרון ב-10.5 יוצאים יחד 11. מחק בשקל היה נותן סכום 12.',
    choices: ['שקל', 'חצי שקל', 'שקל וחצי', '10 שקלים'],
  },
  {
    id: 'math-lily',
    cat: 'math',
    prompt: 'בבריכה יש צמח שכל יום מכפיל את השטח שהוא מכסה. ביום העשרים הצמח מכסה את כל הבריכה. באיזה יום הוא כיסה בדיוק חצי ממנה?',
    hint: 'אם מחר הוא כפול, אתמול הוא היה חצי.',
    answer: 'יום 19',
    alts: ['19', 'היום ה-19'],
    why: 'הוא מכפיל את עצמו כל יום, אז יום לפני הכיסוי המלא הוא בדיוק חצי.',
    choices: ['יום 10', 'יום 15', 'יום 18', 'יום 19'],
  },
  {
    id: 'math-fingers',
    cat: 'math',
    prompt: 'ביד אחת יש חמש אצבעות. אם סופרים עשר ידיים כאלה, כמה אצבעות יש בהן יחד?',
    hint: 'סופרים אצבעות, לא זוגות ידיים.',
    answer: '50',
    why: '10 ידיים × 5 אצבעות = 50.',
    choices: ['10', '20', '50', '100'],
  },
  {
    id: 'math-bus',
    cat: 'math',
    prompt: 'באוטובוס ישבו 12 ילדים כשיצא לדרך. בתחנה הראשונה ירדו 4 ילדים ועלו 7. בתחנה השנייה ירדו 5 ילדים ועלו 2. כמה ילדים יושבים באוטובוס עכשיו?',
    hint: 'תחנה אחרי תחנה: קודם יורדים, אחר כך עולים.',
    answer: '12',
    why: '12 − 4 + 7 = 15, ואז 15 − 5 + 2 = 12.',
    choices: ['8', '10', '12', '16'],
  },
  {
    id: 'math-snail',
    cat: 'math',
    prompt: 'חילזון מטפס החוצה מבור שעמוקו 10 מטר. בכל יום הוא עולה 3 מטר, ובכל לילה הוא מחליק 2 מטר למטה. בכמה ימים הוא יוצא מהבור?',
    hint: 'ביום שהוא מגיע לקצה הוא לא מחליק חזרה.',
    answer: '8',
    alts: ['שמונה', '8 ימים'],
    why: 'כל יום ולילה הוא מתקדם מטר, עד 7 מטר. ביום השמיני הוא מטפס 3 ומגיע ל-10.',
    choices: ['5', '7', '8', '10'],
  },
  {
    id: 'math-corners',
    cat: 'math',
    prompt: 'בחדר יש ארבע פינות, ובכל פינה יושבת חתולה אחת. כל חתולה רואה מולה עוד שלוש חתולות. כמה חתולות יש בחדר?',
    hint: 'כל חתולה רואה את האחרות, לא חתולות חדשות.',
    answer: '4',
    alts: ['ארבע', 'ארבעה'],
    why: 'יש 4 חתולות. כל אחת רואה את שלוש האחרות.',
    choices: ['4', '7', '12', '16'],
  },
  {
    id: 'math-shake',
    cat: 'math',
    prompt: 'חמישה חברים נפגשו, וכל אחד לחץ יד לכל אחד מהאחרים פעם אחת. כמה לחיצות יד היו בסך הכול?',
    hint: 'לחיצה בין שני חברים נספרת פעם אחת, לא פעמיים.',
    answer: '10',
    why: 'כל זוג לוחץ פעם אחת: 5 × 4 ÷ 2 = 10.',
    choices: ['5', '10', '20', '25'],
  },
  {
    id: 'math-age',
    cat: 'math',
    prompt: 'לדנה יש היום 6 שנים, ולאמא שלה יש 30. בעוד כמה שנים הגיל של האמא יהיה בדיוק פי שניים מהגיל של דנה?',
    hint: 'הפרש הגילאים נשאר 24. מחפשים מתי 24 הוא בדיוק הגיל של דנה.',
    answer: '18',
    why: 'עוד 18 שנה לדנה יהיו 24 ולאמא 48. 48 הוא פי 2 מ-24.',
    choices: ['6', '12', '18', '24'],
  },
  {
    id: 'math-sale',
    cat: 'math',
    prompt: 'אחרי הנחה של 20 אחוז, חולצה עולה 80 שקל. כמה עלתה החולצה לפני ההנחה?',
    hint: '80 שקל הם 80% מהמחיר, לא 80 פחות 20.',
    answer: '100',
    alts: ['100 שקל', 'מאה'],
    why: '80 ÷ 0.8 = 100. הנחה של 20% מ-100 היא 20, ונשאר 80.',
    choices: ['60', '64', '96', '100'],
  },
  {
    id: 'math-legs',
    cat: 'math',
    prompt: 'בחצר מסתובבות 4 תרנגולות ו-3 כלבים. כמה רגליים יש לכל החיות האלה יחד?',
    hint: 'לתרנגולת שתי רגליים, לכלב ארבע.',
    answer: '20',
    why: '4 × 2 + 3 × 4 = 20.',
    choices: ['14', '16', '20', '28'],
  },
  {
    id: 'math-sum10',
    cat: 'math',
    prompt: 'חברו את כל המספרים מאחת עד עשר, מ-1 ועד 10. כמה יוצא הסכום?',
    hint: 'תחברו זוגות מהקצוות: 1 עם 10, 2 עם 9.',
    answer: '55',
    why: 'חמישה זוגות של 11: 1+10, 2+9, 3+8, 4+7, 5+6.',
    choices: ['45', '50', '55', '100'],
  },
  {
    id: 'word-shalosh',
    cat: 'word',
    prompt: 'המילה שלוש אומרת את המספר 3. כמה אותיות כתובות במילה עצמה?',
    hint: 'תספרו את האותיות שעל הדף, לא את המספר שהמילה אומרת.',
    answer: '4',
    alts: ['ארבע', 'ארבעה'],
    why: 'ש, ל, ו, ש. ארבע אותיות, גם כשהמילה אומרת שלוש.',
    choices: ['3', '4', '5', '6'],
  },
  {
    id: 'word-lachan',
    cat: 'word',
    prompt: 'בתוך המילה שולחן מסתתרת מילה שקשורה למוזיקה. מה המילה המסתתרת?',
    hint: 'חפשו שלוש אותיות רצופות באמצע המילה.',
    answer: 'לחן',
    why: 'האותיות ל, ח, נ יושבות ברצף בתוך שולחן, והמילה היא לחן.',
    choices: ['שיר', 'לחן', 'פסנתר', 'תו'],
  },
  {
    id: 'word-reshet',
    cat: 'word',
    prompt: 'בתוך המילה מברשת מסתתרת מילה של דבר שתופסים איתו דגים. מה המילה המסתתרת?',
    hint: 'תסתכלו על שלוש האותיות האחרונות.',
    answer: 'רשת',
    why: 'שלוש האותיות האחרונות של מברשת הן ר, ש, ת.',
    choices: ['חכה', 'רשת', 'דג', 'ים'],
  },
  {
    id: 'word-rak',
    cat: 'word',
    prompt: 'אם מסדרים מחדש את האותיות של המילה קר, מתקבלת מילה אחרת. מה המילה?',
    hint: 'אותן שתי אותיות, בסדר הפוך.',
    answer: 'רק',
    why: 'ק ו-ר מתהפכות ל-ר ו-ק, ויוצאת המילה רק.',
    choices: ['רק', 'קיר', 'רך', 'קרח'],
  },
  {
    id: 'word-dvash',
    cat: 'word',
    prompt: 'מוסיפים את האות ש׳ לסוף המילה דב, בלי למחוק שום אות. איזו מילה מתוקה יוצאת?',
    hint: 'האות מצטרפת לסוף. אף אות לא מתחלפת.',
    answer: 'דבש',
    why: 'דב ועוד ש׳ בסוף נותנות את המילה דבש.',
    choices: ['דבש', 'דבק', 'דוב', 'סוכר'],
  },
  {
    id: 'word-ayin',
    cat: 'word',
    prompt: 'יש אות בעברית שהשם שלה הוא גם איבר בגוף, זה שרואים בעזרתו. מה שם האות?',
    hint: 'השם של האות ע הוא גם איבר.',
    answer: 'עין',
    alts: ['עי״ן', 'עיי״ן'],
    why: 'האות ע נקראת עין, ועין היא גם האיבר שרואים בעזרתו.',
    choices: ['אלף', 'בית', 'עין', 'למד'],
  },
  {
    id: 'word-delet',
    cat: 'word',
    prompt: 'האות דל״ת נשמעת כמו מילה של הדבר שפותחים כדי להיכנס הביתה. מה המילה?',
    hint: 'האות ד נקראת כמעט כמו המילה.',
    answer: 'דלת',
    why: 'האות ד נקראת דל״ת, והמילה דלת היא מה שפותחים בכניסה.',
    choices: ['דלת', 'חלון', 'שער', 'בית'],
  },
  {
    id: 'word-simcha',
    cat: 'word',
    prompt: 'קחו רק את האות הראשונה של כל מילה: שמש, מים, חלון, הורה. איזו מילה יוצאת מהאותיות האלה?',
    hint: 'ארבע אותיות ראשונות, לפי הסדר.',
    answer: 'שמחה',
    why: 'ש מש, מ ים, ח לון, ה ורה מצטרפות למילה שמחה.',
    choices: ['שמחה', 'שלום', 'שמש', 'מחלה'],
  },
  {
    id: 'word-anashim',
    cat: 'word',
    prompt: 'מה צורת הרבים של המילה איש?',
    hint: 'זו לא פשוט המילה איש עם הסיומת ים.',
    answer: 'אנשים',
    why: 'לא אומרים אישים. כשיש הרבה, אומרים אנשים.',
    choices: ['אישים', 'אנשים', 'אישות', 'אישאים'],
  },
  {
    id: 'word-banot',
    cat: 'word',
    prompt: 'איך אומרים את המספר 3 כשמדברים על בנות?',
    hint: 'בנות זו לשון נקבה, והמספר מותאם אליה.',
    answer: 'שלוש',
    why: 'אומרים שלוש בנות. שלושה נאמר עם בנים: שלושה בנים.',
    choices: ['שלוש', 'שלושה', 'שלושים', 'שלישי'],
  },
];

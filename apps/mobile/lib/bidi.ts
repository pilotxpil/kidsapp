/**
 * Math is written left to right in Hebrew too ("47 × 6 = ?"), but inside
 * right-to-left text the Unicode bidi algorithm reorders spaced or ×/÷
 * expressions into "? = 6 × 47". `ltrMath` wraps each expression (or a whole
 * line with no Hebrew/Arabic letters) in a left-to-right embedding so it keeps
 * its written order on web, Hebrew-locale phones and LTR-locale phones alike.
 *
 * Expressions that are part of a sentence read in Hebrew order are left alone:
 * one glued to a Hebrew prefix ("32 לחלק ל-4 = 8") or one that follows an
 * operator written in words in the same clause ("4 ילדים × 2 = 8").
 *
 * The marks are invisible. Use it only for display, never on text that is sent
 * to the server or compared with an answer.
 */
const LRE = '‪';
const PDF = '‬';

const RTL_LETTER = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const HAS_MATH = /[\d=×÷+−]/;
const FRACTIONS = '½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒';
const POWERS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** A number (12, 3.5, 7:15, 3/4, 2¾, 3², 50%, √64), a lone fraction, or a blank (?, ___). */
const OPERAND = `(?:√?\\d+(?:[.,:/]\\d+)*[${FRACTIONS}]?[${POWERS}]*%?|[${FRACTIONS}]|\\?|_+)`;
const TERM = `\\(*${OPERAND}\\)*`;
/** ":" divides only when spaced ("12 : 3"); "7:15" is a time and "ב־2: …" is punctuation. */
const OPERATOR = `(?:\\s*[-+−×÷*=<>≤≥≠·]\\s*|\\s+:\\s+)`;
const EXPRESSION = new RegExp(`${TERM}(?:${OPERATOR}${TERM})+`, 'g');

/** Separate instance for use inside the replacer (a shared global regex keeps `lastIndex` state). */
const EARLIER_EXPRESSION = new RegExp(EXPRESSION.source, 'g');

/** "ל-4", "מ־24": the first number belongs to the Hebrew word before it ("ו-" is just "and"). */
const GLUED_TO_HEBREW = /[א-הז-ת][-־]?$/;
const CLAUSE_BREAK = /[;!?…→\n]|[.,:](?=\s|$)/;
const OPERATOR_IN_WORDS = /[×÷+−*·<>≤≥≠]/;

function readsInHebrewOrder(before: string): boolean {
  if (GLUED_TO_HEBREW.test(before)) return true;
  const clause = (before.split(CLAUSE_BREAK).pop() ?? '').replace(EARLIER_EXPRESSION, ' ');
  return OPERATOR_IN_WORDS.test(clause);
}

export function ltrMath(text: string): string;
export function ltrMath(text: string | null | undefined): string | null | undefined;
export function ltrMath(text: string | null | undefined): string | null | undefined {
  if (!text) return text;
  if (!RTL_LETTER.test(text)) return HAS_MATH.test(text) ? LRE + text + PDF : text;
  return text.replace(EXPRESSION, (expr: string, offset: number) =>
    readsInHebrewOrder(text.slice(0, offset)) ? expr : LRE + expr + PDF
  );
}

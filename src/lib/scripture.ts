/**
 * Scripture Reference Utility
 *
 * Detects Bible verse references in text and provides auto-expand,
 * multiple translations, discussion questions, and formatted verse cards.
 *
 * Supported formats:
 *   - John 3:16
 *   - 1 Corinthians 13:4-7
 *   - Psalm 23:1-6
 *   - Gen 1:1
 *   - Romans 8:28
 *   - Rev. 21:4
 */

// ============================================
// BOOK MAPPING
// ============================================

const BOOK_ABBREVIATIONS: Record<string, string> = {
  // Old Testament
  gen: 'Genesis', ge: 'Genesis', gn: 'Genesis',
  ex: 'Exodus', exod: 'Exodus', exo: 'Exodus',
  lev: 'Leviticus', le: 'Leviticus', lv: 'Leviticus',
  num: 'Numbers', nu: 'Numbers', nm: 'Numbers',
  deut: 'Deuteronomy', de: 'Deuteronomy', dt: 'Deuteronomy',
  josh: 'Joshua', jos: 'Joshua',
  judg: 'Judges', jdg: 'Judges',
  ruth: 'Ruth', ru: 'Ruth',
  '1sam': '1 Samuel', '1sa': '1 Samuel',
  '2sam': '2 Samuel', '2sa': '2 Samuel',
  '1kgs': '1 Kings', '1ki': '1 Kings',
  '2kgs': '2 Kings', '2ki': '2 Kings',
  '1chr': '1 Chronicles', '1ch': '1 Chronicles',
  '2chr': '2 Chronicles', '2ch': '2 Chronicles',
  ezra: 'Ezra', ezr: 'Ezra',
  neh: 'Nehemiah', ne: 'Nehemiah',
  est: 'Esther',
  job: 'Job', jb: 'Job',
  ps: 'Psalms', psa: 'Psalms', psalm: 'Psalms', psalms: 'Psalms',
  prov: 'Proverbs', pr: 'Proverbs', pro: 'Proverbs',
  eccl: 'Ecclesiastes', ec: 'Ecclesiastes', ecc: 'Ecclesiastes',
  song: 'Song of Solomon', sos: 'Song of Solomon', sg: 'Song of Solomon',
  isa: 'Isaiah', is: 'Isaiah',
  jer: 'Jeremiah', je: 'Jeremiah',
  lam: 'Lamentations', la: 'Lamentations',
  ezek: 'Ezekiel', eze: 'Ezekiel',
  dan: 'Daniel', da: 'Daniel', dn: 'Daniel',
  hos: 'Hosea', ho: 'Hosea',
  joel: 'Joel', joe: 'Joel',
  amos: 'Amos', am: 'Amos',
  obad: 'Obadiah', ob: 'Obadiah',
  jonah: 'Jonah', jon: 'Jonah',
  mic: 'Micah', mi: 'Micah',
  nah: 'Nahum', na: 'Nahum',
  hab: 'Habakkuk',
  zeph: 'Zephaniah', zep: 'Zephaniah',
  hag: 'Haggai',
  zech: 'Zechariah', zec: 'Zechariah',
  mal: 'Malachi',
  // New Testament
  matt: 'Matthew', mt: 'Matthew', mat: 'Matthew',
  mk: 'Mark', mar: 'Mark',
  lk: 'Luke', lu: 'Luke',
  jn: 'John', joh: 'John',
  acts: 'Acts', ac: 'Acts',
  rom: 'Romans', ro: 'Romans',
  '1cor': '1 Corinthians', '1co': '1 Corinthians',
  '2cor': '2 Corinthians', '2co': '2 Corinthians',
  gal: 'Galatians', ga: 'Galatians',
  eph: 'Ephesians',
  phil: 'Philippians', php: 'Philippians',
  col: 'Colossians',
  '1thess': '1 Thessalonians', '1th': '1 Thessalonians',
  '2thess': '2 Thessalonians', '2th': '2 Thessalonians',
  '1tim': '1 Timothy', '1ti': '1 Timothy',
  '2tim': '2 Timothy', '2ti': '2 Timothy',
  tit: 'Titus',
  phlm: 'Philemon', phm: 'Philemon',
  heb: 'Hebrews',
  jas: 'James', jm: 'James',
  '1pet': '1 Peter', '1pe': '1 Peter', '1pt': '1 Peter',
  '2pet': '2 Peter', '2pe': '2 Peter', '2pt': '2 Peter',
  '1jn': '1 John', '1jo': '1 John',
  '2jn': '2 John', '2jo': '2 John',
  '3jn': '3 John', '3jo': '3 John',
  jude: 'Jude', jd: 'Jude',
  rev: 'Revelation', re: 'Revelation',
};

// Full book names for the regex
const FULL_BOOK_NAMES = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth',
  '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther',
  'Job', 'Psalms?', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
  'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
  'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians',
  'Galatians', 'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

// Abbreviation patterns for the regex
const ABBREVIATION_PATTERN = Object.keys(BOOK_ABBREVIATIONS).join('|');

// ============================================
// SCRIPTURE REFERENCE DETECTION
// ============================================

export interface ScriptureReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  fullReference: string;
  matchedText: string;
}

/**
 * Build the regex pattern for detecting scripture references
 */
const buildScriptureRegex = (): RegExp => {
  const bookNames = FULL_BOOK_NAMES.join('|');
  const abbrs = ABBREVIATION_PATTERN;
  // Match: Book Chapter:Verse(-Verse)
  // Examples: John 3:16, 1 Cor 13:4-7, Gen. 1:1, Psalm 23
  return new RegExp(
    `(?:${bookNames}|${abbrs})\\.?\\s+\\d+(?::\\d+(?:-\\d+)?)?`,
    'gi'
  );
};

/**
 * Detect all scripture references in a text string
 */
export const detectScriptureReferences = (text: string): ScriptureReference[] => {
  const regex = buildScriptureRegex();
  const matches: ScriptureReference[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const parsed = parseReference(match[0]);
    if (parsed) {
      matches.push(parsed);
    }
  }

  return matches;
};

/**
 * Parse a single scripture reference string into structured data
 */
export const parseReference = (refText: string): ScriptureReference | null => {
  // Clean up: remove trailing period, extra spaces
  const cleaned = refText.replace(/\.(?=\s)/, '').trim();

  // Match pattern: (Book) (Chapter):(VerseStart)(-VerseEnd)?
  const match = cleaned.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i);
  if (!match) return null;

  const [, bookPart, chapterStr, verseStartStr, verseEndStr] = match;

  // Resolve book name
  const bookKey = bookPart.toLowerCase().replace(/\./g, '').trim();
  const book = BOOK_ABBREVIATIONS[bookKey] ||
    FULL_BOOK_NAMES.find(b => b.toLowerCase() === bookKey) ||
    FULL_BOOK_NAMES.find(b => b.toLowerCase().startsWith(bookKey));

  if (!book) return null;

  const chapter = parseInt(chapterStr);
  const verseStart = verseStartStr ? parseInt(verseStartStr) : 1;
  const verseEnd = verseEndStr ? parseInt(verseEndStr) : undefined;

  const fullReference = verseEnd
    ? `${book} ${chapter}:${verseStart}-${verseEnd}`
    : verseStartStr
      ? `${book} ${chapter}:${verseStart}`
      : `${book} ${chapter}`;

  return {
    book: book === 'Psalms' ? 'Psalm' : book, // Normalize Psalms -> Psalm only
    chapter,
    verseStart,
    verseEnd,
    fullReference,
    matchedText: refText,
  };
};

// ============================================
// TRANSLATIONS
// ============================================

export type BibleTranslation = 'NIV' | 'ESV' | 'KJV' | 'NLT' | 'MSG';

export const TRANSLATIONS: { id: BibleTranslation; name: string; fullName: string }[] = [
  { id: 'NIV', name: 'NIV', fullName: 'New International Version' },
  { id: 'ESV', name: 'ESV', fullName: 'English Standard Version' },
  { id: 'KJV', name: 'KJV', fullName: 'King James Version' },
  { id: 'NLT', name: 'NLT', fullName: 'New Living Translation' },
  { id: 'MSG', name: 'MSG', fullName: 'The Message' },
];

/**
 * Fetch verse text from a public Bible API
 * Falls back to a placeholder if API is unavailable
 */
export const fetchVerseText = async (
  reference: ScriptureReference,
  translation: BibleTranslation = 'NIV'
): Promise<string> => {
  // Use bible-api.com (free, no auth required)
  const verseRange = reference.verseEnd
    ? `${reference.verseStart}-${reference.verseEnd}`
    : `${reference.verseStart}`;
  const query = `${reference.book}+${reference.chapter}:${verseRange}`;

  try {
    const translationMap: Record<BibleTranslation, string> = {
      NIV: 'web', // World English Bible (free alternative)
      ESV: 'web',
      KJV: 'kjv',
      NLT: 'web',
      MSG: 'web',
    };

    const response = await fetch(
      `https://bible-api.com/${encodeURIComponent(query)}?translation=${translationMap[translation]}`
    );

    if (!response.ok) {
      return `[${reference.fullReference}]`;
    }

    const data = await response.json();
    return data.text?.trim() || `[${reference.fullReference}]`;
  } catch {
    return `[${reference.fullReference} - Unable to load verse text]`;
  }
};

// ============================================
// DISCUSSION QUESTIONS
// ============================================

/**
 * Generate discussion questions for a scripture passage
 * These are general questions that work for any passage
 */
export const getDiscussionQuestions = (reference: ScriptureReference): string[] => {
  const questions = [
    `What stands out to you most in ${reference.fullReference}?`,
    `How does this passage apply to your life today?`,
    `What does this teach us about God's character?`,
    `Have you experienced this truth in your own journey?`,
    `How would you explain this verse to someone new to faith?`,
  ];

  // Add passage-specific context questions
  const bookCategory = getBookCategory(reference.book);
  switch (bookCategory) {
    case 'gospel':
      questions.push(`What does this show us about Jesus' heart for people?`);
      break;
    case 'epistle':
      questions.push(`What practical instruction does Paul give here?`);
      break;
    case 'wisdom':
      questions.push(`What wisdom principle can we draw from this?`);
      break;
    case 'prophetic':
      questions.push(`What was God calling His people to through this passage?`);
      break;
    case 'narrative':
      questions.push(`What can we learn from the characters in this story?`);
      break;
  }

  return questions;
};

/**
 * Categorize a book for contextual discussion questions
 */
const getBookCategory = (book: string): string => {
  const gospels = ['Matthew', 'Mark', 'Luke', 'John'];
  const epistles = ['Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James',
    '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude'];
  const wisdom = ['Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Job', 'Psalm', 'Psalms'];
  const prophetic = ['Isaiah', 'Jeremiah', 'Ezekiel', 'Daniel', 'Hosea', 'Joel',
    'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
    'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Revelation', 'Lamentations'];

  if (gospels.includes(book)) return 'gospel';
  if (epistles.includes(book)) return 'epistle';
  if (wisdom.includes(book)) return 'wisdom';
  if (prophetic.includes(book)) return 'prophetic';
  return 'narrative';
};

// ============================================
// FORMATTED VERSE CARD
// ============================================

/**
 * Format a verse as a shareable card string for group chat
 */
export const formatVerseCard = (
  reference: ScriptureReference,
  verseText: string,
  translation: BibleTranslation = 'NIV'
): string => {
  return `📖 ${reference.fullReference} (${translation})\n\n"${verseText}"\n\n— ${reference.fullReference}`;
};

/**
 * Check if text contains any scripture references
 */
export const containsScriptureReference = (text: string): boolean => {
  return detectScriptureReferences(text).length > 0;
};

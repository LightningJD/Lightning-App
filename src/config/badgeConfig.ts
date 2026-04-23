/**
 * Lightning — 7 Color Badges Configuration
 *
 * Every testimony is categorized into one of 14 doors under 7 colors.
 * The AI reads the testimony and assigns a color based on which door
 * the person's story walked through.
 *
 * 7 colors. 14 doors. The Rainbow of Deliverance.
 */

// ============================================
// TYPES
// ============================================

export type BadgeColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'indigo' | 'violet';

export type DoorNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface BadgeDoor {
  door: DoorNumber;
  description: string;
}

export interface BadgeColorConfig {
  color: BadgeColor;
  hex: string;
  label: string;
  scripture: string;
  scriptureRef: string;
  meaning: string;
  doors: [BadgeDoor, BadgeDoor];
  signals: string[];
}

// ============================================
// THE 7 COLORS & 14 DOORS
// ============================================

export const BADGE_COLORS: Record<BadgeColor, BadgeColorConfig> = {
  red: {
    color: 'red',
    hex: '#f4a0a0',
    label: 'Freedom',
    scripture: '"Though your sins are like scarlet, they shall be as white as snow."',
    scriptureRef: 'Isaiah 1:18',
    meaning: 'Blood, Passover, sacrificial deliverance',
    doors: [
      { door: 1, description: 'Life fell apart. Addiction, abuse, failure, collapse. Something shattered and they could not put it back together alone.' },
      { door: 2, description: 'Hit a point of no return. Rock bottom. Last chance. God showed up at the final moment and pulled them out.' },
    ],
    signals: ['addiction', 'rock bottom', 'last chance', 'almost died', 'lost everything', 'intervention', 'rehab', 'overdose', 'suicide attempt'],
  },
  orange: {
    color: 'orange',
    hex: '#f5c49a',
    label: 'Refined',
    scripture: '"He will be like a refiner\'s fire."',
    scriptureRef: 'Malachi 3:2-3',
    meaning: 'Refiner\'s fire, furnace of affliction',
    doors: [
      { door: 3, description: 'Chronic illness, abuse, trauma, mental health battles, prolonged hardship. Pain was the door.' },
      { door: 4, description: 'Public failure, secret sin revealed, scandal, guilt that became unbearable. The fire of being exposed.' },
    ],
    signals: ['chronic pain', 'illness', 'diagnosis', 'abuse', 'trauma', 'depression', 'anxiety', 'shame', 'secret exposed', 'scandal', 'guilt', 'caught'],
  },
  yellow: {
    color: 'yellow',
    hex: '#f5e6a0',
    label: 'Awakened',
    scripture: '"I am the light of the world."',
    scriptureRef: 'John 8:12',
    meaning: 'Light of the world, darkness to light',
    doors: [
      { door: 5, description: 'Life looked fine on paper but felt hollow. Material success without purpose. Something was missing.' },
      { door: 6, description: 'Saw someone else live out faith genuinely and wanted what they had. Saw light in another person.' },
    ],
    signals: ['had everything', 'successful', 'empty', 'hollow', 'meaningless', 'going through motions', 'watched a friend\'s faith', 'envied their peace', 'wanted what they had'],
  },
  green: {
    color: 'green',
    hex: '#a0ddb0',
    label: 'Life',
    scripture: '"He makes me lie down in green pastures."',
    scriptureRef: 'Psalm 23:2',
    meaning: 'Green pastures, living water, new life',
    doors: [
      { door: 7, description: 'Death, divorce, abandonment. Loss drove them to God because nothing else could carry it.' },
      { door: 8, description: 'Exposed to faith as a kid. May have walked away. Those seeds came back to life later.' },
    ],
    signals: ['death of loved one', 'funeral', 'divorce', 'lost my mom', 'lost my dad', 'lost my child', 'grandma used to pray', 'grew up going to church', 'seeds planted', 'came back to what I knew'],
  },
  blue: {
    color: 'blue',
    hex: '#a0c8e8',
    label: 'Deep',
    scripture: '"Deep calls to deep in the roar of your waterfalls."',
    scriptureRef: 'Psalm 42:7',
    meaning: 'Deep calls to deep, thirst, longing',
    doors: [
      { door: 9, description: 'Intellectual and spiritual hunger. Tried other beliefs, philosophy, religions. Kept seeking until they found Him.' },
      { door: 10, description: 'Felt conditionally loved. The message of grace broke through. Longing for unconditional love.' },
    ],
    signals: ['searching', 'studying', 'reading', 'exploring religions', 'questions', 'philosophy', 'longing', 'thirst', 'unconditional love', 'grace', 'acceptance', 'never felt loved', 'wanted real love'],
  },
  indigo: {
    color: 'indigo',
    hex: '#b8a8d8',
    label: 'Breakthrough',
    scripture: '"Weeping may stay for the night, but rejoicing comes in the morning."',
    scriptureRef: 'Psalm 30:5',
    meaning: 'Night, wrestling, weeping before morning',
    doors: [
      { door: 11, description: 'Old sense of self shattered — prison, major life transition, loss of everything that defined them. The old self died in the dark.' },
      { door: 12, description: 'Did not want it. Pushed back against God, church, Christians. Hostile, skeptical, burned by religion. Something broke through anyway.' },
    ],
    signals: ['identity crisis', 'prison', 'lost everything that defined me', 'atheist', 'fought against God', 'hated church', 'burned by religion', 'skeptic', 'argued', 'resistant', 'hostile'],
  },
  violet: {
    color: 'violet',
    hex: '#d4a8e0',
    label: 'Crown',
    scripture: '"Hold on to what you have, so that no one will take your crown."',
    scriptureRef: 'Revelation 3:11',
    meaning: 'Crown, inheritance, kingdom',
    doors: [
      { door: 13, description: 'Raised in faith. Knew the language, knew the culture. At some point it shifted from inherited to personal.' },
      { door: 14, description: 'Persistent invitation from a trusted person — a friend kept inviting, a family member kept praying. Or found a community that felt like home.' },
    ],
    signals: ['raised in church', 'PK', 'worship team', 'always went', 'inherited', 'never questioned until', 'friend kept inviting', 'community', 'belonging', 'felt like home', 'finally walked in'],
  },
};

// ============================================
// HELPERS
// ============================================

export const BADGE_COLOR_ORDER: BadgeColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];

export const getBadgeConfig = (color: BadgeColor): BadgeColorConfig => BADGE_COLORS[color];

export const getColorForDoor = (door: DoorNumber): BadgeColor => {
  const colorIndex = Math.floor((door - 1) / 2);
  return BADGE_COLOR_ORDER[colorIndex];
};

export const getHexForDoor = (door: DoorNumber): string => {
  const color = getColorForDoor(door);
  return BADGE_COLORS[color].hex;
};

export const isValidBadgeColor = (value: string): value is BadgeColor => {
  return BADGE_COLOR_ORDER.includes(value as BadgeColor);
};

export const isValidDoorNumber = (value: number): value is DoorNumber => {
  return Number.isInteger(value) && value >= 1 && value <= 14;
};

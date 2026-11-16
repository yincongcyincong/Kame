const specialGames = {
  pinyin: 'train',
  count: 'market',
  radical: 'trace',
  pattern: 'pattern',
  'g5-fraction': 'fraction',
};

export const patterns = [
  { given: ['🔴', '🔵', '🔴', '🔵'], target: ['🔴', '🔵', '🔴'], bank: ['🔵', '🟡', '🔴'] },
  { given: ['⭐', '⭐', '🌙', '⭐', '⭐'], target: ['🌙', '⭐', '⭐'], bank: ['☀️', '⭐', '🌙'] },
  { given: ['▲', '■', '●', '▲', '■'], target: ['●', '▲', '■'], bank: ['●', '■', '▲'] },
];

export function activityFor(id, subject, correct) {
  if (Object.hasOwn(specialGames, id)) return specialGames[id];
  if (subject === '数学' && mathAnswer(correct)) return 'math';
  if ((subject === '语文' && id.startsWith('g6-')) || id === 'g5-letters' || id === 'g6-letters') return 'clues';
  return 'tiles';
}

function splitAnswer(answer, subject) {
  if (subject === '英语' && /\s/.test(answer)) return answer.split(/\s+/);
  if (subject === '英语' || /^[\p{Script=Latin}]+$/u.test(answer)) return Array.from(answer);
  if (Array.from(answer).length <= 5) return Array.from(answer);
  return answer.match(/[^，。！？、；：]{1,2}[，。！？、；：]?|[，。！？、；：]/gu) || Array.from(answer);
}

export function tileBoard(answer, distractors, subject, seed) {
  const target = splitAnswer(answer, subject);
  const extras = [...new Set(distractors.flatMap(option => splitAnswer(option, subject)))]
    .filter(piece => !target.includes(piece)).slice(0, 5);
  if (target.length === 1) {
    const alphabet = subject === '英语'
      ? (answer === answer.toUpperCase() ? 'ENROTSLPA' : 'enrotslpa')
      : '日月山水大小木火';
    for (const letter of alphabet) {
      if (extras.length >= 6) break;
      if (!target.includes(letter) && !extras.includes(letter)) extras.push(letter);
    }
  }

  // Seed by round and game so actions never reshuffle the pieces mid-turn.
  const bank = [...target, ...extras].map((text, id) => ({ text, id }));
  for (let index = bank.length - 1; index > 0; index--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swap = seed % (index + 1);
    [bank[index], bank[swap]] = [bank[swap], bank[index]];
  }
  if (target.length > 1 && target.every((piece, index) => bank[index].text === piece)) {
    bank.push(bank.shift());
  }
  return { target, bank };
}

export function mathAnswer(answer) {
  const match = /^(\d[0-9.\/:×π%° ]*?)(?:\s+([\p{Script=Han}]+))?$/u.exec(answer);
  return match ? { value: match[1].replace(/\s/g, ''), unit: match[2] || '' } : null;
}

export function sameMathAnswer(input, expected) {
  const clean = value => value.normalize('NFKC').replace(/\s/g, '').replace(/[xX*]/g, '×').replace(/：/g, ':');
  const actual = clean(input);
  const target = clean(expected);
  if (/^\d*\.?\d+$/.test(actual) && /^\d*\.?\d+$/.test(target)) return Number(actual) === Number(target);
  if (/^\d+×\d+$/.test(target)) return actual === target || actual === target.split('×').reverse().join('×');
  return actual === target;
}

export const mathKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'];

/** Sod-roll + Crazy Dave — evidence from SodRollState.as / CrazyDaveState.as */
import { Reanimation } from './reanim.js';

export const SOD = {
  TimeRollSodStart: 500,
  TimeRollSodEnd: 2510, // 500+2010
};

// SWF LookUpCrazyDaveText + Chinese for kids
export const DAVE_LINES = {
  2400: { en: 'Greetings, neighbor!', zh: '你好呀，邻居！' },
  2401: { en: "The name's Crazy Dave!", zh: '我叫疯狂戴夫！' },
  2402: { en: 'But you can just call me Crazy Dave.', zh: '你就叫我戴夫就好啦。' },
  2403: { en: "Listen, I've got a surprise for you.", zh: '听好了，我给你准备了惊喜！' },
  2404: { en: "Listen, I've got a surprise for you.", zh: '听好了，我给你准备了惊喜！' },
  2405: { en: 'Use your shovel and dig up those plants!', zh: '用铲子把那些植物铲掉！' },
  2406: { en: 'LET THE DIGGING COMMENCE!', zh: '开始铲吧！！' },
  2410: { en: 'Ok goody, now for the surprise...', zh: '好嘞，惊喜来了……' },
  2411: { en: "We're going BOWLING!", zh: '我们去打保龄球！' },
  2412: { en: 'HERE, TAKE THIS WALL-NUT!!', zh: '给你一颗坚果墙！！' },
  2413: { en: "Why'd I put a wall-nut in your hand?", zh: '为什么给你坚果？' },
  2414: { en: "Because I'm CRAAAZY!!!!!", zh: '因为我疯啦！！！！！' },
  2415: { en: 'NOW GO! BOWL ME A WINNER!', zh: '去吧！给我打出好成绩！' },
  // Extra early-level advice (Flash stringManager sparse in this build — add kid tips)
  1001: { en: 'Collect sun to plant seeds!', zh: '收集阳光来种植植物！' },
  1002: { en: "Don't let zombies reach your house!", zh: '别让僵尸走进房子！' },
  1003: { en: 'Plant sunflowers for more sun!', zh: '多种向日葵，阳光会更多！' },
};

export function daveText(index, lang = 'zh') {
  const L = DAVE_LINES[index];
  if (!L) return '';
  return lang === 'zh' ? L.zh : L.en;
}

export function cleanDaveText(s) {
  return s.replace(/\{[^}]+\}/g, '').trim();
}

export function levelsWithSod(level) {
  // Flash: sod when expanding lawn — levels 1 (1 row), 2 (3 rows), 4 (5 rows)
  return level === 1 || level === 2 || level === 4;
}

export function sodRowsForLevel(level) {
  if (level <= 1) return 1;
  if (level === 2 || level === 3) return 3;
  return 5;
}

export function createSodRollReanim(lib, level, which) {
  if (!lib.defs.REANIM_SODROLL) return null;
  const r = lib.create('REANIM_SODROLL');
  const tracks = r.mDefinition.tracks.map((t) => t.name);
  const track = tracks.find((n) => /sodroll/i.test(n)) || tracks.find((n) => n.startsWith('anim_') || n === 'SodRoll') || tracks[0];
  r.currentTrack = track;
  r.loopType = Reanimation.loopOnceAndHold();
  r.animRate = 24;
  // Positions from SodRollState.as
  if (level === 1) { r.x = -5; r.y = 15; }
  else if (level === 2) { r.x = -5; r.y = which === 0 ? -54 : 90; }
  else if (level === 4) { r.x = -7; r.y = which === 0 ? -118 : 152; }
  else { r.x = -5; r.y = 15; }
  return r;
}

export function createDaveReanim(lib) {
  if (!lib.defs.REANIM_CRAZYDAVE) return null;
  const r = lib.create('REANIM_CRAZYDAVE');
  r.currentTrack = 'anim_enter';
  r.animRate = 24;
  r.loopType = Reanimation.loopOnceAndHold(() => {
    r.currentTrack = 'anim_idle';
    r.loopType = Reanimation.LOOP_TYPE_ALWAYS;
    r.animRate = 12;
  });
  r.x = 10; r.y = 40;
  return r;
}

export function daveTalk(reanim, kind = 'small') {
  if (!reanim) return;
  const track = kind === 'crazy' ? 'anim_crazy' : kind === 'handing' ? 'anim_talk_handing' : 'anim_smalltalk';
  if (!reanim.mDefinition.trackNameMap[track]) return;
  reanim.currentTrack = track;
  reanim.animRate = 12;
  reanim.loopType = Reanimation.loopOnceAndIdle('anim_idle', 12);
}

/** TodAnimateCurve linear 0..1000 for sod position */
export function sodPosition(cutsceneTime) {
  const a = SOD.TimeRollSodStart, b = SOD.TimeRollSodEnd;
  if (cutsceneTime <= a) return 0;
  if (cutsceneTime >= b) return 1000;
  return Math.round(((cutsceneTime - a) / (b - a)) * 1000);
}

// Recovered from FFDec Board.as / CPlant.as / Zombie.as / SeedPacket.as / Projectile.as
export const BOARD_W = 540, BOARD_H = 405;
// HD atlas scale: sprites authored at 2×, drawn at logical / ASSET_SCALE
export const ASSET_SCALE = 2;
export const ASSET_VER = 'hd4';
// PVZApp.BOARD_OFFSET — logical 148; on HD sheets use BOARD_OFFSET*ASSET_SCALE as source X
export const BOARD_OFFSET = 148;
// SeedBank.as mHeight — sits at y=0; lawn starts LAWN_YMIN=77 (bank overlaps top of row 0)
export const SEED_BANK_H = 78;
export const TICK_HZ = 100; // SECONDS_PER_UPDATE = 0.01
export const LAWN_XMIN = 25, LAWN_XMAX = 513, LAWN_YMIN = 77, LAWN_YMAX = 385;
export const GRID_W = 9, GRID_H = 5;
export const CELL_W = 54, CELL_H = 67;
export const gridToPixelX = (c) => c * CELL_W + LAWN_XMIN;
export const gridToPixelY = (r) => r * CELL_H + LAWN_YMIN;
export const pixelToGridX = (x) => {
  if (x < LAWN_XMIN) return -1;
  return Math.max(0, Math.min(GRID_W - 1, Math.floor((x - LAWN_XMIN) / CELL_W)));
};
export const pixelToGridY = (x, y) => {
  if (pixelToGridX(x) < 0 || y < LAWN_YMIN) return -1;
  return Math.max(0, Math.min(GRID_H - 1, Math.floor((y - LAWN_YMIN) / CELL_H)));
};

export const SEED = {
  PEASHOOTER: 0, SUNFLOWER: 1, CHERRYBOMB: 2, WALLNUT: 3, SQUASH: 4,
  SNOWPEA: 5, CHOMPER: 6, REPEATER: 7, PUFFSHROOM: 8, SUNSHROOM: 9,
  FUMESHROOM: 10, GRAVEBUSTER: 11,
};
export const SEED_COST = [100, 50, 150, 50, 50, 175, 150, 200, 0, 25, 75, 75];
export const SEED_REFRESH = [750, 750, 5000, 3000, 3000, 750, 750, 750, 750, 750, 750, 750];
export const SEED_NAME_ZH = [
  '豌豆射手', '向日葵', '樱桃炸弹', '坚果墙', '倭瓜', '寒冰射手',
  '食人花', '双发射手', '小喷菇', '阳光菇', '大喷菇', '墓碑吞噬者',
];
export const SEED_IMG = [
  'peashootersingle', 'sunflower', 'cherrybomb', 'wallnut', 'squash', 'snowpea',
  'chomper', 'peashooter', 'puffshroom', 'sunshroom', 'fumeshroom', 'puffshroom',
];

export const ZOMBIE = { NORMAL: 0, FLAG: 1, CONE: 2, POLE: 3, BUCKET: 4, PAPER: 5, DOOR: 6, FOOTBALL: 7 };
export const ZOMBIE_WAVES = [4, 6, 8, 10, 8, 10, 20, 10, 20, 20, 10, 20, 10, 20, 10, 10, 20, 10, 20, 20];
export const ZOMBIE_COUNTDOWN_FIRST = 1800;
export const ZOMBIE_COUNTDOWN = 2500;
export const ZOMBIE_COUNTDOWN_RANGE = 600;
export const ZOMBIE_COUNTDOWN_BEFORE_FLAG = 4500;
export const SUN_COUNTDOWN = 425;
export const SUN_COUNTDOWN_RANGE = 275;
export const PROJECTILE_SPEED = 3.33 * 0.67;
export const PROJECTILE_DAMAGE = 20;
export const CHILLED_FACTOR = 0.4;
export const TICKS_BETWEEN_EATS = 4;
// Zombie.GetPosYBasedOnRow: Board.GridToPixelY(row) - 30 (Zombie.as)
export const ZOMBIE_Y_OFFSET = -30;
// Plant shadow sits near bottom of 54×67 cell (IMAGE_PLANTSHADOW 58×24)
export const PLANT_SHADOW = { w: 58, h: 24, ox: -2, oy: 46 };
// LawnMower.as: roll-in ends at -21; draw reanim at mPosX+4, mPosY; mPosY = GridY+10 (ready)
export const MOWER_X = -21;
export const MOWER_Y_OFFSET = 10;
export const MOWER_DRAW_OX = 4;
export const MOWER_SHADOW = { ox: -5, oy: 30 };
export const SHOVEL_RECT = { x: 402, y: 0, w: 63, h: 65 };

export function numSeedsInBank(level) {
  let n = 6;
  if (level < n) n = level;
  else if (level === 6) n = 5;
  return n;
}
export function startSun(level) {
  return level === 1 ? 150 : 50;
}
export function sodRowsForLevel(level) {
  // Early adventure unlocks lawn rows gradually (classic Flash sod roll)
  if (level <= 1) return 1; // middle row only effectively via sod
  if (level === 2) return 3;
  return 5;
}

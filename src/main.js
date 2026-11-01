// Trick or Treat Town: an isometric Halloween dash. Knock on decorated houses for candy, skip the tricks,
// dodge ghosts, bats and sticky webs, and grab as much candy as you can before time runs out.

import { FxSprite } from "./fxsprite.js";
import * as S from "./sprites.js";
import { sfx, initAudio } from "./sfx.js";
import * as ghostFx from "../vendor/pixelfx/fx/critters/ghost.js";
import * as batFx from "../vendor/pixelfx/fx/critters/bat.js";
import * as skullFx from "../vendor/pixelfx/fx/critters/flying-skull.js";
import * as candleFx from "../vendor/pixelfx/fx/fire/candle.js";
import * as spiritFx from "../vendor/pixelfx/fx/fire/spirit-flame.js";
import * as burstFx from "../vendor/pixelfx/fx/pickups/collect-burst.js";
import * as numberFx from "../vendor/pixelfx/fx/ui/damage-number.js";
import * as powFx from "../vendor/pixelfx/fx/explosions/cartoon-pow.js";
import * as poofFx from "../vendor/pixelfx/fx/spawn/poof.js";
import * as countdownFx from "../vendor/pixelfx/fx/ui/countdown.js";
import * as questFx from "../vendor/pixelfx/fx/ui/quest-complete.js";
import * as confettiFx from "../vendor/pixelfx/fx/ui/confetti.js";
import * as fogFx from "../vendor/pixelfx/fx/weather/fog.js";

const N = 25, GAME_TIME = 90;
// the game's pixel resolution follows the screen's shape: at least 400 x 225 game pixels, each a whole number of device pixels
let W = 480, H = 270;
const KID_SPEED = 3.6, KNOCK_TIME = 0.7, POWER_TIME = 8;
const GOLD = ["#2a1405", "#5c3008", "#9a5a0e", "#d48e18", "#f5b92c", "#ffde5e", "#fff4bc", "#ffffff"];
const PURPLE = ["#12061e", "#2c0d48", "#4f1a7a", "#7a2fb0", "#a85ce0", "#d29bff", "#f0dcff", "#ffffff"];
const GREEN = ["#06140a", "#0d3a18", "#18662a", "#2a9a40", "#56d06a", "#9cf2a6", "#e0ffe4", "#ffffff"];
const PINK = ["#1e0516", "#4a0c38", "#8a1a68", "#d02a9a", "#ff5ac8", "#ff9ae0", "#ffd8f4", "#ffffff"];
const BLUE = ["#04061a", "#0a1050", "#141e8c", "#2234c8", "#3c5af0", "#7c96ff", "#c8d4ff"];
const RED = ["#1a0508", "#4a0b12", "#8c1420", "#d42a2e", "#ff5a4a", "#ff9a86", "#ffd8cc", "#ffffff"];

const cv = document.getElementById("game"), ctx = cv.getContext("2d");
function fit() {
  const dpr = devicePixelRatio || 1, dw = Math.round(innerWidth * dpr), dh = Math.round(innerHeight * dpr);
  const k = Math.max(1, Math.floor(Math.min(dw / 400, dh / 225)));
  W = Math.ceil(dw / k);
  H = Math.ceil(dh / k);
  cv.width = W;
  cv.height = H;
  cv.style.width = (W * k) / dpr + "px";
  cv.style.height = (H * k) / dpr + "px";
  if (sky) makeSky();
  if (dark) [dark.width, dark.height] = [W, H];
}
addEventListener("resize", fit);
let sky, dark, dctx;

const iso = (gx, gy) => [(gx - gy) * 16, (gx + gy) * 8];
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const hash = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------- the town

const GRASS = 0, ROAD = 1, PATH = 2, PORCH = 3;
const GOX = N * 16 + 32, GOY = 32;

function newTown() {
  const tile = new Uint8Array(N * N), solid = new Uint8Array(N * N), houses = [], props = [], webs = new Set();
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (x % 6 === 0 || y % 6 === 0) tile[y * N + x] = ROAD;
  const kinds = shuffle(["king", ...Array(9).fill("treat"), ...Array(3).fill("trick"), ...Array(3).fill("dark")]);
  let k = 0;
  for (let by = 0; by < 4; by++)
    for (let bx = 0; bx < 4; bx++) {
      const ox = bx * 6, oy = by * 6, kind = kinds[k++];
      const h = {
        x0: ox + 2, y0: oy + 1, x1: ox + 5, y1: oy + 4, kind, visited: false,
        door: [ox + 3.5, oy + 4.5],
        wall: pick(S.WALLS), roof: kind === "king" ? S.ROOFS[0] : pick(S.ROOFS), chimney: Math.random() < 0.5,
      };
      renderHouseCanvas(h);
      houses.push(h);
      for (let x = h.x0; x < h.x1; x++) for (let y = h.y0; y < h.y1; y++) solid[y * N + x] = 1;
      for (let x = ox + 2; x <= ox + 4; x++) tile[(oy + 4) * N + x] = PORCH;
      tile[(oy + 5) * N + ox + 3] = PATH;
      const yard = shuffle([[1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [2, 5], [4, 5]]);
      for (let i = 0, n = randInt(1, 3); i < n; i++) {
        const [lx, ly] = yard[i], tx = ox + lx, ty = oy + ly;
        props.push({ tx, ty, type: Math.random() < 0.4 ? "tree" : "tomb" });
        solid[ty * N + tx] = 1;
      }
    }
  houses.sort((a, b) => a.x0 + a.y0 - (b.x0 + b.y0) || a.x0 - b.x0);
  while (webs.size < 7) {
    const [x, y] = roadPoint();
    const tx = Math.floor(x), ty = Math.floor(y);
    if (dist(tx, ty, 12, 12) > 3) webs.add(ty * N + tx);
  }
  const town = { tile, solid, houses, props, webs };
  town.ground = renderGround(town);
  return town;
}

function renderHouseCanvas(h) {
  const lit = !h.visited;
  h.canvas = S.renderHouse({
    wall: h.wall, roof: h.roof, chimney: h.chimney,
    lights: h.kind === "dark" || !lit ? "off" : h.kind === "trick" ? "green" : "warm",
    decor: h.kind !== "dark", web: h.kind === "trick" || h.kind === "dark",
  });
  // which pixels are solid, to tell when the house hides the kid
  const { width: w, height: hh } = h.canvas, a = h.canvas.getContext("2d").getImageData(0, 0, w, hh).data;
  h.mask = new Uint8Array(w * hh);
  for (let i = 0; i < w * hh; i++) h.mask[i] = a[i * 4 + 3] > 0 ? 1 : 0;
  h.fade ??= 1;
}

/** Does house h cover screen point (x, y), given the house's top corner sits at (hx, hy)? */
function houseCovers(h, hx, hy, x, y) {
  const u = Math.round(x - hx + S.HOUSE_ORIGIN[0]), v = Math.round(y - hy + S.HOUSE_ORIGIN[1]);
  return u >= 0 && v >= 0 && u < h.canvas.width && v < h.canvas.height && h.mask[v * h.canvas.width + u] === 1;
}

function roadPoint() {
  const line = randInt(0, 4) * 6 + 0.5, along = rand(0.5, N - 0.5);
  return Math.random() < 0.5 ? [line, along] : [along, line];
}

const rgbCache = new Map();
function rgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) rgbCache.set(hex, (v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))));
  return v;
}

function renderGround(town) {
  const gw = N * 32 + 64, gh = N * 16 + 64, c = S.canvas(gw, gh), g = c.getContext("2d");
  const img = g.createImageData(gw, gh), d = img.data;
  const isRoad = (x, y) => x < 0 || y < 0 || x >= N || y >= N || town.tile[y * N + x] === ROAD;
  for (let py = 0; py < gh; py++)
    for (let px = 0; px < gw; px++) {
      const X = px + 0.5 - GOX, Y = py + 0.5 - GOY;
      const gx = (X / 16 + Y / 8) / 2, gy = (Y / 8 - X / 16) / 2;
      if (gx < 0 || gy < 0 || gx >= N || gy >= N) continue;
      const tx = gx | 0, ty = gy | 0, fx = gx - tx, fy = gy - ty, t = town.tile[ty * N + tx];
      const hs = hash(Math.floor(gx * 8), Math.floor(gy * 8));
      let col;
      if (t === ROAD) {
        col = hs < 0.15 ? "#2e2a3a" : hs > 0.9 ? "#1d1a25" : "#262230";
        const alongX = ty % 6 === 0 && tx % 6 !== 0, alongY = tx % 6 === 0 && ty % 6 !== 0;
        if (alongX && Math.abs(fy - 0.5) < 0.04 && Math.floor(gx * 3) % 2 === 0) col = "#6e6034";
        if (alongY && Math.abs(fx - 0.5) < 0.04 && Math.floor(gy * 3) % 2 === 0) col = "#6e6034";
        if ((fx < 0.07 && !isRoad(tx - 1, ty)) || (fx > 0.93 && !isRoad(tx + 1, ty)) ||
            (fy < 0.07 && !isRoad(tx, ty - 1)) || (fy > 0.93 && !isRoad(tx, ty + 1))) col = "#565068";
      } else if (t === PATH) {
        col = (Math.floor(gx * 3) + Math.floor(gy * 3)) % 2 ? "#4a4454" : "#3c3746";
        if (hs > 0.85) col = "#2e2a36";
      } else if (t === PORCH) {
        col = Math.floor(gx * 5) % 2 ? "#5a3a28" : "#4c3022";
        if (fy > 0.9) col = "#2e1c14";
      } else {
        col = hs < 0.25 ? "#1d3326" : hs < 0.6 ? "#213a2b" : hs < 0.9 ? "#254130" : "#2c4a36";
        const leaf = hash(Math.floor(gx * 16) + 7, Math.floor(gy * 16) + 3);
        if (leaf > 0.982) col = leaf > 0.994 ? "#8a3a1a" : leaf > 0.988 ? "#e08a2e" : "#c45a1c";
      }
      const [r, gg, b] = rgb(col), i = (py * gw + px) * 4;
      d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  // spider webs on the road
  g.fillStyle = "rgba(225,225,245,0.75)";
  const plot = (x0, y0, x1, y1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
    for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), 1, 1);
  };
  for (const w of town.webs) {
    const [sx, sy] = iso((w % N) + 0.5, Math.floor(w / N) + 0.5), cx = sx + GOX, cy = sy + GOY;
    const pt = (a, r) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.5];
    for (let a = 0; a < 8; a++) plot(cx, cy, ...pt((a * Math.PI) / 4, 13));
    for (const r of [4, 8, 12]) for (let a = 0; a < 8; a++) plot(...pt((a * Math.PI) / 4, r), ...pt(((a + 1) * Math.PI) / 4, r));
  }
  return c;
}

// ---------------------------------------------------------------- shared looping effects

const shared = {
  candle: new FxSprite(candleFx, { seed: 3 }),
  spirit: new FxSprite(spiritFx, { palette: ["#03140a", "#0a3a1c", "#16703a", "#2aa858", "#5ae07e", "#a8ffb8", "#e8ffe8", "#ffffff"], seed: 4 }),
  ghosts: [new FxSprite(ghostFx, { seed: 1, hover: 10 }), new FxSprite(ghostFx, { seed: 7, hover: 12 })],
  batR: new FxSprite(batFx, { seed: 2 }),
  batL: new FxSprite(batFx, { seed: 5, flip: true }),
  scared: [new FxSprite(ghostFx, { seed: 1, hover: 10, palette: BLUE }), new FxSprite(ghostFx, { seed: 7, hover: 12, palette: BLUE })],
  fog: new FxSprite(fogFx, { seed: 3 }),
};
// let the loops start out of step
shared.ghosts[1].update(1.2);
shared.scared[1].update(1.2);
shared.fog.update(4);

// the sky: stars and a moon, fixed to the screen
function makeSky() {
  sky = S.canvas(W, H);
  const g = sky.getContext("2d");
  for (let i = 0; i < 140; i++) {
    g.fillStyle = pick(["#3a3458", "#5a5480", "#8a84b0", "#d8d4ff"]);
    g.fillRect(randInt(0, W), randInt(0, H), 1, 1);
  }
  const mx = W - 54, my = 38;
  for (let y = -20; y <= 20; y++)
    for (let x = -20; x <= 20; x++) {
      const r = Math.hypot(x, y);
      if (r > 16.5) continue;
      const crater = hash(Math.floor((x + 40) / 4), Math.floor((y + 40) / 4)) > 0.72;
      g.fillStyle = r > 15 ? "#c9c08a" : crater ? "#d8cf98" : x + y < -6 ? "#fffbe0" : "#f2eab8";
      g.fillRect(mx + x, my + y, 1, 1);
    }
}

// ---------------------------------------------------------------- game state

let town, kid, ghosts, bats, pickups, oneshots, screenFx, floaters, knock, superCandy, superTimer, banner;
let state = "title", stateT = 0, timeLeft = GAME_TIME, batTimer = 6, bonusTimer = 3, lastTick = 0;
let camX = 0, camY = 0, best = +(localStorage.getItem("tot-best") || 0), newBest = false;

function reset() {
  town = newTown();
  kid = { x: 12.5, y: 12.5, face: "front", flip: false, walkT: 0, moving: false, invuln: 0, stun: 0, candies: 0, onWeb: false, power: 0 };
  ghosts = [];
  for (let i = 0; i < 2; i++) addGhost();
  bats = [];
  pickups = [];
  oneshots = [];
  screenFx = [];
  floaters = [];
  knock = null;
  timeLeft = GAME_TIME;
  superCandy = null;
  superTimer = 12;
  banner = null;
  batTimer = 7;
  bonusTimer = 0;
  for (let i = 0; i < 6; i++) spawnBonusCandy();
  const [sx, sy] = iso(kid.x, kid.y);
  camX = sx - W / 2;
  camY = sy - H / 2;
}

function farRoadPoint(min = 8) {
  for (let i = 0; i < 30; i++) {
    const p = roadPoint();
    if (dist(p[0], p[1], kid.x, kid.y) > min) return p;
  }
  return roadPoint();
}

function addGhost() {
  const [x, y] = farRoadPoint(7);
  ghosts.push({ x, y, tx: x, ty: y, fx: shared.ghosts[ghosts.length % 2], respawn: 0, chasing: false });
}

function spawnBonusCandy() {
  const [x, y] = farRoadPoint(2);
  pickups.push({ x, y, z: 0, vx: 0, vy: 0, vz: 0, col: randInt(0, 6), age: 1, life: Infinity, bonus: true });
}

function showBanner(text, color) {
  banner = { text, color, t: 0 };
}

function start() {
  initAudio();
  // on phones and tablets, take over the whole screen
  const el = document.documentElement;
  if (matchMedia("(pointer: coarse)").matches && !document.fullscreenElement && el.requestFullscreen)
    el.requestFullscreen({ navigationUI: "hide" }).then(() => screen.orientation?.lock?.("landscape")).catch(() => {});
  reset();
  state = "countdown";
  stateT = 0;
  screenFx.push({ fx: new FxSprite(countdownFx, { palette: PURPLE, go: GOLD, word: "GO!" }, 30), at: () => [W / 2, H / 2 - 10] });
  sfx.beep(false);
}

function endGame() {
  state = "over";
  stateT = 0;
  newBest = kid.candies > best;
  if (newBest) {
    best = kid.candies;
    localStorage.setItem("tot-best", best);
  }
  knock = null;
  sfx.end();
  screenFx.push({ fx: new FxSprite(questFx, { text: "TIME UP!" }, 20), at: () => [W / 2, 66 + midY()] });
  if (newBest && kid.candies > 0) screenFx.push({ fx: new FxSprite(confettiFx, { seed: 3 }, 20), at: () => [W / 2, H - 30] });
}

// ---------------------------------------------------------------- input

const keys = new Set();
addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if ((e.code === "Space" || e.code === "Enter") && (state === "title" || (state === "over" && stateT > 1.5))) start();
});
addEventListener("keyup", (e) => keys.delete(e.code));
addEventListener("blur", () => keys.clear());

const stick = { on: false, x0: 0, y0: 0, x: 0, y: 0 };
function toCanvas(e) {
  const r = cv.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
}
cv.addEventListener("pointerdown", (e) => {
  if (state === "title" || (state === "over" && stateT > 1.5)) return start();
  const [x, y] = toCanvas(e);
  Object.assign(stick, { on: true, x0: x, y0: y, x, y });
  cv.setPointerCapture(e.pointerId);
});
cv.addEventListener("pointermove", (e) => {
  if (!stick.on) return;
  [stick.x, stick.y] = toCanvas(e);
});
const release = () => (stick.on = false);
cv.addEventListener("pointerup", release);
cv.addEventListener("pointercancel", release);

/** The wanted walking direction in tile space, length 0..1. */
function inputDir() {
  const k = (...c) => (c.some((x) => keys.has(x)) ? 1 : 0);
  const up = k("ArrowUp", "KeyW"), down = k("ArrowDown", "KeyS"), left = k("ArrowLeft", "KeyA"), right = k("ArrowRight", "KeyD");
  // up is the top of the screen: up+right walks along a road
  let wx = -up + right + down - left, wy = -up - right + down + left;
  if (stick.on) {
    const sx = stick.x - stick.x0, sy = stick.y - stick.y0;
    if (Math.hypot(sx, sy) > 6) {
      wx = sx + 2 * sy;
      wy = 2 * sy - sx;
    }
  }
  const l = Math.hypot(wx, wy);
  return l ? [wx / l, wy / l] : [0, 0];
}

// ---------------------------------------------------------------- update

const solidAt = (x, y) => {
  if (x < 0.05 || y < 0.05 || x > N - 0.05 || y > N - 0.05) return true;
  return town.solid[Math.floor(y) * N + Math.floor(x)] === 1;
};
const blocked = (x, y, r = 0.22) => solidAt(x - r, y - r) || solidAt(x + r, y - r) || solidAt(x - r, y + r) || solidAt(x + r, y + r);

function spawnFx(fx, gx, gy, z = 0) {
  oneshots.push({ fx, gx, gy, z });
}
function floater(text, gx, gy, color, life = 1.4) {
  const f = { text, gx, gy, t: 0, color, life };
  floaters.push(f);
  return f;
}

function loseCandies(n) {
  const m = Math.min(n, kid.candies);
  kid.candies -= m;
  for (let i = 0; i < m; i++) {
    const a = rand(0, Math.PI * 2), s = rand(1.6, 2.8);
    pickups.push({ x: kid.x, y: kid.y, z: 10, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rand(70, 110), col: randInt(0, 6), age: 0, life: 7 });
  }
  if (m) spawnFx(new FxSprite(numberFx, { text: "-" + m, palette: RED, seed: randInt(1, 99) }, 30), kid.x, kid.y, 34);
}

function resolveKnock(h) {
  h.visited = true;
  renderHouseCanvas(h);
  const [dx, dy] = h.door;
  if (h.kind === "treat" || h.kind === "king") {
    const n = h.kind === "king" ? 8 : randInt(2, 4);
    kid.candies += n;
    spawnFx(new FxSprite(burstFx, { palette: GOLD, seed: randInt(1, 99) }), dx, dy, 6);
    spawnFx(new FxSprite(numberFx, { text: "+" + n, palette: GOLD, seed: randInt(1, 99) }, 30), dx, dy, 36);
    if (h.kind === "king") floater("FULL SIZE BARS!", dx, dy - 0.6, "#ffd34a");
    else floater(pick(["TREAT!", "HAPPY HALLOWEEN!", "HERE YOU GO!", "CUTE COSTUME!"]), dx, dy - 0.6, "#ffe9b0");
    sfx.treat();
  } else if (h.kind === "trick") {
    const skull = new FxSprite(skullFx, { seed: randInt(1, 99), hover: 16 });
    skull.life = 1.4;
    spawnFx(skull, dx - 0.3, dy - 0.6, 0);
    spawnFx(new FxSprite(numberFx, { text: "TRICK!", palette: GREEN, seed: randInt(1, 99) }, 40), dx, dy, 64);
    loseCandies(3);
    kid.stun = 1.2;
    kid.invuln = Math.max(kid.invuln, 1.2);
    sfx.trick();
  } else {
    floater("NOBODY HOME...", dx, dy - 0.6, "#9a96b8");
    sfx.nobody();
  }
}

function hitKid(n, word, palette) {
  spawnFx(new FxSprite(powFx, { text: word, palette, seed: randInt(1, 99) }, 10), kid.x, kid.y, 18);
  loseCandies(n);
  kid.invuln = 2;
  kid.stun = 0.5;
  sfx.boo();
}

function update(dt) {
  stateT += dt;
  const playing = state === "play";
  if (state === "countdown") {
    if (stateT >= 0.62 && stateT - dt < 0.62) sfx.beep(false);
    if (stateT >= 1.24 && stateT - dt < 1.24) sfx.beep(false);
    if (stateT >= 1.86) {
      sfx.beep(true);
      state = "play";
      stateT = 0;
    }
  }
  if (playing) {
    timeLeft -= dt;
    if (timeLeft <= 10 && Math.ceil(timeLeft) !== lastTick) {
      lastTick = Math.ceil(timeLeft);
      sfx.tick();
    }
    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame();
    }
  }
  const elapsed = GAME_TIME - timeLeft;

  for (const f of [shared.candle, shared.spirit, ...shared.ghosts, ...shared.scared, shared.batR, shared.batL, shared.fog]) f.update(dt);

  // the kid
  kid.invuln = Math.max(0, kid.invuln - dt);
  kid.stun = Math.max(0, kid.stun - dt);
  const [wx, wy] = playing && kid.stun <= 0 ? inputDir() : [0, 0];
  const tileUnder = Math.floor(kid.y) * N + Math.floor(kid.x);
  const onWeb = town.webs.has(tileUnder);
  if (onWeb && !kid.onWeb && playing) {
    sfx.sticky();
    floater("STICKY!", kid.x, kid.y - 0.8, "#d8d8f0");
  }
  kid.onWeb = onWeb;
  const sp = KID_SPEED * (onWeb ? 0.35 : 1) * dt;
  kid.moving = wx !== 0 || wy !== 0;
  if (kid.moving) {
    if (!blocked(kid.x + wx * sp, kid.y)) kid.x += wx * sp;
    if (!blocked(kid.x, kid.y + wy * sp)) kid.y += wy * sp;
    kid.walkT += dt * (onWeb ? 0.5 : 1);
    const sx = wx - wy, sy = wx + wy;
    if (Math.abs(sy) > 0.05) kid.face = sy > 0 ? "front" : "back";
    if (Math.abs(sx) > 0.05) kid.flip = sx < 0;
  } else kid.walkT = 0;

  // knocking on doors
  if (playing) {
    const h = town.houses.find((h) => !h.visited && dist(kid.x, kid.y, ...h.door) < 0.55);
    if (h && (!knock || knock.house !== h)) {
      knock = { house: h, t: 0 };
      sfx.knock();
      knock.label = floater("KNOCK KNOCK", h.door[0], h.door[1] - 0.6, "#ffffff", KNOCK_TIME + 0.2);
    } else if (!h) knock = null;
    if (knock) {
      knock.t += dt;
      if (knock.t >= KNOCK_TIME) {
        knock.label.t = knock.label.life;
        resolveKnock(knock.house);
        knock = null;
      }
    }
  }

  // ghosts: drift about the streets, give chase when the kid comes close
  const wantGhosts = 2 + (elapsed > 25) + (elapsed > 50) + (elapsed > 70);
  if (playing && ghosts.length < wantGhosts) addGhost();
  for (const g of ghosts) {
    if (g.respawn > 0) {
      g.respawn -= dt;
      if (g.respawn <= 0) {
        [g.x, g.y] = farRoadPoint(9);
        [g.tx, g.ty] = [g.x, g.y];
        spawnFx(new FxSprite(poofFx, { palette: PURPLE, seed: randInt(1, 99) }), g.x, g.y, 10);
      }
      continue;
    }
    const d = dist(g.x, g.y, kid.x, kid.y), scared = kid.power > 0;
    g.chasing = playing && !scared && d < 5 && kid.invuln <= 0;
    let sp;
    if (scared && d < 8) {
      // run straight away from the kid, staying inside the town
      const away = d || 1;
      g.tx = Math.min(N - 0.5, Math.max(0.5, g.x + ((g.x - kid.x) / away) * 3));
      g.ty = Math.min(N - 0.5, Math.max(0.5, g.y + ((g.y - kid.y) / away) * 3));
      sp = 2.6;
    } else if (g.chasing) {
      [g.tx, g.ty] = [kid.x, kid.y];
      sp = 1.9 + (elapsed / GAME_TIME) * 0.9;
    } else {
      if (dist(g.x, g.y, g.tx, g.ty) < 0.3) [g.tx, g.ty] = roadPoint();
      sp = 1.1;
    }
    const l = dist(g.x, g.y, g.tx, g.ty) || 1, step = Math.min(l, sp * dt);
    g.x += ((g.tx - g.x) / l) * step;
    g.y += ((g.ty - g.y) / l) * step;
    if (playing && d < 0.55 && scared) {
      // caught a scared ghost: it pops and leaves candy behind
      kid.candies += 2;
      sfx.gulp();
      spawnFx(new FxSprite(poofFx, { palette: BLUE, seed: randInt(1, 99) }), g.x, g.y, 10);
      spawnFx(new FxSprite(numberFx, { text: "+2", palette: GOLD, seed: randInt(1, 99) }, 30), g.x, g.y, 34);
      g.respawn = 5;
    } else if (playing && d < 0.55 && kid.invuln <= 0) {
      hitKid(3, "BOO!", PURPLE);
      spawnFx(new FxSprite(poofFx, { seed: randInt(1, 99) }), g.x, g.y, 10);
      g.respawn = 3;
    }
  }

  // bats: swoop straight across the town past the kid
  if (playing) {
    batTimer -= dt;
    if (batTimer <= 0) {
      batTimer = rand(4, 7) - elapsed / 30;
      const a = rand(0, Math.PI * 2), dx = Math.cos(a), dy = Math.sin(a), off = rand(-1.5, 1.5);
      const cx = kid.x - dy * off, cy = kid.y + dx * off;
      bats.push({ x: cx - dx * 13, y: cy - dy * 13, dx, dy, t: 0, fx: dx - dy < 0 ? shared.batL : shared.batR });
    }
  }
  for (const b of bats) {
    b.t += dt;
    b.x += b.dx * 4.6 * dt;
    b.y += b.dy * 4.6 * dt;
    if (playing && kid.invuln <= 0 && kid.power <= 0 && dist(b.x, b.y, kid.x, kid.y) < 0.6) hitKid(2, "EEK!", RED);
  }
  bats = bats.filter((b) => b.t < 6);

  // candy on the ground
  if (playing) {
    bonusTimer -= dt;
    if (bonusTimer <= 0) {
      bonusTimer = 4;
      if (pickups.filter((p) => p.bonus).length < 7) spawnBonusCandy();
    }
  }
  for (const p of pickups) {
    p.age += dt;
    if (p.z > 0 || p.vz > 0) {
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (!blocked(nx, ny, 0.1)) [p.x, p.y] = [nx, ny];
      else p.vx = p.vy = 0;
      p.vz -= 320 * dt;
      p.z += p.vz * dt;
      if (p.z <= 0) {
        p.z = 0;
        p.vx *= 0.4;
        p.vy *= 0.4;
        p.vz = p.vz < -50 ? -p.vz * 0.35 : 0;
      }
    }
    if (playing && p.age > 0.5 && dist(p.x, p.y, kid.x, kid.y) < 0.5) {
      p.taken = true;
      kid.candies++;
      sfx.pickup();
      floater("+1", p.x, p.y - 0.4, "#ffe066");
    }
  }
  pickups = pickups.filter((p) => !p.taken && p.age < p.life);

  // the super lollipop: shows up now and then; grab it and the ghosts run scared
  kid.power = Math.max(0, kid.power - dt);
  if (playing && !superCandy && kid.power <= 0 && (superTimer -= dt) <= 0) {
    const [x, y] = farRoadPoint(5);
    superCandy = { x, y, age: 0, life: 14 };
    showBanner("A SUPER LOLLIPOP APPEARED!", "#ff7ad9");
    sfx.sparkle();
  }
  if (superCandy) {
    superCandy.age += dt;
    if (playing && dist(superCandy.x, superCandy.y, kid.x, kid.y) < 0.6) {
      kid.power = POWER_TIME;
      spawnFx(new FxSprite(burstFx, { palette: PINK, seed: randInt(1, 99) }), superCandy.x, superCandy.y, 6);
      spawnFx(new FxSprite(numberFx, { text: "SUPER!", palette: PINK, seed: randInt(1, 99) }, 40), kid.x, kid.y, 40);
      showBanner("GHOSTS ARE SCARED - CATCH THEM!", "#9ab4ff");
      sfx.power();
      superCandy = null;
      superTimer = rand(16, 22);
    } else if (superCandy.age >= superCandy.life) {
      superCandy = null;
      superTimer = rand(6, 10);
    }
  }
  if (banner) banner.t += dt;

  for (const o of oneshots) {
    o.fx.update(dt);
    if (o.fx.life !== undefined && (o.fx.life -= dt) <= 0 && !o.stopped) {
      o.stopped = true;
      o.fx.stop();
    }
  }
  oneshots = oneshots.filter((o) => !o.fx.done());
  for (const s of screenFx) s.fx.update(dt);
  screenFx = screenFx.filter((s) => !s.fx.done());
  for (const f of floaters) f.t += dt;
  floaters = floaters.filter((f) => f.t < f.life);

  // the camera eases after the kid
  const [kx, ky] = iso(kid.x, kid.y);
  const k = 1 - Math.exp(-dt * 6);
  camX += (kx - W / 2 - camX) * k;
  camY += (ky - H / 2 + 6 - camY) * k;
}

// ---------------------------------------------------------------- drawing

fit();
makeSky();
dark = S.canvas(W, H);
dctx = dark.getContext("2d");

function shadow(sx, sy, w) {
  ctx.fillStyle = "rgba(4,2,12,0.45)";
  ctx.fillRect(sx - w / 2 + 1, sy - 1, w - 2, 3);
  ctx.fillRect(sx - w / 2, sy, w, 1);
}

let dtDraw = 0;
function draw(time) {
  const cx = Math.round(camX), cy = Math.round(camY);
  const scr = (gx, gy) => {
    const [x, y] = iso(gx, gy);
    return [x - cx, y - cy];
  };
  ctx.fillStyle = "#0b0818";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(sky, 0, 0);
  ctx.drawImage(town.ground, -GOX - cx, -GOY - cy);

  const lights = [];
  const flick = (s) => 0.85 + 0.15 * Math.sin(time * 9 + s * 3.1) * Math.sin(time * 5.3 + s);

  // shadows lie on the ground under everything
  const [ksx, ksy] = scr(kid.x, kid.y);
  shadow(ksx, ksy, 10);
  for (const p of pickups) {
    const [x, y] = scr(p.x, p.y);
    shadow(x, y, 7);
  }
  for (const b of bats) {
    const [x, y] = scr(b.x, b.y);
    shadow(x, y, 12);
  }

  // things that stand on the ground, depth-sorted with the houses
  const ents = [];
  for (const pr of town.props) {
    const img = pr.type === "tree" ? S.TREE : S.TOMBSTONE, ax = pr.type === "tree" ? 18 : 6, ay = pr.type === "tree" ? 46 : 13;
    ents.push({ gx: pr.tx + 0.5, gy: pr.ty + 0.5, draw: (x, y) => ctx.drawImage(img, x - ax, y - ay) });
  }
  town.houses.forEach((h, i) => {
    if (h.kind === "dark") return;
    const pumpkins = [[h.x0 + 0.3, h.y1 + 0.3], [h.x1 - 0.3, h.y1 + 0.3]];
    if (h.kind === "king") pumpkins.push([h.x0 + 1.15, h.y1 + 1.6], [h.x0 + 1.85, h.y1 + 1.6], [h.x0 + 1.15, h.y1 + 2.5], [h.x0 + 1.85, h.y1 + 2.5]);
    pumpkins.forEach(([gx, gy], j) => {
      const s = i * 7 + j;
      ents.push({ gx, gy, draw: (x, y) => ctx.drawImage(S.PUMPKIN.lit[flick(s) > 0.92 ? 1 : 0], x - 6, y - 10) });
      lights.push([gx, gy, 20 * flick(s), "warm"]);
    });
    if (h.kind === "trick") {
      ents.push({ gx: h.x1 - 0.7, gy: h.y1 + 0.75, draw: (x, y) => shared.spirit.draw(ctx, x, y - 4) });
      lights.push([h.x1 - 0.7, h.y1 + 0.75, 34, "green", 22]);
    } else {
      ents.push({ gx: h.x0 + 0.8, gy: h.y1 + 0.75, draw: (x, y) => shared.candle.draw(ctx, x, y + 2) });
      lights.push([h.x0 + 0.8, h.y1 + 0.75, 28 * flick(i), "warm", 10]);
    }
    if (!h.visited) {
      lights.push([h.x0 + 1.5, h.y1, 40, h.kind === "trick" ? "green" : "warm", 18]);
      lights.push([h.x1, h.y0 + 1.5, 34, h.kind === "trick" ? "green" : "warm", 18]);
    }
  });
  for (const p of pickups) {
    const bob = p.bonus ? Math.round(Math.sin(time * 4 + p.x * 3) * 1.5) + 2 : 0;
    const blink = p.life - p.age < 2 && Math.floor(time * 10) % 2;
    if (!blink)
      ents.push({ gx: p.x, gy: p.y, draw: (x, y) => ctx.drawImage(S.CANDY[p.col], x - 5, y - 5 - Math.round(p.z) - bob) });
    if (p.bonus) lights.push([p.x, p.y, 10, "candy"]);
  }
  if (superCandy) {
    const sc = superCandy, bob = Math.round(Math.sin(time * 5) * 2) + 3;
    if (sc.life - sc.age > 3 || Math.floor(time * 8) % 2)
      ents.push({
        gx: sc.x, gy: sc.y,
        draw: (x, y) => {
          ctx.drawImage(S.LOLLIPOP, x - 7, y - 22 - bob);
          for (let i = 0; i < 4; i++) {
            const a = time * 3 + (i * Math.PI) / 2, sx = Math.round(x + Math.cos(a) * 11), sy = Math.round(y - 15 - bob + Math.sin(a) * 6);
            ctx.fillStyle = i % 2 ? "#ffffff" : "#ff9ae0";
            ctx.fillRect(sx, sy, 1, 1);
          }
        },
      });
    lights.push([sc.x, sc.y, 34, "candy", 14]);
  }
  // scared ghosts turn blue, and flicker back to white as the power runs out
  const scaredLook = kid.power > 0 && (kid.power > 2 || Math.floor(time * 8) % 2 === 0);
  for (const g of ghosts) {
    if (g.respawn > 0) continue;
    const fx = scaredLook ? shared.scared[shared.ghosts.indexOf(g.fx)] : g.fx;
    ents.push({ gx: g.x, gy: g.y, draw: (x, y) => fx.draw(ctx, x, y + 6) });
    lights.push([g.x, g.y, 30, "ghost", 22]);
  }
  for (const b of bats) ents.push({ gx: b.x, gy: b.y, draw: (x, y) => b.fx.draw(ctx, x, y - 30) });
  ents.push({
    gx: kid.x, gy: kid.y,
    draw: (x, y) => {
      if (kid.invuln > 0 && kid.stun <= 0 && Math.floor(time * 12) % 2) return;
      const step = kid.moving ? 1 + (Math.floor(kid.walkT * 8) % 2) : 0;
      const set = kid.face === "front" ? (kid.flip ? S.KID.frontF : S.KID.front) : kid.flip ? S.KID.backF : S.KID.back;
      ctx.drawImage(set[step], x - 9, y - 23 - (step ? 1 : 0));
      if (kid.stun > 0) {
        for (let i = 0; i < 3; i++) {
          const a = time * 6 + (i * Math.PI * 2) / 3, sx = Math.round(x + Math.cos(a) * 7), sy = Math.round(y - 27 + Math.sin(a) * 2);
          ctx.fillStyle = "#ffe066";
          ctx.fillRect(sx - 1, sy, 3, 1);
          ctx.fillRect(sx, sy - 1, 1, 3);
        }
      }
    },
  });
  lights.push([kid.x, kid.y, 64, "kid", 10]);
  if (kid.power > 0) lights.push([kid.x, kid.y, 40, "candy", 12]);

  // each thing goes after every nearby house it stands in front of
  const hs = town.houses;
  for (const e of ents) {
    e.slot = 0;
    hs.forEach((h, i) => {
      const near = Math.abs(e.gx - (h.x0 + 1.5)) < 5.5 && Math.abs(e.gy - (h.y0 + 1.5)) < 5.5;
      if (near ? e.gx >= h.x1 || e.gy >= h.y1 : e.gx + e.gy > h.x1 + h.y1) e.slot = Math.max(e.slot, i + 1);
    });
  }
  ents.sort((a, b) => a.slot - b.slot || a.gx + a.gy - (b.gx + b.gy));
  let ei = 0;
  for (let i = 0; i <= hs.length; i++) {
    while (ei < ents.length && ents[ei].slot === i) {
      const e = ents[ei++], [x, y] = scr(e.gx, e.gy);
      if (x > -80 && x < W + 80 && y > -60 && y < H + 140) e.draw(x, y);
    }
    if (i < hs.length) {
      const h = hs[i], [x, y] = scr(h.x0, h.y0);
      // houses go see-through while the kid is behind them
      const behind = kid.x < h.x1 && kid.y < h.y1 && Math.abs(kid.x - h.x0 - 1.5) < 5.5 && Math.abs(kid.y - h.y0 - 1.5) < 5.5;
      const hides = behind && [-12, -6, 0].some((dy) => [-5, 0, 5].some((dx) => houseCovers(h, x, y, ksx + dx, ksy + dy - 2)));
      h.fade += ((hides ? 0.35 : 1) - h.fade) * Math.min(1, dtDraw * 10);
      ctx.globalAlpha = h.fade;
      ctx.drawImage(h.canvas, x - S.HOUSE_ORIGIN[0], y - S.HOUSE_ORIGIN[1]);
      ctx.globalAlpha = 1;
    }
  }

  // night: darken everything, then cut holes where there's light
  dctx.globalCompositeOperation = "source-over";
  dctx.clearRect(0, 0, W, H);
  dctx.fillStyle = "rgba(8,4,26,0.6)";
  dctx.fillRect(0, 0, W, H);
  dctx.globalCompositeOperation = "destination-out";
  const glows = [];
  for (const [gx, gy, r, kind, up = 0] of lights) {
    const [x, y] = scr(gx, gy);
    if (x < -r || x > W + r || y < -r - up || y > H + r + up) continue;
    const yy = y - up, gr = dctx.createRadialGradient(x, yy, 0, x, yy, r);
    gr.addColorStop(0, "rgba(0,0,0,1)");
    gr.addColorStop(1, "rgba(0,0,0,0)");
    dctx.fillStyle = gr;
    dctx.fillRect(x - r, yy - r, r * 2, r * 2);
    if (kind !== "kid") glows.push([x, yy, r, kind]);
  }
  ctx.drawImage(dark, 0, 0);
  ctx.globalCompositeOperation = "lighter";
  const tint = { warm: "255,140,40", green: "60,255,110", ghost: "120,150,255", candy: "255,120,200" };
  for (const [x, y, r, kind] of glows) {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${tint[kind]},0.16)`);
    gr.addColorStop(1, `rgba(${tint[kind]},0)`);
    ctx.fillStyle = gr;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = "source-over";

  // drifting fog over the whole street
  shared.fog.render();
  ctx.globalAlpha = 0.35;
  ctx.drawImage(shared.fog.canvas, 0, 0, shared.fog.w, shared.fog.h, -20, H - 220, W + 40, 240);
  ctx.globalAlpha = 1;

  for (const o of oneshots) {
    const [x, y] = scr(o.gx, o.gy);
    o.fx.draw(ctx, x, y - o.z);
  }
  for (const f of floaters) {
    const [x, y] = scr(f.gx, f.gy), a = Math.max(0, Math.min(1, (f.life - f.t) * 3));
    ctx.globalAlpha = a;
    S.text(ctx, f.text, x, y - 30 - f.t * 14, f.color, { font: "mini", align: "center" });
    ctx.globalAlpha = 1;
  }

  if (knock) {
    const [x, y] = scr(...knock.house.door), w = 20, f = knock.t / KNOCK_TIME;
    ctx.fillStyle = S.OUTLINE;
    ctx.fillRect(x - w / 2 - 1, y - 40, w + 2, 4);
    ctx.fillStyle = "#ff8a2a";
    ctx.fillRect(x - w / 2, y - 39, Math.round(w * f), 2);
  }

  if (state !== "title") drawHud(time);
  for (const s of screenFx) s.fx.draw(ctx, ...s.at());
  if (state === "title") drawTitle(time);
  if (state === "over") drawOver(time);
  if (stick.on && state === "play") {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(stick.x0, stick.y0, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillRect(Math.round(stick.x) - 3, Math.round(stick.y) - 3, 6, 6);
  }
}

function panel(x, y, w, h) {
  ctx.fillStyle = "rgba(10,6,24,0.72)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#2e2450";
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
}

function drawHud(time) {
  // candy count
  panel(6, 6, 74, 24);
  ctx.drawImage(S.CANDY[0], 0, 0, 11, 7, 10, 11, 22, 14);
  S.text(ctx, String(kid.candies), 38, 11, "#ffd34a", { scale: 2 });
  // how much super power is left
  if (kid.power > 0) {
    panel(6, 33, 74, 12);
    S.text(ctx, "SUPER", 10, 36, "#ff9ae0", { font: "mini" });
    ctx.fillStyle = "#2a1030";
    ctx.fillRect(34, 37, 42, 4);
    ctx.fillStyle = kid.power < 2 && Math.floor(time * 8) % 2 ? "#ffffff" : "#ff5ac8";
    ctx.fillRect(34, 37, Math.round((42 * kid.power) / POWER_TIME), 4);
  }
  if (banner && banner.t < 2.6) {
    ctx.globalAlpha = Math.min(1, (2.6 - banner.t) * 3);
    S.text(ctx, banner.text, W / 2, 36, banner.color, { align: "center" });
    ctx.globalAlpha = 1;
  }
  // timer
  const t = Math.ceil(timeLeft), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, "0");
  const urgent = timeLeft <= 10 && state === "play";
  panel(W / 2 - 34, 6, 68, 24);
  S.text(ctx, `${mm}:${ss}`, W / 2, 11, urgent && Math.floor(time * 4) % 2 ? "#ff4a5a" : "#f0eaff", { scale: 2, align: "center" });
  // houses and best
  const left = town.houses.filter((h) => !h.visited).length;
  panel(W - 92, 6, 86, 24);
  S.text(ctx, `HOUSES ${town.houses.length - left}/${town.houses.length}`, W - 49, 10, "#ffb347", { font: "mini", align: "center" });
  S.text(ctx, `BEST ${best}`, W - 49, 19, "#b9a6ff", { font: "mini", align: "center" });
  drawMinimap(time);
}

function drawMinimap(time) {
  const ox = W - 44, oy = H - 46, mp = (gx, gy) => [Math.round(ox + (gx - gy) * 1.5), Math.round(oy + (gx + gy) * 0.75)];
  panel(W - 86, H - 50, 82, 44);
  ctx.fillStyle = "#3a3450";
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (town.tile[y * N + x] === ROAD && (x + y) % 2 === 0) {
    const [px, py] = mp(x + 0.5, y + 0.5);
    ctx.fillRect(px, py, 1, 1);
  }
  for (const h of town.houses) {
    const [px, py] = mp(h.x0 + 1.5, h.y0 + 1.5);
    ctx.fillStyle = h.visited || h.kind === "dark" ? "#4a4560" : "#ff8a2a";
    ctx.fillRect(px - 2, py - 1, 4, 3);
  }
  ctx.fillStyle = "#9ab4ff";
  for (const g of ghosts) if (g.respawn <= 0) {
    const [px, py] = mp(g.x, g.y);
    ctx.fillRect(px, py, 2, 2);
  }
  if (superCandy && Math.floor(time * 6) % 2 === 0) {
    const [px, py] = mp(superCandy.x, superCandy.y);
    ctx.fillStyle = "#ff5ac8";
    ctx.fillRect(px - 1, py - 1, 3, 3);
  }
  if (Math.floor(time * 4) % 2 === 0) {
    const [px, py] = mp(kid.x, kid.y);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px - 1, py - 1, 3, 3);
  }
}

/** How far to shift the 270-pixel-tall title and results layouts to center them (up a little on short screens). */
const midY = () => Math.max(-20, Math.round((H - 270) / 2));

function drawTitle(time) {
  ctx.fillStyle = "rgba(6,3,18,0.62)";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(0, midY());
  drawTitleText(time);
  ctx.restore();
}

function drawTitleText(time) {
  const bob = Math.round(Math.sin(time * 2) * 2);
  S.text(ctx, "TRICK OR TREAT", W / 2, 28 + bob, "#ff8a2a", { scale: 4, align: "center" });
  S.text(ctx, "TOWN", W / 2, 64 + bob, "#b46cff", { scale: 3, align: "center" });
  const lines = [
    ["KNOCK ON DOORS WITH PUMPKINS FOR CANDY", "#ffe9b0"],
    ["GREEN WINDOWS AND GREEN FLAMES ARE TRICKS!", "#7dff8a"],
    ["DODGE GHOSTS, BATS AND STICKY WEBS", "#b9c6ff"],
    ["THEY MAKE YOU DROP CANDY - PICK IT BACK UP", "#b9c6ff"],
    ["GRAB A SUPER LOLLIPOP AND THE GHOSTS RUN AWAY!", "#ff9ae0"],
    [`COLLECT THE MOST CANDY IN ${GAME_TIME} SECONDS`, "#ffd34a"],
    ["MOVE: ARROWS / WASD  (OR DRAG ON TOUCH)", "#9a96b8"],
  ];
  lines.forEach(([s, c], i) => S.text(ctx, s, W / 2, 100 + i * 13, c, { align: "center" }));
  if (Math.floor(time * 2) % 2 === 0) S.text(ctx, "PRESS SPACE OR TAP TO START", W / 2, 202, "#ffffff", { scale: 2, align: "center" });
  if (best) S.text(ctx, `BEST: ${best} CANDIES`, W / 2, 230, "#b9a6ff", { align: "center" });
  ctx.drawImage(S.KID.front[Math.floor(time * 4) % 2 + 1], W / 2 - 176, 194 + bob);
  ctx.drawImage(S.PUMPKIN.lit[0], W / 2 + 164, 204);
}

function drawOver(time) {
  if (stateT < 1.2) return;
  ctx.save();
  ctx.translate(0, midY());
  ctx.fillStyle = "rgba(6,3,18,0.55)";
  ctx.fillRect(0, 96, W, 120);
  const visited = town.houses.filter((h) => h.visited).length;
  S.text(ctx, `YOU GOT ${kid.candies} ${kid.candies === 1 ? "CANDY" : "CANDIES"}!`, W / 2, 110, "#ffd34a", { scale: 3, align: "center" });
  S.text(ctx, newBest ? "NEW BEST SCORE!" : `BEST: ${best}`, W / 2, 144, newBest ? "#7dff8a" : "#b9a6ff", { scale: 2, align: "center" });
  S.text(ctx, `HOUSES VISITED: ${visited}/${town.houses.length}`, W / 2, 168, "#f0eaff", { align: "center" });
  if (stateT > 1.5 && Math.floor(time * 2) % 2 === 0) S.text(ctx, "PRESS SPACE OR TAP TO PLAY AGAIN", W / 2, 190, "#ffffff", { align: "center" });
  ctx.restore();
}

// ---------------------------------------------------------------- loop

reset();
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  dtDraw = dt;
  draw(now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (import.meta.env?.DEV) window.__tot = { kid: () => kid, town: () => town, ghosts: () => ghosts, setTime: (t) => (timeLeft = t), superIn: (t) => (superTimer = t), superCandy: () => superCandy };

// Hand-made pixel sprites (kid, houses, pumpkins, props, candy) drawn in code, plus pixel text.

import { PAL } from "../vendor/pixelfx/core/index.js";
import { rasterText, textWidth } from "../vendor/pixelfx/core/font.js";

export const OUTLINE = "#0d0816";
export const CANDY_COLORS = PAL.candy;

export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** A sprite canvas drawn by fn(r) where r(x, y, w, h, color) fills pixels; outlined in dark if outline. */
export function sprite(w, h, fn, outline = true) {
  const c = canvas(w + 2, h + 2), g = c.getContext("2d");
  const r = (x, y, ww = 1, hh = 1, col) => {
    g.fillStyle = col;
    g.fillRect(x + 1, y + 1, ww, hh);
  };
  fn(r, g);
  if (outline) addOutline(c);
  return c;
}

export function addOutline(c, color = OUTLINE) {
  const g = c.getContext("2d"), { width: w, height: h } = c;
  const d = g.getImageData(0, 0, w, h), a = d.data, src = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) src[i] = a[i * 4 + 3] > 40 ? 1 : 0;
  const [cr, cg, cb] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (src[i]) continue;
      if ((x > 0 && src[i - 1]) || (x < w - 1 && src[i + 1]) || (y > 0 && src[i - w]) || (y < h - 1 && src[i + w])) {
        a[i * 4] = cr; a[i * 4 + 1] = cg; a[i * 4 + 2] = cb; a[i * 4 + 3] = 255;
      }
    }
  g.putImageData(d, 0, 0);
}

export function flipped(c) {
  const f = canvas(c.width, c.height), g = f.getContext("2d");
  g.scale(-1, 1);
  g.drawImage(c, -c.width, 0);
  return f;
}

// ---------------------------------------------------------------- the kid: a little witch with a pumpkin bucket

function kid(back, step) {
  return sprite(16, 24, (r) => {
    const HAT = "#6b3fa0", HATL = "#8a5cc4", BRIM = "#3a1f5e", BAND = "#ff8a2a";
    const HAIR = "#8a3f1c", SKIN = "#f4c7a1", DRESS = "#4b2f80", DRESSL = "#6446a6", TRIM = "#ff8a2a";
    const SOCK = "#ff8a2a", SOCKD = "#24182e", BOOT = "#1f1426";
    // legs: striped stockings, one lifts on each step
    const legs = [[5, step === 1 ? -1 : 0], [9, step === 2 ? -1 : 0]];
    for (const [x, dy] of legs) {
      for (let y = 18; y < 21; y++) r(x, y + dy, 2, 1, y % 2 ? SOCK : SOCKD);
      r(x - (x < 8 ? 1 : 0), 21 + dy, 3, 1, BOOT);
    }
    // dress, wider at the hem, with an orange trim
    const rows = [[6, 10], [5, 11], [5, 11], [4, 12], [4, 12], [3, 13], [3, 13]];
    rows.forEach(([a, b], i) => {
      r(a, 11 + i, b - a, 1, DRESS);
      r(a, 11 + i, 1, 1, DRESSL);
    });
    r(3, 17, 10, 1, TRIM);
    // arms
    r(back ? 13 : 2, 12, 1, 3, DRESS);
    r(back ? 13 : 2, 15, 1, 1, SKIN);
    r(back ? 2 : 13, 12, 1, 2, DRESS);
    r(back ? 2 : 13, 14, 1, 1, SKIN);
    // head
    r(4, 6, 8, 5, back ? HAIR : SKIN);
    r(3, 6, 1, 5, HAIR);
    r(12, 6, 1, 5, HAIR);
    if (!back) {
      r(4, 6, 8, 1, HAIR);
      r(5, 8, 1, 1, "#1a1024");
      r(10, 8, 1, 1, "#1a1024");
      r(4, 9, 1, 1, "#f08a8a");
      r(11, 9, 1, 1, "#f08a8a");
      r(7, 10, 2, 1, "#a33a4a");
    } else {
      r(4, 10, 8, 1, "#6a2f14");
    }
    // the hat: a wide brim, an orange band, a cone bent over at the tip
    r(1, 5, 14, 1, BRIM);
    r(4, 4, 8, 1, BAND);
    const cone = [[5, 11], [5, 10], [6, 10], [6, 9], [7, 9], [8, 10]];
    cone.forEach(([a, b], i) => {
      r(a, 3 - i, b - a, 1, HAT);
      r(a, 3 - i, 1, 1, HATL);
    });
    r(10, -2, 2, 1, HAT);
    // the pumpkin bucket in the near hand
    const bx = back ? 0 : 12;
    if (!back) {
      r(bx, 13, 4, 1, "#24182e");
      r(bx, 14, 4, 4, "#ff8a2a");
      r(bx, 14, 1, 4, "#c45a12");
      r(bx + 1, 15, 1, 1, "#ffe066");
      r(bx + 3, 15, 1, 1, "#ffe066");
      r(bx + 1, 17, 3, 1, "#c45a12");
    }
  });
}

export const KID = {
  front: [kid(false, 0), kid(false, 1), kid(false, 2)],
  back: [kid(true, 0), kid(true, 1), kid(true, 2)],
};
KID.frontF = KID.front.map(flipped);
KID.backF = KID.back.map(flipped);

// ---------------------------------------------------------------- props

function pumpkin(lit, flick) {
  return sprite(11, 9, (r) => {
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 11; x++) {
        const dx = (x - 5) / 5.6, dy = (y - 4.2) / 3.9;
        if (dx * dx + dy * dy > 1) continue;
        const rib = x === 3 || x === 7;
        r(x, y + 1, 1, 1, rib ? "#c4570f" : x < 3 ? "#ff9a3c" : x > 8 ? "#d9661a" : "#f47c1f");
      }
    r(5, 0, 2, 2, "#3f6a2a");
    if (lit) {
      const c = flick ? "#ffd04a" : "#ffe98a";
      r(2, 3, 2, 2, c); r(7, 3, 2, 2, c);
      r(2, 6, 7, 1, c); r(3, 7, 1, 1, c); r(5, 7, 1, 1, c); r(7, 7, 1, 1, c);
      r(5, 5, 1, 1, c);
    } else {
      const c = "#5a2a0a";
      r(2, 3, 2, 2, c); r(7, 3, 2, 2, c); r(2, 6, 7, 1, c);
    }
  });
}
export const PUMPKIN = { lit: [pumpkin(true, false), pumpkin(true, true)], dark: pumpkin(false) };

export const TOMBSTONE = sprite(10, 13, (r) => {
  for (let y = 0; y < 13; y++)
    for (let x = 0; x < 10; x++) {
      const top = y < 4 && (x - 4.5) ** 2 / 20 + (y - 4) ** 2 / 16 > 1;
      if (top) continue;
      r(x, y, 1, 1, x > 6 ? "#4f4d63" : x < 2 ? "#8c8aa3" : "#6d6b85");
    }
  r(4, 3, 2, 6, "#3a384c");
  r(2, 5, 6, 2, "#3a384c");
  r(0, 11, 10, 2, "#2b3d2a");
});

function line(r, x0, y0, x1, y1, w, col) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0;
  for (let i = 0; i <= n; i++) {
    const t = n ? i / n : 0, ww = Math.max(1, Math.round(w * (1 - t * 0.6)));
    r(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), ww, 1, col);
  }
}
export const TREE = sprite(34, 46, (r) => {
  const D = "#2b1d1a", L = "#47302a";
  line(r, 16, 45, 17, 14, 4, D);
  line(r, 16, 45, 17, 18, 1, L);
  line(r, 17, 26, 6, 14, 2, D);
  line(r, 6, 14, 2, 6, 1, D);
  line(r, 9, 17, 9, 8, 1, D);
  line(r, 18, 22, 30, 12, 2, D);
  line(r, 30, 12, 32, 4, 1, D);
  line(r, 26, 15, 26, 7, 1, D);
  line(r, 17, 16, 14, 2, 1, D);
  line(r, 17, 16, 21, 4, 1, D);
  r(13, 44, 8, 1, D);
});

function candy(col) {
  const light = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const m = (v) => Math.min(255, v + 90);
    return `rgb(${m(n >> 16)},${m((n >> 8) & 255)},${m(n & 255)})`;
  };
  return sprite(9, 5, (r) => {
    for (let y = 0; y < 5; y++) for (let x = 2; x < 7; x++) if ((x - 4) ** 2 + (y - 2) ** 2 <= 5) r(x, y, 1, 1, col);
    r(3, 1, 1, 1, "#ffffff");
    const w = light(col);
    r(1, 2, 1, 1, w); r(0, 1, 1, 3, w);
    r(7, 2, 1, 1, w); r(8, 1, 1, 3, w);
  });
}
export const CANDY = CANDY_COLORS.map(candy);

/** The super candy: a big swirled lollipop. */
export const LOLLIPOP = sprite(13, 21, (r) => {
  const bands = ["#ff4a8a", "#ffffff", "#ffd23c", "#ffffff", "#3cc8ff", "#ffffff"];
  r(6, 12, 1, 9, "#f0e8f8");
  r(7, 13, 1, 8, "#b8acc8");
  for (let y = 0; y < 13; y++)
    for (let x = 0; x < 13; x++) {
      const dx = x - 6, dy = y - 6, rr = Math.hypot(dx, dy);
      if (rr > 6.3) continue;
      const n = Math.floor((Math.atan2(dy, dx) / (Math.PI * 2) + rr / 6) * 6);
      r(x, y, 1, 1, bands[((n % 6) + 6) % 6]);
    }
  r(3, 3, 2, 1, "#ffffff");
  r(3, 4, 1, 1, "#ffffff");
});

// ---------------------------------------------------------------- houses

export const WALLS = [
  { L: "#4c3c60", R: "#372b48", line: "#2b2139", trim: "#7a6896" },
  { L: "#3c4c5e", R: "#2c3846", line: "#212a35", trim: "#6a7e96" },
  { L: "#5c4838", R: "#443428", line: "#30241b", trim: "#8e765e" },
  { L: "#405248", R: "#2f3d36", line: "#222c27", trim: "#6e8a7a" },
];
export const ROOFS = [
  { L: "#2c2440", R: "#1e192c", line: "#141020" },
  { L: "#4a2026", R: "#33161b", line: "#220e12" },
  { L: "#24323a", R: "#18232a", line: "#10181d" },
];

export const HOUSE_WH = 34, HOUSE_RH = 30;
const OX = 56, OY = HOUSE_WH + HOUSE_RH + 10; // where the footprint's top corner sits in the house canvas
export const HOUSE_ORIGIN = [OX, OY];

const gyL = (x) => 24 + ((x + 48) >> 1); // ground line of the front-left wall, x in [-48, -1]
const gyR = (x) => gyL(-1 - x); // ...of the front-right wall, x in [0, 47]

/**
 * A 3x3-tile house, as a canvas. lights: "warm" | "green" | "off"; decor: string lights and cobwebs.
 */
export function renderHouse({ wall, roof, lights, decor, web, chimney }) {
  const c = canvas(OX * 2, OY + 52), g = c.getContext("2d");
  const r = (x, y, w, h, col) => {
    g.fillStyle = col;
    g.fillRect(OX + x, OY + y, w, h);
  };
  const H = HOUSE_WH;
  // walls with clapboard lines and a stone footing
  for (let x = -48; x < 48; x++) {
    const left = x < 0, gy = left ? gyL(x) : gyR(x), W = left ? wall.L : wall.R;
    r(x, gy - H, 1, H, W);
    for (let k = 4; k < H; k += 4) r(x, gy - k, 1, 1, wall.line);
    r(x, gy - 3, 1, 3, left ? "#2e2a36" : "#221f29");
  }
  r(-1, gyL(-1) - H, 1, H - 3, wall.trim);
  r(-48, gyL(-48) - H, 1, H - 3, wall.trim);
  // windows: lit warm, sickly green, or dark glass
  const pane = lights === "warm" ? ["#ffb347", "#ffe28a", "#9a4a14"] : lights === "green" ? ["#56e07a", "#b8ffc4", "#1e6a34"] : ["#1b1e30", "#2e3550", "#12141f"];
  const windowAt = (x0, left) => {
    for (let x = x0 - 1; x < x0 + 8; x++) {
      const gy = left ? gyL(x) : gyR(x);
      r(x, gy - 24, 1, 11, "#1a1424");
    }
    for (let x = x0; x < x0 + 7; x++) {
      const gy = left ? gyL(x) : gyR(x), i = x - x0;
      r(x, gy - 23, 1, 9, pane[0]);
      if (i === 3) r(x, gy - 23, 1, 9, pane[2]);
      r(x, gy - 19, 1, 1, pane[2]);
      if (i < 2) r(x, gy - 23 + i, 1, 2, pane[1]);
    }
  };
  windowAt(-44, true);
  windowAt(-13, true);
  windowAt(7, false);
  windowAt(31, false);
  // the door in the middle of the front-left wall
  for (let x = -29; x < -19; x++) {
    const gy = gyL(x), edge = x === -29 || x === -20;
    r(x, gy - 18, 1, 16, edge ? "#1a1010" : "#4a2a1a");
    if (!edge && x % 3 === 0) r(x, gy - 16, 1, 12, "#3a2014");
  }
  r(-23, gyL(-23) - 10, 1, 1, "#ffd34a");
  if (lights !== "off") {
    r(-26, gyL(-26) - 15, 3, 3, pane[1]);
    r(-25, gyL(-25) - 22, 2, 2, lights === "warm" ? "#fff2b0" : "#c8ffd2");
  }
  // a pyramid roof with a little overhang and shingle rows
  const e = 24 - H, apex = e - HOUSE_RH;
  for (let x = -52; x < 52; x++) {
    const left = x < 0, t = left ? (x + 52) / 52 : (51 - x) / 52;
    const top = Math.round(e + t * (apex - e)), bot = Math.round(e + t * 26);
    r(x, top, 1, bot - top + 1, left ? roof.L : roof.R);
    for (let y = bot; y > top; y -= 4) r(x, y, 1, 1, roof.line);
    for (let y = bot - 2; y > top; y -= 4) if (((x >> 2) + ((bot - y) >> 2)) % 2) r(x, y, 1, 1, roof.line);
    r(x, bot, 1, 1, "#0d0816");
  }
  if (chimney) {
    for (let x = 18; x < 26; x++) r(x, apex + 14 - (x - 18) / 2, 1, 12, x < 22 ? "#5a3030" : "#402222");
    r(18, apex + 13, 8, 2, "#2a1818");
  }
  // string lights along both eaves
  if (decor) {
    const bulbs = ["#ff8a2a", "#b46cff", "#7dff6a"];
    for (let x = -50, i = 0; x < 51; x += 4, i++) {
      const left = x < 0, t = left ? (x + 52) / 52 : (51 - x) / 52;
      r(x, Math.round(e + t * 26) + 2, 1, 1, bulbs[i % 3]);
    }
  }
  if (web) {
    g.strokeStyle = "rgba(220,220,235,0.55)";
    g.lineWidth = 1;
    const cx = OX - 47.5, cy = OY + gyL(-48) - H + 0.5;
    for (let a = 0; a < 4; a++) {
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a * 0.45) * 12, cy + Math.sin(a * 0.45) * 12);
      g.stroke();
    }
    for (const rr of [5, 9]) {
      g.beginPath();
      g.arc(cx, cy, rr, 0, 1.4);
      g.stroke();
    }
  }
  return c;
}

// ---------------------------------------------------------------- text

/** Pixel text with a dark outline. align: "left" | "center" | "right". */
export function text(ctx, str, x, y, color, { scale = 1, font = "big", align = "left", outline = OUTLINE } = {}) {
  str = String(str);
  const w = textWidth(str, font) * scale;
  const x0 = Math.round(align === "center" ? x - w / 2 : align === "right" ? x - w : x), y0 = Math.round(y);
  if (outline) {
    ctx.fillStyle = outline;
    rasterText(str, font, (px, py) => ctx.fillRect(x0 + px * scale - 1, y0 + py * scale - 1, scale + 2, scale + 2));
    rasterText(str, font, (px, py) => ctx.fillRect(x0 + px * scale, y0 + py * scale + 1, scale + 1, scale + 1));
  }
  ctx.fillStyle = color;
  rasterText(str, font, (px, py) => ctx.fillRect(x0 + px * scale, y0 + py * scale, scale, scale));
  return w;
}
export { textWidth };

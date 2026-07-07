import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const outDir = path.resolve("assets/cards");
fs.mkdirSync(outDir, { recursive: true });

const WIDTH = 500;
const HEIGHT = 830;
const SUITS = ["denari", "coppe", "spade", "bastoni"];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const colors = {
  paper: [246, 233, 203],
  paperDark: [224, 198, 155],
  ink: [42, 34, 25],
  black: [22, 24, 24],
  red: [148, 37, 45],
  redDark: [98, 24, 36],
  gold: [194, 137, 30],
  goldLight: [236, 194, 87],
  blue: [33, 79, 127],
  blueLight: [96, 142, 177],
  green: [48, 105, 62],
  greenLight: [112, 151, 80],
  brown: [115, 70, 39],
  brownLight: [174, 119, 66],
  cream: [255, 247, 226],
  skin: [214, 153, 104]
};

const suitMeta = {
  denari: {
    accent: colors.gold,
    secondary: colors.red,
    panel: [243, 218, 137]
  },
  coppe: {
    accent: colors.red,
    secondary: colors.blue,
    panel: [236, 185, 160]
  },
  spade: {
    accent: colors.blue,
    secondary: colors.gold,
    panel: [188, 211, 222]
  },
  bastoni: {
    accent: colors.green,
    secondary: colors.brown,
    panel: [198, 214, 158]
  }
};

const pipLayouts = {
  1: [[250, 415, 1.55]],
  2: [
    [250, 250, 1.05],
    [250, 580, 1.05]
  ],
  3: [
    [250, 210, 0.98],
    [250, 415, 1.05],
    [250, 620, 0.98]
  ],
  4: [
    [165, 230, 0.92],
    [335, 230, 0.92],
    [165, 600, 0.92],
    [335, 600, 0.92]
  ],
  5: [
    [165, 220, 0.88],
    [335, 220, 0.88],
    [250, 415, 0.98],
    [165, 610, 0.88],
    [335, 610, 0.88]
  ],
  6: [
    [160, 190, 0.82],
    [340, 190, 0.82],
    [160, 415, 0.82],
    [340, 415, 0.82],
    [160, 640, 0.82],
    [340, 640, 0.82]
  ],
  7: [
    [160, 175, 0.76],
    [340, 175, 0.76],
    [250, 300, 0.82],
    [160, 415, 0.76],
    [340, 415, 0.76],
    [160, 655, 0.76],
    [340, 655, 0.76]
  ]
};

for (const suit of SUITS) {
  for (const rank of RANKS) {
    drawCard(suit, rank);
  }
}

drawBack();
console.log(`Generated 40 original La Scopa card faces in ${outDir}`);

function drawCard(suit, rank) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const meta = suitMeta[suit];
  agedPaper(canvas, rank * 19 + SUITS.indexOf(suit) * 37);
  drawCardFrame(canvas, meta);
  drawCornerMedallions(canvas, suit, meta);

  if (rank <= 7) {
    drawNumberCard(canvas, suit, rank, meta);
  } else {
    drawCourtCard(canvas, suit, rank, meta);
  }

  writePng(path.join(outDir, `${suit}-${rank}.png`), canvas);
}

function drawBack() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  fill(canvas, [128, 32, 48]);
  roundedRect(canvas, 35, 35, WIDTH - 70, HEIGHT - 70, 24, colors.redDark);
  strokeRoundedRect(canvas, 35, 35, WIDTH - 70, HEIGHT - 70, 24, colors.gold, 9, colors.redDark);
  strokeRoundedRect(canvas, 62, 62, WIDTH - 124, HEIGHT - 124, 18, colors.cream, 4, colors.redDark);

  for (let y = 120; y < HEIGHT - 120; y += 82) {
    for (let x = 82; x < WIDTH - 82; x += 82) {
      diamond(canvas, x, y, 25, colors.gold);
      diamond(canvas, x, y, 13, colors.redDark);
      circle(canvas, x, y, 5, colors.cream);
    }
  }

  roundedRect(canvas, 152, 286, 196, 258, 20, colors.cream);
  strokeRoundedRect(canvas, 152, 286, 196, 258, 20, colors.gold, 8);
  drawSuitSymbol(canvas, "denari", 207, 370, 0.8);
  drawSuitSymbol(canvas, "coppe", 293, 370, 0.75);
  drawSuitSymbol(canvas, "spade", 207, 470, 0.75);
  drawSuitSymbol(canvas, "bastoni", 293, 470, 0.75);

  writePng(path.join(outDir, "back.png"), canvas);
}

function agedPaper(canvas, seed) {
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const grain = pseudoNoise(x, y, seed) * 18 - 9;
      const vignette = Math.hypot((x - WIDTH / 2) / WIDTH, (y - HEIGHT / 2) / HEIGHT) * 34;
      pixel(canvas, x, y, [
        clamp(colors.paper[0] + grain - vignette * 0.6),
        clamp(colors.paper[1] + grain - vignette * 0.48),
        clamp(colors.paper[2] + grain - vignette * 0.28)
      ]);
    }
  }
}

function drawCardFrame(canvas, meta) {
  roundedRect(canvas, 18, 18, WIDTH - 36, HEIGHT - 36, 24, colors.ink);
  roundedRect(canvas, 30, 30, WIDTH - 60, HEIGHT - 60, 18, colors.paper);
  strokeRoundedRect(canvas, 48, 48, WIDTH - 96, HEIGHT - 96, 16, meta.accent, 7);
  strokeRoundedRect(canvas, 68, 68, WIDTH - 136, HEIGHT - 136, 10, colors.ink, 3);

  for (const [x, y] of [
    [83, 83],
    [WIDTH - 83, 83],
    [83, HEIGHT - 83],
    [WIDTH - 83, HEIGHT - 83]
  ]) {
    circle(canvas, x, y, 13, meta.accent);
    circle(canvas, x, y, 6, colors.cream);
  }
}

function drawCornerMedallions(canvas, suit, meta) {
  for (const [x, y] of [
    [95, 124],
    [405, 706]
  ]) {
    roundedRect(canvas, x - 32, y - 44, 64, 88, 10, meta.panel);
  strokeRoundedRect(canvas, x - 32, y - 44, 64, 88, 10, colors.ink, 3, meta.panel);
    drawSuitSymbol(canvas, suit, x, y, 0.42);
  }
}

function drawNumberCard(canvas, suit, rank) {
  const layout = pipLayouts[rank];
  for (const [x, y, scale] of layout) {
    drawSuitSymbol(canvas, suit, x, y, scale);
  }

  if (rank === 7 && suit === "denari") {
    strokeRoundedRect(canvas, 164, 344, 172, 142, 16, colors.red, 5);
    drawSun(canvas, 250, 415, 48, colors.goldLight, colors.red);
  }
}

function drawCourtCard(canvas, suit, rank, meta) {
  roundedRect(canvas, 112, 150, 276, 530, 18, meta.panel);
  strokeRoundedRect(canvas, 112, 150, 276, 530, 18, colors.ink, 5, meta.panel);
  strokeRoundedRect(canvas, 132, 170, 236, 490, 10, colors.cream, 4, meta.panel);

  if (rank === 8) {
    drawFante(canvas, suit, meta);
  } else if (rank === 9) {
    drawCavallo(canvas, suit, meta);
  } else {
    drawRe(canvas, suit, meta);
  }

  drawSuitSymbol(canvas, suit, 250, 620, 0.72);
}

function drawFante(canvas, suit, meta) {
  circle(canvas, 250, 266, 38, colors.skin);
  polygon(canvas, [[204, 235], [250, 185], [296, 235], [282, 250], [218, 250]], meta.accent);
  roundedRect(canvas, 192, 320, 116, 180, 18, meta.accent);
  polygon(canvas, [[192, 340], [132, 450], [175, 470], [215, 370]], meta.secondary);
  polygon(canvas, [[308, 340], [368, 450], [325, 470], [285, 370]], meta.secondary);
  roundedRect(canvas, 210, 498, 34, 92, 12, colors.blue);
  roundedRect(canvas, 256, 498, 34, 92, 12, colors.blue);
  circle(canvas, 232, 278, 4, colors.ink);
  circle(canvas, 268, 278, 4, colors.ink);
  line(canvas, 232, 302, 268, 302, colors.ink, 4);
  drawSuitSymbol(canvas, suit, 166, 468, 0.48);
  drawSuitSymbol(canvas, suit, 334, 468, 0.48);
}

function drawCavallo(canvas, suit, meta) {
  ellipse(canvas, 244, 405, 96, 52, colors.brownLight);
  roundedRect(canvas, 300, 360, 58, 86, 20, colors.brownLight);
  circle(canvas, 320, 338, 24, colors.brownLight);
  polygon(canvas, [[340, 315], [368, 292], [360, 332]], colors.brown);
  circle(canvas, 331, 337, 4, colors.ink);
  roundedRect(canvas, 172, 445, 22, 112, 9, colors.brown);
  roundedRect(canvas, 275, 445, 22, 112, 9, colors.brown);
  circle(canvas, 228, 276, 30, colors.skin);
  polygon(canvas, [[198, 248], [228, 205], [258, 248]], meta.secondary);
  roundedRect(canvas, 194, 306, 70, 106, 14, meta.accent);
  polygon(canvas, [[262, 318], [330, 370], [304, 404], [248, 350]], meta.secondary);
  drawSuitSymbol(canvas, suit, 178, 360, 0.5);
}

function drawRe(canvas, suit, meta) {
  roundedRect(canvas, 150, 430, 200, 132, 22, colors.brown);
  roundedRect(canvas, 174, 348, 152, 180, 22, meta.accent);
  polygon(canvas, [[170, 222], [206, 266], [250, 214], [294, 266], [330, 222], [316, 292], [184, 292]], colors.gold);
  circle(canvas, 250, 302, 42, colors.skin);
  circle(canvas, 232, 310, 4, colors.ink);
  circle(canvas, 268, 310, 4, colors.ink);
  line(canvas, 230, 334, 270, 334, colors.ink, 4);
  polygon(canvas, [[178, 370], [100, 470], [146, 496], [198, 404]], meta.secondary);
  polygon(canvas, [[322, 370], [400, 470], [354, 496], [302, 404]], meta.secondary);
  roundedRect(canvas, 212, 532, 30, 66, 10, colors.blue);
  roundedRect(canvas, 258, 532, 30, 66, 10, colors.blue);
  drawSuitSymbol(canvas, suit, 250, 438, 0.48);
}

function drawSuitSymbol(canvas, suit, x, y, scale) {
  if (suit === "denari") {
    drawDenari(canvas, x, y, scale);
  } else if (suit === "coppe") {
    drawCoppe(canvas, x, y, scale);
  } else if (suit === "spade") {
    drawSpade(canvas, x, y, scale);
  } else {
    drawBastoni(canvas, x, y, scale);
  }
}

function drawDenari(canvas, x, y, scale) {
  const radius = Math.round(42 * scale);
  circle(canvas, x, y, radius, colors.gold);
  circle(canvas, x, y, Math.round(radius * 0.74), colors.goldLight);
  drawSun(canvas, x, y, Math.round(radius * 0.65), colors.gold, colors.red);
}

function drawSun(canvas, x, y, radius, fillColor, accentColor) {
  const points = [];
  for (let index = 0; index < 16; index += 1) {
    const angle = (Math.PI * 2 * index) / 16 - Math.PI / 2;
    const r = index % 2 === 0 ? radius : radius * 0.55;
    points.push([x + Math.cos(angle) * r, y + Math.sin(angle) * r]);
  }
  polygon(canvas, points, accentColor);
  circle(canvas, x, y, Math.round(radius * 0.44), fillColor);
}

function drawCoppe(canvas, x, y, scale) {
  const w = 84 * scale;
  const h = 70 * scale;
  polygon(canvas, [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w * 0.32, y + h * 0.18], [x - w * 0.32, y + h * 0.18]], colors.red);
  strokePolygon(canvas, [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w * 0.32, y + h * 0.18], [x - w * 0.32, y + h * 0.18]], colors.ink, Math.max(2, 4 * scale));
  roundedRect(canvas, x - 9 * scale, y + h * 0.14, 18 * scale, 42 * scale, 5 * scale, colors.gold);
  roundedRect(canvas, x - 38 * scale, y + h * 0.63, 76 * scale, 12 * scale, 4 * scale, colors.gold);
  line(canvas, x - w * 0.34, y - h * 0.2, x + w * 0.34, y - h * 0.2, colors.goldLight, Math.max(2, 5 * scale));
}

function drawSpade(canvas, x, y, scale) {
  const h = 116 * scale;
  line(canvas, x, y - h / 2, x, y + h / 2, colors.blue, Math.max(5, 12 * scale));
  triangle(canvas, x, y - h * 0.64, 23 * scale, 45 * scale, colors.blue);
  roundedRect(canvas, x - 44 * scale, y + h * 0.12, 88 * scale, 13 * scale, 4 * scale, colors.gold);
  circle(canvas, x, y + h * 0.28, 10 * scale, colors.red);
}

function drawBastoni(canvas, x, y, scale) {
  const h = 105 * scale;
  roundedRect(canvas, x - 13 * scale, y - h / 2, 26 * scale, h, 13 * scale, colors.brown);
  circle(canvas, x, y - h * 0.24, 19 * scale, colors.green);
  circle(canvas, x, y + h * 0.17, 17 * scale, colors.green);
  circle(canvas, x, y + h * 0.48, 12 * scale, colors.brownLight);
  line(canvas, x - 8 * scale, y - h * 0.43, x + 8 * scale, y + h * 0.42, colors.ink, Math.max(1, 3 * scale));
}

function createCanvas(width, height) {
  return {
    width,
    height,
    data: Buffer.alloc(width * height * 3)
  };
}

function writePng(file, canvas) {
  const scanlines = Buffer.alloc((canvas.width * 3 + 1) * canvas.height);

  for (let y = 0; y < canvas.height; y += 1) {
    const rowStart = y * (canvas.width * 3 + 1);
    scanlines[rowStart] = 0;
    canvas.data.copy(scanlines, rowStart + 1, y * canvas.width * 3, (y + 1) * canvas.width * 3);
  }

  const chunks = [
    chunk("IHDR", Buffer.concat([u32(canvas.width), u32(canvas.height), Buffer.from([8, 2, 0, 0, 0])])),
    chunk("IDAT", zlib.deflateSync(scanlines)),
    chunk("IEND", Buffer.alloc(0))
  ];

  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks]));
}

function fill(canvas, color) {
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      pixel(canvas, x, y, color);
    }
  }
}

function roundedRect(canvas, x, y, width, height, radius, color) {
  const left = Math.round(x);
  const top = Math.round(y);
  const right = Math.round(x + width);
  const bottom = Math.round(y + height);
  const r = Math.max(0, radius);

  for (let yy = top; yy < bottom; yy += 1) {
    for (let xx = left; xx < right; xx += 1) {
      const dx = xx < left + r ? left + r - xx : xx > right - r ? xx - (right - r) : 0;
      const dy = yy < top + r ? top + r - yy : yy > bottom - r ? yy - (bottom - r) : 0;

      if (dx * dx + dy * dy <= r * r) {
        pixel(canvas, xx, yy, color);
      }
    }
  }
}

function strokeRoundedRect(canvas, x, y, width, height, radius, color, thickness, innerColor = colors.paper) {
  roundedRect(canvas, x, y, width, height, radius, color);
  roundedRect(
    canvas,
    x + thickness,
    y + thickness,
    width - thickness * 2,
    height - thickness * 2,
    Math.max(0, radius - thickness),
    innerColor
  );
}

function circle(canvas, cx, cy, radius, color) {
  const r = Math.round(radius);
  for (let y = Math.round(cy - r); y <= cy + r; y += 1) {
    for (let x = Math.round(cx - r); x <= cx + r; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        pixel(canvas, x, y, color);
      }
    }
  }
}

function ellipse(canvas, cx, cy, rx, ry, color) {
  for (let y = Math.round(cy - ry); y <= cy + ry; y += 1) {
    for (let x = Math.round(cx - rx); x <= cx + rx; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        pixel(canvas, x, y, color);
      }
    }
  }
}

function line(canvas, x0, y0, x1, y1, color, thickness = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i += 1) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    circle(canvas, x, y, thickness / 2, color);
  }
}

function triangle(canvas, cx, cy, halfWidth, height, color) {
  polygon(canvas, [[cx, cy], [cx - halfWidth, cy + height], [cx + halfWidth, cy + height]], color);
}

function diamond(canvas, cx, cy, radius, color) {
  polygon(canvas, [[cx, cy - radius], [cx + radius, cy], [cx, cy + radius], [cx - radius, cy]], color);
}

function polygon(canvas, points, color) {
  const minX = Math.floor(Math.min(...points.map((point) => point[0])));
  const maxX = Math.ceil(Math.max(...points.map((point) => point[0])));
  const minY = Math.floor(Math.min(...points.map((point) => point[1])));
  const maxY = Math.ceil(Math.max(...points.map((point) => point[1])));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) {
        pixel(canvas, x, y, color);
      }
    }
  }
}

function strokePolygon(canvas, points, color, thickness) {
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    line(canvas, current[0], current[1], next[0], next[1], color, thickness);
  }
}

function pointInPolygon(x, y, points) {
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pixel(canvas, x, y, color) {
  const px = Math.round(x);
  const py = Math.round(y);

  if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) {
    return;
  }

  const offset = (py * canvas.width + px) * 3;
  canvas.data[offset] = clamp(color[0]);
  canvas.data[offset + 1] = clamp(color[1]);
  canvas.data[offset + 2] = clamp(color[2]);
}

function pseudoNoise(x, y, seed) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function clamp(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const crcBuffer = Buffer.concat([typeBuffer, data]);
  return Buffer.concat([u32(data.length), typeBuffer, data, u32(crc32(crcBuffer))]);
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0, 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

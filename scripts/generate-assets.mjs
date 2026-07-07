import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const outDir = path.resolve("assets");
fs.mkdirSync(outDir, { recursive: true });

const palette = {
  cream: [244, 233, 212],
  green: [19, 39, 31],
  greenSoft: [36, 74, 59],
  gold: [183, 129, 22],
  red: [142, 43, 61],
  blue: [39, 93, 140],
  white: [255, 248, 234],
  ink: [24, 37, 31]
};

writePng(path.join(outDir, "icon.png"), 1024, 1024, (canvas) => {
  fill(canvas, palette.cream);
  roundedRect(canvas, 204, 146, 616, 732, 52, palette.white);
  strokeRect(canvas, 204, 146, 616, 732, 52, palette.gold, 18);
  circle(canvas, 382, 366, 78, palette.gold);
  cup(canvas, 642, 368, 92, palette.red);
  sword(canvas, 390, 646, 190, palette.blue);
  baton(canvas, 642, 642, 190, palette.greenSoft);
});

writePng(path.join(outDir, "splash-icon.png"), 1024, 1024, (canvas) => {
  fill(canvas, palette.cream);
  roundedRect(canvas, 262, 186, 500, 652, 48, palette.white);
  strokeRect(canvas, 262, 186, 500, 652, 48, palette.gold, 16);
  circle(canvas, 406, 398, 66, palette.gold);
  cup(canvas, 622, 398, 78, palette.red);
  sword(canvas, 408, 626, 150, palette.blue);
  baton(canvas, 622, 626, 150, palette.greenSoft);
});

writePng(path.join(outDir, "android-icon-background.png"), 432, 432, (canvas) => {
  fill(canvas, palette.cream);
  circle(canvas, 216, 216, 150, [231, 213, 183]);
});

writePng(path.join(outDir, "android-icon-foreground.png"), 432, 432, (canvas) => {
  fill(canvas, palette.cream);
  roundedRect(canvas, 110, 66, 212, 300, 24, palette.white);
  strokeRect(canvas, 110, 66, 212, 300, 24, palette.gold, 8);
  circle(canvas, 168, 162, 30, palette.gold);
  cup(canvas, 260, 162, 36, palette.red);
  sword(canvas, 170, 264, 72, palette.blue);
  baton(canvas, 260, 264, 72, palette.greenSoft);
});

writePng(path.join(outDir, "android-icon-monochrome.png"), 432, 432, (canvas) => {
  fill(canvas, palette.cream);
  roundedRect(canvas, 110, 66, 212, 300, 24, palette.ink);
  roundedRect(canvas, 126, 82, 180, 268, 16, palette.cream);
  circle(canvas, 168, 162, 30, palette.ink);
  cup(canvas, 260, 162, 36, palette.ink);
  sword(canvas, 170, 264, 72, palette.ink);
  baton(canvas, 260, 264, 72, palette.ink);
});

writePng(path.join(outDir, "favicon.png"), 64, 64, (canvas) => {
  fill(canvas, palette.cream);
  roundedRect(canvas, 14, 8, 36, 48, 5, palette.white);
  strokeRect(canvas, 14, 8, 36, 48, 5, palette.gold, 2);
  circle(canvas, 25, 24, 6, palette.gold);
  cup(canvas, 39, 24, 7, palette.red);
  sword(canvas, 25, 42, 13, palette.blue);
  baton(canvas, 39, 42, 13, palette.greenSoft);
});

console.log(`Generated Expo assets in ${outDir}`);
await import("./generate-card-deck.mjs");

function createCanvas(width, height) {
  return {
    width,
    height,
    data: Buffer.alloc(width * height * 3)
  };
}

function writePng(file, width, height, draw) {
  const canvas = createCanvas(width, height);
  draw(canvas);

  const scanlines = Buffer.alloc((width * 3 + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 3 + 1);
    scanlines[rowStart] = 0;
    canvas.data.copy(scanlines, rowStart + 1, y * width * 3, (y + 1) * width * 3);
  }

  const chunks = [
    chunk("IHDR", Buffer.concat([u32(width), u32(height), Buffer.from([8, 2, 0, 0, 0])])),
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
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      const dx = xx < x + radius ? x + radius - xx : xx > x + width - radius ? xx - (x + width - radius) : 0;
      const dy = yy < y + radius ? y + radius - yy : yy > y + height - radius ? yy - (y + height - radius) : 0;

      if (dx * dx + dy * dy <= radius * radius) {
        pixel(canvas, xx, yy, color);
      }
    }
  }
}

function strokeRect(canvas, x, y, width, height, radius, color, thickness) {
  roundedRect(canvas, x, y, width, height, radius, color);
  roundedRect(
    canvas,
    x + thickness,
    y + thickness,
    width - thickness * 2,
    height - thickness * 2,
    Math.max(0, radius - thickness),
    palette.white
  );
}

function circle(canvas, cx, cy, radius, color) {
  for (let y = cy - radius; y <= cy + radius; y += 1) {
    for (let x = cx - radius; x <= cx + radius; x += 1) {
      const dx = x - cx;
      const dy = y - cy;

      if (dx * dx + dy * dy <= radius * radius) {
        pixel(canvas, x, y, color);
      }
    }
  }
}

function cup(canvas, cx, cy, size, color) {
  const radius = Math.floor(size / 2);
  for (let y = 0; y < radius; y += 1) {
    const rowWidth = Math.floor(radius * 1.7 - y * 0.9);
    for (let x = -rowWidth; x <= rowWidth; x += 1) {
      if (Math.abs(x) > rowWidth - 5 || y > radius - 8) {
        pixel(canvas, cx + x, cy + y, color);
      }
    }
  }
  roundedRect(canvas, cx - Math.floor(size * 0.08), cy + radius - 2, Math.floor(size * 0.16), Math.floor(size * 0.35), 2, color);
  roundedRect(canvas, cx - Math.floor(size * 0.28), cy + Math.floor(size * 0.82), Math.floor(size * 0.56), Math.floor(size * 0.09), 2, color);
}

function sword(canvas, cx, cy, size, color) {
  const half = Math.floor(size / 2);
  roundedRect(canvas, cx - 5, cy - half, 10, size, 3, color);
  triangle(canvas, cx, cy - half - Math.floor(size * 0.16), Math.floor(size * 0.16), Math.floor(size * 0.24), color);
  roundedRect(canvas, cx - Math.floor(size * 0.22), cy + Math.floor(size * 0.14), Math.floor(size * 0.44), 10, 3, color);
}

function baton(canvas, cx, cy, size, color) {
  const half = Math.floor(size / 2);
  roundedRect(canvas, cx - 12, cy - half, 24, size, 12, color);
  circle(canvas, cx, cy - Math.floor(size * 0.3), Math.floor(size * 0.16), color);
  circle(canvas, cx, cy + Math.floor(size * 0.18), Math.floor(size * 0.14), color);
}

function triangle(canvas, cx, cy, halfWidth, height, color) {
  for (let y = 0; y < height; y += 1) {
    const rowHalfWidth = Math.floor((halfWidth * y) / height);
    for (let x = -rowHalfWidth; x <= rowHalfWidth; x += 1) {
      pixel(canvas, cx + x, cy + y, color);
    }
  }
}

function pixel(canvas, x, y, color) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
    return;
  }

  const offset = (Math.floor(y) * canvas.width + Math.floor(x)) * 3;
  canvas.data[offset] = color[0];
  canvas.data[offset + 1] = color[1];
  canvas.data[offset + 2] = color[2];
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

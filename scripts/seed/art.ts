// Brand-styled garment illustrations for demo catalogue data.

export type Kind = "shirt" | "panjabi" | "polo" | "tee" | "trouser" | "blazer" | "jacket" | "loafer" | "derby" | "belt" | "watch" | "wallet";
export type Pattern = "solid" | "check" | "stripe" | "melange";

export type Look = { kind: Kind; color: string; pattern?: Pattern; accent?: string };

const mirror = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${800 - Number(x)} ${y}`);

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => f(c).toString(16).padStart(2, "0")).join("")}`;
}

function patternDef(look: Look) {
  const base = look.color;
  const line = look.accent ?? shade(base, -0.35);
  switch (look.pattern) {
    case "check":
      return `<pattern id="fab" width="56" height="56" patternUnits="userSpaceOnUse">
        <rect width="56" height="56" fill="${base}"/>
        <rect width="56" height="18" fill="${line}" opacity=".55"/><rect width="18" height="56" fill="${line}" opacity=".55"/>
        <rect y="34" width="56" height="3" fill="${shade(base, 0.45)}" opacity=".6"/><rect x="34" width="3" height="56" fill="${shade(base, 0.45)}" opacity=".6"/>
      </pattern>`;
    case "stripe":
      return `<pattern id="fab" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="${base}"/><rect width="5" height="22" fill="${line}" opacity=".7"/></pattern>`;
    case "melange":
      return `<pattern id="fab" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${base}"/><circle cx="2" cy="2" r="1.1" fill="${shade(base, 0.25)}"/><circle cx="6" cy="5" r="1" fill="${shade(base, -0.15)}"/></pattern>`;
    default:
      return `<pattern id="fab" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${base}"/></pattern>`;
  }
}

/** Shapes drawn on an 800×1000 canvas. Returns fabric paths and detail markup. */
function garment(look: Look): { fabric: string[]; detail: string; under?: string } {
  const c = look.color;
  const seam = shade(c, -0.4);
  const light = shade(c, 0.35);
  const btn = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="7" fill="${light}" stroke="${seam}" stroke-width="2"/>`;
  const stitch = `stroke="${seam}" stroke-width="2.5" fill="none" stroke-linecap="round"`;

  switch (look.kind) {
    case "shirt": {
      const sleeve = "M 272 214 L 205 245 Q 175 265 170 300 L 140 640 L 196 655 L 240 360 L 288 334 Z";
      const body = "M 330 190 L 272 214 L 288 334 L 286 820 Q 400 848 514 820 L 512 334 L 528 214 L 470 190 Q 400 228 330 190 Z";
      const collar = "M 330 190 L 400 230 L 368 268 L 338 214 Z";
      return {
        fabric: [sleeve, mirror(sleeve), body, collar, mirror(collar)],
        detail: `<path d="M 330 190 Q 400 168 470 190 Q 400 214 330 190 Z" fill="${seam}" opacity=".55"/>
          <path d="M 400 230 L 400 828" ${stitch}/><path d="M 388 232 L 388 832" ${stitch} opacity=".5"/>
          ${[300, 390, 480, 570, 660, 750].map((y) => btn(400, y)).join("")}
          <path d="M 140 640 L 196 655 L 200 625 L 145 612 Z" fill="${seam}" opacity=".35"/>
          <path d="${mirror("M 140 640 L 196 655 L 200 625 L 145 612 Z")}" fill="${seam}" opacity=".35"/>
          <path d="M 425 340 h 62 v 70 l -31 12 l -31 -12 Z" ${stitch} opacity=".7"/>`,
      };
    }
    case "panjabi": {
      const sleeve = "M 276 196 L 210 228 Q 182 250 178 288 L 150 700 L 206 712 L 246 360 L 292 330 Z";
      const body = "M 338 172 L 276 196 L 292 330 L 284 940 L 516 940 L 508 330 L 524 196 L 462 172 Q 400 196 338 172 Z";
      const emb = look.accent ?? "#C4A482";
      return {
        fabric: [sleeve, mirror(sleeve), body],
        detail: `<path d="M 344 170 Q 400 150 456 170 L 452 198 Q 400 182 348 198 Z" fill="${shade(c, -0.15)}" stroke="${seam}" stroke-width="2"/>
          <path d="M 400 196 L 400 450" ${stitch}/>
          ${[230, 285, 340, 395].map((y) => `<circle cx="400" cy="${y}" r="6" fill="${emb}"/>`).join("")}
          <path d="M 372 200 Q 386 330 372 455 M 428 200 Q 414 330 428 455" stroke="${emb}" stroke-width="3" fill="none" stroke-dasharray="2 9" stroke-linecap="round"/>
          <path d="M 296 860 L 296 940 M 504 860 L 504 940" ${stitch}/>
          <path d="M 150 700 L 206 712 L 209 690 L 153 678 Z" fill="${emb}" opacity=".5"/>
          <path d="${mirror("M 150 700 L 206 712 L 209 690 L 153 678 Z")}" fill="${emb}" opacity=".5"/>`,
      };
    }
    case "polo":
    case "tee": {
      const sleeve = "M 272 214 L 196 250 L 168 380 L 232 400 L 288 330 Z";
      const body = "M 336 192 L 272 214 L 288 330 L 290 800 Q 400 822 510 800 L 512 330 L 528 214 L 464 192 Q 400 226 336 192 Z";
      const neck =
        look.kind === "polo"
          ? `<path d="M 336 192 L 400 236 L 366 262 L 330 206 Z" fill="${shade(c, -0.1)}" stroke="${seam}" stroke-width="2"/>
             <path d="${mirror("M 336 192 L 400 236 L 366 262 L 330 206 Z")}" fill="${shade(c, -0.1)}" stroke="${seam}" stroke-width="2"/>
             <path d="M 388 236 L 388 360 L 412 360 L 412 236" ${stitch}/>${[268, 318].map((y) => btn(400, y)).join("")}`
          : `<path d="M 336 192 Q 400 250 464 192" stroke="${seam}" stroke-width="10" fill="none" opacity=".45"/>`;
      return {
        fabric: [sleeve, mirror(sleeve), body],
        detail: `${neck}<path d="M 170 370 L 232 390" ${stitch} opacity=".6"/><path d="${mirror("M 170 370 L 232 390")}" ${stitch} opacity=".6"/>
          <path d="M 292 780 Q 400 802 508 780" ${stitch} opacity=".5"/>`,
      };
    }
    case "trouser": {
      const legs = "M 290 205 L 278 930 L 386 930 L 400 360 L 414 930 L 522 930 L 510 205 Z";
      return {
        fabric: [legs],
        detail: `<path d="M 288 168 L 512 168 L 510 207 L 290 207 Z" fill="${shade(c, -0.12)}" stroke="${seam}" stroke-width="2"/>
          ${[318, 368, 432, 482].map((x) => `<rect x="${x - 4}" y="164" width="8" height="46" rx="2" fill="${shade(c, -0.2)}"/>`).join("")}
          <circle cx="400" cy="188" r="7" fill="${light}" stroke="${seam}" stroke-width="2"/>
          <path d="M 400 207 L 400 330" ${stitch}/><path d="M 300 215 Q 330 270 352 212 M 500 215 Q 470 270 448 212" ${stitch}/>
          <path d="M 336 240 L 330 920 M 466 240 L 472 920" stroke="${seam}" stroke-width="1.5" opacity=".35"/>`,
      };
    }
    case "blazer":
    case "jacket": {
      const sleeve = "M 268 212 L 196 246 Q 166 268 162 306 L 138 650 L 198 664 L 238 370 L 288 338 Z";
      const body = "M 324 186 L 268 212 L 288 338 L 284 840 Q 400 862 516 840 L 512 338 L 532 212 L 476 186 Q 400 214 324 186 Z";
      if (look.kind === "jacket") {
        return {
          fabric: [sleeve, mirror(sleeve), body],
          detail: `<path d="M 324 186 Q 400 150 476 186 L 470 214 Q 400 186 330 214 Z" fill="${shade(c, -0.18)}" stroke="${seam}" stroke-width="2"/>
            <path d="M 400 200 L 400 846" stroke="${shade(c, -0.45)}" stroke-width="5"/>
            <path d="M 286 800 Q 400 822 514 800 L 516 840 Q 400 862 284 840 Z" fill="${shade(c, -0.15)}"/>
            <path d="M 300 560 L 350 540 M 500 560 L 450 540" ${stitch}/>
            <path d="M 138 650 L 198 664 L 202 632 L 142 620 Z" fill="${shade(c, -0.15)}"/><path d="${mirror("M 138 650 L 198 664 L 202 632 L 142 620 Z")}" fill="${shade(c, -0.15)}"/>`,
        };
      }
      const shirtFill = look.accent ?? "#EFE8DA";
      return {
        fabric: [sleeve, mirror(sleeve), body],
        detail: `<path d="M 352 192 L 400 520 L 448 192 Q 400 214 352 192 Z" fill="${shirtFill}"/>
          <path d="M 372 196 L 400 246 L 428 196" stroke="${shade(shirtFill, -0.25)}" stroke-width="3" fill="none"/>
          <path d="M 324 186 L 352 192 L 400 520 L 366 420 L 316 300 L 346 262 Z" fill="${shade(c, -0.1)}" stroke="${seam}" stroke-width="2"/>
          <path d="${mirror("M 324 186 L 352 192 L 400 520 L 366 420 L 316 300 L 346 262 Z")}" fill="${shade(c, -0.1)}" stroke="${seam}" stroke-width="2"/>
          ${btn(400, 580)}${btn(400, 660)}
          <path d="M 310 690 L 372 690 M 428 690 L 490 690 M 440 400 L 488 396" stroke="${seam}" stroke-width="4" stroke-linecap="round"/>`,
      };
    }
    case "loafer":
    case "derby": {
      const shoe = "M 140 640 Q 136 560 220 540 L 400 516 Q 470 462 560 470 Q 660 486 668 566 L 672 640 Q 400 664 140 640 Z";
      const back = `<g transform="translate(95 -38) scale(.9)">
          <path d="${shoe}" fill="${shade(c, -0.22)}" stroke="${seam}" stroke-width="2"/><path d="M 136 640 L 676 640 L 672 670 L 140 670 Z" fill="#1E1916"/></g>`;
      const top =
        look.kind === "loafer"
          ? `<path d="M 420 520 Q 520 480 600 500 L 612 540 Q 520 520 432 556 Z" fill="${shade(c, -0.2)}"/><path d="M 470 520 Q 520 505 560 512" stroke="${light}" stroke-width="5" fill="none"/>`
          : `<path d="M 380 524 Q 470 470 560 480" stroke="${seam}" stroke-width="3" fill="none"/>${[0, 1, 2, 3].map((i) => `<path d="M ${440 + i * 28} ${520 - i * 10} l 26 -6" stroke="${light}" stroke-width="4" stroke-linecap="round"/>`).join("")}`;
      return {
        fabric: [shoe],
        under: back,
        detail: `<path d="M 136 640 L 676 640 L 672 672 L 140 672 Z" fill="#1E1916"/>${top}
          <path d="M 160 620 Q 400 640 650 620" stroke="${seam}" stroke-width="2" fill="none" stroke-dasharray="6 8"/>`,
      };
    }
    case "belt":
      return {
        fabric: ["M 140 470 L 600 470 Q 640 470 640 500 Q 640 530 600 530 L 140 530 Z"],
        detail: `<rect x="80" y="450" width="80" height="100" rx="10" fill="none" stroke="#B89775" stroke-width="14"/>
          <rect x="112" y="492" width="70" height="16" rx="6" fill="#B89775"/>
          <path d="M 180 478 L 610 478 M 180 522 L 610 522" stroke="${light}" stroke-width="2" stroke-dasharray="7 7"/>
          ${[300, 350, 400, 450].map((x) => `<circle cx="${x}" cy="500" r="6" fill="${seam}"/>`).join("")}`,
      };
    case "watch":
      return {
        fabric: ["M 350 120 L 450 120 L 445 370 L 355 370 Z", "M 355 630 L 445 630 L 450 880 L 350 880 Z"],
        detail: `<circle cx="400" cy="500" r="150" fill="#D9D3C7" stroke="#8C877D" stroke-width="16"/>
          <circle cx="400" cy="500" r="128" fill="#F3EFE7"/>
          ${Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            return `<line x1="${400 + Math.sin(a) * 108}" y1="${500 - Math.cos(a) * 108}" x2="${400 + Math.sin(a) * (i % 3 ? 118 : 96)}" y2="${500 - Math.cos(a) * (i % 3 ? 118 : 96)}" stroke="#1E1916" stroke-width="${i % 3 ? 3 : 6}"/>`;
          }).join("")}
          <line x1="400" y1="500" x2="400" y2="420" stroke="#1E1916" stroke-width="8" stroke-linecap="round"/>
          <line x1="400" y1="500" x2="462" y2="540" stroke="#1E1916" stroke-width="5" stroke-linecap="round"/>
          <circle cx="400" cy="500" r="10" fill="#C4A482"/><rect x="545" y="485" width="26" height="30" rx="6" fill="#8C877D"/>
          ${[180, 230, 280, 700, 750, 800].map((y) => `<circle cx="400" cy="${y}" r="7" fill="${seam}"/>`).join("")}`,
      };
    case "wallet":
      return {
        fabric: ["M 200 330 L 600 330 Q 640 330 640 370 L 640 670 Q 640 710 600 710 L 200 710 Q 160 710 160 670 L 160 370 Q 160 330 200 330 Z"],
        detail: `<path d="M 182 350 L 618 350 Q 620 350 620 370 L 620 670 Q 620 690 600 690 L 200 690 Q 180 690 180 670 L 180 370 Q 180 350 182 350 Z" ${stitch} stroke-dasharray="8 8" opacity=".7"/>
          <path d="M 160 520 L 640 520" stroke="${seam}" stroke-width="3" opacity=".5"/>
          <text x="400" y="620" text-anchor="middle" font-family="Georgia, serif" font-size="34" letter-spacing="14" fill="${light}" opacity=".8">QAHAF</text>`,
      };
  }
}

const SHADOW_Y: Partial<Record<Kind, number>> = { loafer: 690, derby: 690, belt: 580, wallet: 740, watch: 910, trouser: 950, panjabi: 960 };

function garmentGroup(look: Look) {
  const { fabric, detail, under = "" } = garment(look);
  const seam = shade(look.color, -0.4);
  return `${under}${fabric.map((d) => `<path d="${d}" fill="url(#fab)" stroke="${seam}" stroke-width="2" stroke-linejoin="round"/>`).join("")}
    ${fabric.map((d) => `<path d="${d}" fill="url(#shadeGrad)"/>`).join("")}
    ${detail}`;
}

/** Full product image (4:5). `variant` 1 is the cover, 2 a cropped detail on a darker ground. */
export function productSvg(look: Look, variant: 1 | 2, bg = "#F3EFE7") {
  const ground = variant === 1 ? bg : shade(look.color, look.color === "#1E1916" ? 0.75 : look.color > "#999999" ? -0.55 : 0.62);
  const vb = variant === 1 ? "0 0 800 1000" : look.kind === "loafer" || look.kind === "derby" ? "300 380 400 500" : "220 110 360 450";
  const sy = SHADOW_Y[look.kind] ?? 850;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="1200" height="1500" preserveAspectRatio="xMidYMid slice">
  <defs>
    ${patternDef(look)}
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(ground, 0.12)}"/><stop offset="1" stop-color="${shade(ground, -0.06)}"/></linearGradient>
    <linearGradient id="shadeGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>
    <radialGradient id="floor"><stop offset="0" stop-color="#1E1916" stop-opacity=".22"/><stop offset="1" stop-color="#1E1916" stop-opacity="0"/></radialGradient>
  </defs>
  <rect x="-200" y="-200" width="1200" height="1400" fill="url(#bgGrad)"/>
  ${variant === 1 ? `<path d="M 40 110 V 40 H 110 M 760 890 V 960 H 690" stroke="#C4A482" stroke-width="3" fill="none"/>` : ""}
  <ellipse cx="400" cy="${sy}" rx="260" ry="26" fill="url(#floor)"/>
  ${garmentGroup(look)}
</svg>`;
}

/** Square-ish category tile art. */
export function categorySvg(look: Look, bg: string) {
  return productSvg(look, 1, bg).replace('width="1200" height="1500"', 'width="900" height="1125"');
}

/** Homepage banner: garments hanging on a rail beside a plant. */
export function heroSvg(looks: Look[]) {
  const hangers = looks
    .map((look, i) => {
      const x = 360 + i * 200;
      return `<g transform="translate(${x} 170)">
        <path d="M 0 -60 q 0 -22 16 -22 q 14 0 12 16 q -2 10 -14 16 L -70 40 L 70 40 L 0 -6" stroke="#2E2521" stroke-width="5" fill="none" stroke-linejoin="round"/>
        <g transform="translate(-172 -40) scale(.43)">${garmentInner(look, `fab${i}`)}</g>
      </g>`;
    })
    .join("");
  const leaves = [
    [-55, 120, -40], [-20, 90, -15], [15, 100, 12], [45, 125, 38], [-70, 70, -60], [70, 80, 55], [0, 150, 0], [-35, 160, -25], [35, 165, 25],
  ]
    .map(([x, l, r]) => `<g transform="translate(160 610) rotate(${r})"><path d="M 0 0 Q ${x / 4} ${-l * 1.6} 0 ${-l * 2.6} Q ${-x / 4 + 30} ${-l * 1.5} 0 0 Z" fill="${r > 0 ? "#5B5E3C" : "#4B4E30"}"/><path d="M 0 0 L 0 ${-l * 2.5}" stroke="#3B3D25" stroke-width="2"/></g>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1800" height="1350">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9AE8B"/><stop offset="1" stop-color="#9C7A57"/></linearGradient>
    <linearGradient id="shadeGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
    ${looks.map((l, i) => patternDef(l).replace('id="fab"', `id="fab${i}"`)).join("")}
    ${patternDef({ kind: "loafer", color: "#7A4E30" }).replace('id="fab"', 'id="fabShoe"')}
  </defs>
  <rect width="1200" height="900" fill="url(#wall)"/>
  ${Array.from({ length: 9 }, (_, i) => `<path d="M ${i * 150 - 40} 0 Q ${i * 150 + 20} 450 ${i * 150 - 30} 900" stroke="#8A6A4A" stroke-width="1.5" opacity=".25" fill="none"/>`).join("")}
  <rect y="760" width="1200" height="140" fill="#3D2B1F"/><rect y="760" width="1200" height="6" fill="#2A1E16"/>
  <rect x="250" y="96" width="860" height="10" rx="5" fill="#B9B4AA"/><rect x="262" y="96" width="8" height="680" fill="#A9A49A"/><rect x="1090" y="96" width="8" height="680" fill="#A9A49A"/>
  ${hangers}
  <g transform="translate(790 548) scale(.32)">${garmentInner({ kind: "loafer", color: "#7A4E30" }, "fabShoe")}</g>
  ${leaves}
  <path d="M 100 600 L 220 600 L 205 770 L 115 770 Z" fill="#4A3525"/><rect x="92" y="590" width="136" height="22" rx="4" fill="#3D2B1F"/>
  <ellipse cx="160" cy="772" rx="70" ry="8" fill="#000" opacity=".25"/>
</svg>`;
}

function garmentInner(look: Look, id: string) {
  return garmentGroup(look).replaceAll("url(#fab)", `url(#${id})`);
}

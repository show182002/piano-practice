/* Standard 6-string guitar chord diagrams (SVG, no external library).
   Shapes are common open / barre fingerings, keyed from progression symbols. */
(function (global) {
  const NS = "http://www.w3.org/2000/svg";

  /* frets: low E → high e. -1 muted, 0 open, >0 fret number.
     fingers: 0 none, 1–4 finger numbers (barre finger lives on barre).
     barre: { fret, from, to, finger } with string numbers 6 (low E) … 1 (high e).
     baseFret: 1 shows a nut; higher values show a "N fr" label and no nut. */
  const SHAPES = {
    "G":      { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
    "Em":     { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
    "C":      { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
    "D":      { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
    "D/F#":   { frets: [2, 0, 0, 2, 3, 2], fingers: [1, 0, 0, 2, 4, 3] },
    "Bm/D":   { frets: [-1, -1, 0, 4, 3, 2], fingers: [0, 0, 0, 3, 2, 1] },
    "G/B":    { frets: [-1, 2, 0, 0, 0, 3], fingers: [0, 1, 0, 0, 0, 3] },
    "Am7":    { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
    "C/D":    { frets: [-1, -1, 0, 0, 1, 0], fingers: [0, 0, 0, 0, 1, 0] },
    "G/F":    { frets: [1, 2, 0, 0, 0, 3], fingers: [1, 2, 0, 0, 0, 3] },
    "C/E":    { frets: [0, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
    "Cm6/Eb": {
      frets: [-1, -1, 1, 2, 1, 3],
      fingers: [0, 0, 0, 2, 0, 3],
      barre: { fret: 1, from: 4, to: 2, finger: 1 }
    },
    "G/D":    { frets: [-1, -1, 0, 0, 0, 3], fingers: [0, 0, 0, 0, 0, 3] },
    "A/C#":   {
      frets: [-1, 4, 2, 2, 2, 0],
      fingers: [0, 3, 0, 0, 0, 0],
      barre: { fret: 2, from: 4, to: 2, finger: 1 }
    },
    "Am":     { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
    "F":      {
      frets: [1, 3, 3, 2, 1, 1],
      fingers: [0, 3, 4, 2, 0, 0],
      barre: { fret: 1, from: 6, to: 1, finger: 1 }
    },
    "Dm":     { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
    "D7/F#":  { frets: [2, 0, 0, 2, 1, 2], fingers: [2, 0, 0, 3, 1, 4] },
    "Fmaj7":  { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
    "D7":     { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
    "G7":     { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
    "E/G#":   { frets: [4, 2, 2, 1, 0, 0], fingers: [4, 3, 2, 1, 0, 0] },
    "Ab":     {
      frets: [4, 6, 6, 5, 4, 4],
      fingers: [0, 3, 4, 2, 0, 0],
      barre: { fret: 4, from: 6, to: 1, finger: 1 },
      baseFret: 4
    }
  };

  /* Enharmonic / typographic aliases share the same shape. */
  const ALIASES = {
    "G#": "Ab",
    "G#maj": "Ab",
    "Abmaj": "Ab",
    "A/Db": "A/C#",
    "D/Gb": "D/F#",
    "D7/Gb": "D7/F#",
    "E/Ab": "E/G#",
    "Cm6/D#": "Cm6/Eb",
    "FM7": "Fmaj7",
    "FMaj7": "Fmaj7",
    "F△": "Fmaj7",
    "FΔ": "Fmaj7"
  };

  function svgEl(name, attrs, text) {
    const n = document.createElementNS(NS, name);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (attrs[k] != null && attrs[k] !== "") n.setAttribute(k, String(attrs[k]));
      });
    }
    if (text != null) n.textContent = text;
    return n;
  }

  function normalizeSymbol(symbol) {
    let s = String(symbol || "").trim();
    s = s.replace(/[♯＃]/g, "#").replace(/[♭ｂ]/g, "b");
    s = s.replace(/[∕⁄／]/g, "/");
    s = s.replace(/\s+/g, "");
    return s;
  }

  function prettyLabel(symbol) {
    if (global.MusicTheory && MusicTheory.prettyChord) return MusicTheory.prettyChord(symbol);
    return String(symbol || "").replace(/#/g, "♯").replace(/b/g, "♭");
  }

  function lookup(symbol) {
    const raw = String(symbol == null ? "" : symbol).trim();
    if (!raw) return { symbol: raw, key: "", shape: null, placeholder: true, empty: true };
    const norm = normalizeSymbol(raw);
    const key = SHAPES[norm] ? norm : (ALIASES[norm] || "");
    const shape = key && SHAPES[key] ? SHAPES[key] : null;
    return {
      symbol: raw,
      key: key || norm,
      shape: shape,
      placeholder: !shape,
      empty: false
    };
  }

  function onBarre(barre, stringIndex, fret) {
    if (!barre) return false;
    const stringNum = 6 - stringIndex;
    const lo = Math.min(barre.from, barre.to);
    const hi = Math.max(barre.from, barre.to);
    return fret === barre.fret && stringNum >= lo && stringNum <= hi;
  }

  function renderSvg(symbol, opts) {
    opts = opts || {};
    const found = lookup(symbol);
    const shape = found.shape;
    const W = 80;
    const left = 18;
    const right = 74;
    const nutY = 16;
    const fretH = 13;
    const boardW = right - left;

    if (!shape) {
      const H = 86;
      const svg = svgEl("svg", {
        class: "fa-gtr-svg is-placeholder",
        viewBox: "0 0 " + W + " " + H,
        width: "100%",
        height: "100%",
        "aria-hidden": "true"
      });
      svg.appendChild(svgEl("rect", {
        x: left, y: nutY, width: boardW, height: fretH * 4,
        fill: "none", stroke: "#888", "stroke-width": 1, "stroke-dasharray": "2 2", rx: 2
      }));
      svg.appendChild(svgEl("text", {
        x: (left + right) / 2,
        y: nutY + fretH * 2 + 3,
        "text-anchor": "middle",
        fill: "#555",
        "font-size": 8,
        "font-weight": 700,
        "font-family": "inherit"
      }, "未有圖"));
      return svg;
    }

    const frets = shape.frets;
    const fingers = shape.fingers || [];
    const barre = shape.barre || null;
    const base = shape.baseFret || 1;
    const relOf = (f) => f - base + 1;
    let maxRel = 1;
    frets.forEach((f) => {
      if (f > 0) maxRel = Math.max(maxRel, relOf(f));
    });
    const spaces = Math.max(4, Math.min(5, maxRel));
    const boardH = spaces * fretH;
    const H = nutY + boardH + 6;
    const stringX = (i) => left + (boardW * i) / 5;
    const ink = "#1a1a1a";

    const svg = svgEl("svg", {
      class: "fa-gtr-svg",
      viewBox: "0 0 " + W + " " + H,
      width: "100%",
      height: "100%",
      "aria-hidden": "true"
    });

    for (let i = 0; i < 6; i++) {
      const x = stringX(i);
      svg.appendChild(svgEl("line", {
        x1: x, y1: nutY, x2: x, y2: nutY + boardH,
        stroke: ink, "stroke-width": i === 0 ? 1.35 : 1, "stroke-linecap": "square"
      }));
    }
    for (let f = 0; f <= spaces; f++) {
      const y = nutY + f * fretH;
      const isNut = f === 0 && base === 1;
      svg.appendChild(svgEl("line", {
        x1: left, y1: y, x2: right, y2: y,
        stroke: ink,
        "stroke-width": isNut ? 3.4 : 1.15,
        "stroke-linecap": isNut ? "butt" : "square"
      }));
    }
    if (base === 1) {
      svg.appendChild(svgEl("rect", {
        x: left, y: nutY - 2.2, width: boardW, height: 3.4, fill: ink
      }));
    } else {
      svg.appendChild(svgEl("text", {
        x: left - 5,
        y: nutY + fretH * 0.55,
        "text-anchor": "end",
        fill: ink,
        "font-size": 8,
        "font-weight": 700,
        "font-family": "inherit"
      }, String(base) + " fr"));
    }

    for (let i = 0; i < 6; i++) {
      const f = frets[i];
      const x = stringX(i);
      if (f === -1) {
        svg.appendChild(svgEl("text", {
          x: x, y: nutY - 5,
          "text-anchor": "middle",
          fill: ink,
          "font-size": 8,
          "font-weight": 800,
          "font-family": "inherit"
        }, "X"));
      } else if (f === 0) {
        svg.appendChild(svgEl("circle", {
          cx: x, cy: nutY - 6.2, r: 3,
          fill: "none", stroke: ink, "stroke-width": 1.2
        }));
      }
    }

    if (barre) {
      const rel = relOf(barre.fret);
      if (rel >= 1 && rel <= spaces) {
        const cy = nutY + (rel - 0.5) * fretH;
        const i1 = 6 - barre.from;
        const i2 = 6 - barre.to;
        const x1 = stringX(Math.min(i1, i2));
        const x2 = stringX(Math.max(i1, i2));
        const r = 5;
        svg.appendChild(svgEl("rect", {
          x: x1 - r,
          y: cy - r,
          width: (x2 - x1) + r * 2,
          height: r * 2,
          rx: r,
          ry: r,
          fill: ink
        }));
        const finger = barre.finger || 1;
        svg.appendChild(svgEl("text", {
          x: x1,
          y: cy + 3,
          "text-anchor": "middle",
          fill: "#f6f3ec",
          "font-size": 8,
          "font-weight": 800,
          "font-family": "inherit"
        }, String(finger)));
      }
    }

    for (let i = 0; i < 6; i++) {
      const f = frets[i];
      if (f == null || f <= 0) continue;
      if (onBarre(barre, i, f)) continue;
      const rel = relOf(f);
      if (rel < 1 || rel > spaces) continue;
      const x = stringX(i);
      const cy = nutY + (rel - 0.5) * fretH;
      svg.appendChild(svgEl("circle", { cx: x, cy: cy, r: 5, fill: ink }));
      const finger = fingers[i] || 0;
      if (finger) {
        svg.appendChild(svgEl("text", {
          x: x, y: cy + 3,
          "text-anchor": "middle",
          fill: "#f6f3ec",
          "font-size": 8,
          "font-weight": 800,
          "font-family": "inherit"
        }, String(finger)));
      }
    }

    return svg;
  }

  function renderCard(symbol, attrs) {
    attrs = attrs || {};
    const found = lookup(symbol);
    const card = document.createElement("div");
    card.className = "fa-gtr-card" + (found.placeholder ? " is-placeholder" : "");
    card.setAttribute("role", "listitem");
    if (attrs.start != null) card.dataset.start = String(attrs.start);
    if (attrs.end != null) card.dataset.end = String(attrs.end);
    card.dataset.chord = found.symbol;
    const label = prettyLabel(found.symbol);
    card.setAttribute("aria-label", label);
    card.appendChild(renderSvg(found.symbol));
    const name = document.createElement("div");
    name.className = "fa-gtr-name";
    name.textContent = label;
    card.appendChild(name);
    return card;
  }

  function knownKeys() {
    return Object.keys(SHAPES);
  }

  global.GuitarChords = {
    normalizeSymbol,
    prettyLabel,
    lookup,
    renderSvg,
    renderCard,
    knownKeys,
    SHAPES,
    ALIASES
  };
})(window);

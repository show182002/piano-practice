/* Circle of Fifths UI + selection. Depends on MusicTheory + PianoUI. */
(function (global) {
  let selectedKeyId = "C";
  let selectedChordIdx = null; // null = show whole scale
  let rootEl = null;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function polar(cx, cy, r, deg) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function wedgePath(cx, cy, rInner, rOuter, a0, a1) {
    const p0 = polar(cx, cy, rOuter, a0);
    const p1 = polar(cx, cy, rOuter, a1);
    const p2 = polar(cx, cy, rInner, a1);
    const p3 = polar(cx, cy, rInner, a0);
    const large = a1 - a0 > 180 ? 1 : 0;
    return [
      `M ${p0.x} ${p0.y}`,
      `A ${rOuter} ${rOuter} 0 ${large} 1 ${p1.x} ${p1.y}`,
      `L ${p2.x} ${p2.y}`,
      `A ${rInner} ${rInner} 0 ${large} 0 ${p3.x} ${p3.y}`,
      "Z"
    ].join(" ");
  }

  function buildWheel(svg) {
    const keys = MusicTheory.MAJOR_KEYS;
    const cx = 160, cy = 160, rOuter = 148, rInner = 78;
    const slice = 360 / keys.length;

    // Clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    keys.forEach((key, i) => {
      const a0 = i * slice;
      const a1 = (i + 1) * slice;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", wedgePath(cx, cy, rInner, rOuter, a0, a1));
      path.setAttribute("class", "cof-slice" + (key.id === selectedKeyId ? " selected" : ""));
      path.dataset.keyId = key.id;
      path.addEventListener("click", () => selectKey(key.id));
      svg.appendChild(path);

      const mid = a0 + slice / 2;
      const labelPos = polar(cx, cy, (rInner + rOuter) / 2, mid);
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", labelPos.x);
      text.setAttribute("y", labelPos.y);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("class", "cof-label");
      text.textContent = key.name;
      text.style.pointerEvents = "none";
      svg.appendChild(text);

      // Relative minor in inner ring label
      const info = MusicTheory.keyInfo(key.id);
      const minPos = polar(cx, cy, rInner - 22, mid);
      const minText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      minText.setAttribute("x", minPos.x);
      minText.setAttribute("y", minPos.y);
      minText.setAttribute("text-anchor", "middle");
      minText.setAttribute("dominant-baseline", "middle");
      minText.setAttribute("class", "cof-label-min");
      minText.textContent = info.relativeMinor.name;
      minText.style.pointerEvents = "none";
      svg.appendChild(minText);
    });

    const hub = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    hub.setAttribute("cx", cx);
    hub.setAttribute("cy", cy);
    hub.setAttribute("r", rInner - 40);
    hub.setAttribute("class", "cof-hub");
    svg.appendChild(hub);

    const hubText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    hubText.setAttribute("x", cx);
    hubText.setAttribute("y", cy);
    hubText.setAttribute("text-anchor", "middle");
    hubText.setAttribute("dominant-baseline", "middle");
    hubText.setAttribute("class", "cof-hub-text");
    hubText.setAttribute("id", "cof-hub-label");
    hubText.textContent = selectedKeyId;
    svg.appendChild(hubText);
  }

  function renderDetails(box) {
    const info = MusicTheory.keyInfo(selectedKeyId);
    box.innerHTML = "";

    const title = el("div", "cof-detail-title", info.key.name + " major");
    const sig = el("div", "cof-detail-sub", MusicTheory.signatureLabel(info.key.sig) + " · 相對小調 " + info.relativeMinor.name);
    box.appendChild(title);
    box.appendChild(sig);

    const scaleRow = el("div", "cof-scale");
    scaleRow.appendChild(el("span", "cof-k", "音階"));
    const scaleBtns = el("div", "cof-chips");
    info.scaleNames.forEach((name, i) => {
      const chip = el("button", "cof-chip", name);
      chip.type = "button";
      chip.title = "喺鍵盤亮起呢個音";
      chip.addEventListener("click", () => {
        selectedChordIdx = null;
        highlightPcs([info.scalePcs[i]]);
        renderDetails(box);
        refreshChordActive(box);
      });
      scaleBtns.appendChild(chip);
    });
    const allScale = el("button", "cof-chip accent", "成個 scale");
    allScale.type = "button";
    allScale.addEventListener("click", () => {
      selectedChordIdx = null;
      highlightPcs(info.scalePcs);
      refreshChordActive(box);
    });
    scaleBtns.appendChild(allScale);
    scaleRow.appendChild(scaleBtns);
    box.appendChild(scaleRow);

    const chordRow = el("div", "cof-chords");
    chordRow.appendChild(el("span", "cof-k", "和弦"));
    const chordBtns = el("div", "cof-chips");
    info.chords.forEach((ch, idx) => {
      const chip = el("button", "cof-chip chord" + (selectedChordIdx === idx ? " on" : ""), ch.roman + " " + ch.name);
      chip.type = "button";
      chip.addEventListener("click", () => {
        selectedChordIdx = idx;
        highlightPcs(ch.pcs);
        refreshChordActive(box);
      });
      chordBtns.appendChild(chip);
    });
    chordRow.appendChild(chordBtns);
    box.appendChild(chordRow);
  }

  function refreshChordActive(box) {
    box.querySelectorAll(".cof-chip.chord").forEach((btn, idx) => {
      btn.classList.toggle("on", selectedChordIdx === idx);
    });
  }

  function highlightPcs(pcs) {
    if (global.PianoUI && typeof global.PianoUI.setHighlightPcs === "function") {
      global.PianoUI.setHighlightPcs(pcs);
    }
  }

  function selectKey(keyId) {
    selectedKeyId = keyId;
    selectedChordIdx = null;
    const svg = rootEl.querySelector("svg");
    const details = rootEl.querySelector(".cof-details");
    buildWheel(svg);
    const hub = svg.querySelector("#cof-hub-label");
    if (hub) hub.textContent = keyId;
    renderDetails(details);
    const info = MusicTheory.keyInfo(keyId);
    highlightPcs(info.scalePcs);
  }

  function mount(container) {
    rootEl = container;
    rootEl.classList.add("cof-root");
    rootEl.innerHTML = "";

    const layout = el("div", "cof-layout");
    const wheelWrap = el("div", "cof-wheel-wrap");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 320 320");
    svg.setAttribute("class", "cof-svg");
    svg.setAttribute("aria-label", "五度圈");
    wheelWrap.appendChild(svg);

    const details = el("div", "cof-details");
    layout.appendChild(wheelWrap);
    layout.appendChild(details);
    rootEl.appendChild(layout);

    buildWheel(svg);
    renderDetails(details);
    highlightPcs(MusicTheory.keyInfo(selectedKeyId).scalePcs);
  }

  global.CircleOfFifths = { mount, selectKey };
})(window);

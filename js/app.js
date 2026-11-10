/* View router: home (song select) → practice, or the 五度圈 tool as its own view. */
(function (global) {
  const viewHome = document.getElementById("view-home");
  const viewPractice = document.getElementById("view-practice");
  const viewCof = document.getElementById("view-cof");
  const keyboardDockPractice = document.getElementById("keyboard-dock-practice");
  const keyboardDockCof = document.getElementById("keyboard-dock-cof");
  const keyboardEl = document.getElementById("keyboard");

  let current = "home";

  function moveKeyboard(dock) {
    if (!keyboardEl || !dock) return;
    if (keyboardEl.parentElement !== dock) dock.appendChild(keyboardEl);
    if (global.PianoUI && typeof PianoUI.rebuild === "function") {
      requestAnimationFrame(() => PianoUI.rebuild());
    }
  }

  function show(id) {
    if (id === current && id !== "practice") {
      // still refresh visibility flags on first load
    }
    const prev = current;
    current = id;
    if (viewHome) viewHome.hidden = id !== "home";
    if (viewPractice) viewPractice.hidden = id !== "practice";
    if (viewCof) viewCof.hidden = id !== "cof";
    document.body.dataset.view = id;

    if (prev === "practice" && id !== "practice" && global.FollowAlong) {
      FollowAlong.deactivate();
    }
    if (id === "practice") {
      moveKeyboard(keyboardDockPractice);
      if (global.FollowAlong) FollowAlong.activate();
    } else if (id === "cof") {
      moveKeyboard(keyboardDockCof);
      if (global.CircleOfFifths) CircleOfFifths.activate();
    } else {
      moveKeyboard(keyboardDockPractice);
    }
  }

  document.querySelectorAll("[data-open-practice]").forEach((btn) => {
    btn.addEventListener("click", () => show("practice"));
  });
  document.querySelectorAll("[data-open-cof]").forEach((btn) => {
    btn.addEventListener("click", () => show("cof"));
  });
  document.querySelectorAll("[data-open-home]").forEach((btn) => {
    btn.addEventListener("click", () => show("home"));
  });

  if (global.PianoUI) {
    PianoUI.mount({
      keyboard: keyboardEl,
      root: document
    });
  }
  if (global.FollowAlong && global.Songs && Songs.danche) {
    FollowAlong.mount(document.getElementById("fa-highway"), Songs.danche);
  }
  if (global.CircleOfFifths) {
    CircleOfFifths.mount(document.getElementById("circle-of-fifths"), { highlight: false });
  }

  show("home");
})(window);

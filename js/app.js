/* View router: home (song select) → practice or game, or the 五度圈 tool. */
(function (global) {
  const viewHome = document.getElementById("view-home");
  const viewPractice = document.getElementById("view-practice");
  const viewGame = document.getElementById("view-game");
  const viewCof = document.getElementById("view-cof");
  const keyboardDockPractice = document.getElementById("keyboard-dock-practice");
  const keyboardDockGame = document.getElementById("keyboard-dock-game");
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
    const prev = current;
    current = id;
    if (viewHome) viewHome.hidden = id !== "home";
    if (viewPractice) viewPractice.hidden = id !== "practice";
    if (viewGame) viewGame.hidden = id !== "game";
    if (viewCof) viewCof.hidden = id !== "cof";
    document.body.dataset.view = id;

    if (prev === "practice" && id !== "practice" && global.FollowAlong) {
      FollowAlong.deactivate();
    }
    if (prev === "game" && id !== "game" && global.GameMode) {
      GameMode.deactivate();
    }
    if (id === "practice") {
      moveKeyboard(keyboardDockPractice);
      if (global.FollowAlong) FollowAlong.activate();
    } else if (id === "game") {
      moveKeyboard(keyboardDockGame);
      if (global.GameMode) GameMode.activate();
    } else if (id === "cof") {
      moveKeyboard(keyboardDockCof);
      if (global.CircleOfFifths) CircleOfFifths.activate();
    } else {
      moveKeyboard(keyboardDockPractice);
    }
  }

  function keyLabel(song) {
    if (!song || !song.key) return "";
    return song.key + " 大調";
  }

  /* 單車 stays first; any other Songs.* entries follow in registry order. */
  function songList() {
    const map = global.Songs || {};
    const list = [];
    if (map.danche) list.push(map.danche);
    Object.keys(map).forEach((id) => {
      if (id === "danche") return;
      if (map[id]) list.push(map[id]);
    });
    return list;
  }

  function hasGameMode(songData) {
    if (global.GameMode && typeof GameMode.hasGame === "function") {
      return GameMode.hasGame(songData);
    }
    return !!(songData && songData.id === "danche");
  }

  function openPractice(songData) {
    if (!songData || !global.FollowAlong) return;
    if (typeof FollowAlong.setSong === "function") FollowAlong.setSong(songData);
    else FollowAlong.mount(document.getElementById("fa-staff"), songData);
    show("practice");
  }

  function openGame(songData) {
    if (!songData || !global.GameMode) return;
    if (typeof GameMode.setSong === "function") GameMode.setSong(songData);
    else GameMode.mount(songData);
    show("game");
  }

  function renderSongGrid() {
    const grid = document.querySelector(".song-grid");
    if (!grid) return;
    grid.innerHTML = "";
    songList().forEach((s) => {
      const card = document.createElement("article");
      card.className = "song-card";

      const key = document.createElement("div");
      key.className = "song-card-key";
      key.textContent = keyLabel(s);
      card.appendChild(key);

      const title = document.createElement("h2");
      title.textContent = s.title || "";
      card.appendChild(title);

      const artist = document.createElement("p");
      artist.className = "song-card-artist";
      artist.textContent = s.artist || "";
      card.appendChild(artist);

      const meta = document.createElement("p");
      meta.className = "song-card-meta";
      meta.textContent = s.disclaimer || "";
      card.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "song-card-actions";

      const practiceBtn = document.createElement("button");
      practiceBtn.type = "button";
      practiceBtn.className = hasGameMode(s) ? "btn" : "btn primary";
      practiceBtn.textContent = "跟譜練習";
      practiceBtn.addEventListener("click", () => openPractice(s));
      actions.appendChild(practiceBtn);

      if (hasGameMode(s)) {
        const gameBtn = document.createElement("button");
        gameBtn.type = "button";
        gameBtn.className = "btn primary";
        gameBtn.textContent = "遊戲";
        gameBtn.addEventListener("click", () => openGame(s));
        actions.appendChild(gameBtn);
      }

      card.appendChild(actions);
      grid.appendChild(card);
    });
  }

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
    FollowAlong.mount(document.getElementById("fa-staff"), Songs.danche);
  }
  if (global.GameMode && global.Songs && Songs.danche) {
    GameMode.mount(Songs.danche);
  }
  if (global.CircleOfFifths) {
    CircleOfFifths.mount(document.getElementById("circle-of-fifths"), { highlight: false });
  }

  renderSongGrid();
  show("home");
})(window);

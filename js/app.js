/* Tab switching + app bootstrap. Keep audio / MIDI / keyboard mounted for both modes. */
(function (global) {
  const tabFollow = document.getElementById("tab-follow");
  const tabCof = document.getElementById("tab-cof");
  const panelFollow = document.getElementById("panel-follow");
  const panelCof = document.getElementById("panel-cof");

  let current = "follow";

  function setTab(id) {
    if (id === current) return;
    const prev = current;
    current = id;
    const followOn = id === "follow";

    tabFollow.classList.toggle("on", followOn);
    tabCof.classList.toggle("on", !followOn);
    tabFollow.setAttribute("aria-selected", followOn ? "true" : "false");
    tabCof.setAttribute("aria-selected", followOn ? "true" : "false");
    panelFollow.hidden = !followOn;
    panelCof.hidden = followOn;

    if (prev === "follow" && global.FollowAlong) FollowAlong.deactivate();
    if (id === "follow" && global.FollowAlong) FollowAlong.activate();
    if (id === "cof" && global.CircleOfFifths) CircleOfFifths.activate();
  }

  tabFollow.addEventListener("click", () => setTab("follow"));
  tabCof.addEventListener("click", () => setTab("cof"));

  if (global.FollowAlong && global.Songs && Songs.danche) {
    FollowAlong.mount(document.getElementById("follow-along"), Songs.danche);
    FollowAlong.activate();
  }
  if (global.CircleOfFifths) {
    CircleOfFifths.mount(document.getElementById("circle-of-fifths"), { highlight: false });
  }
})(window);

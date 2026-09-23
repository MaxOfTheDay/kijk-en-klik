// The in-app camera: a live viewfinder over a challenge. It owns one camera
// stream at a time and stops it whenever the layer closes or the app goes
// to the background. If the browser won't give us a camera, the same screen
// turns into a calm "Foto maken of kiezen" step using the native picker.

import { icon } from "../content/icons.js";
import { startStream, stopStream, countCameras, cameraErrorKind, grabFrame } from "../lib/camera.js";
import { esc, haptic } from "../lib/ui.js";

const FALLBACK_TEXT = {
  denied: "Je hebt de camera niet toegestaan. Geen probleem: maak of kies een foto met je telefoon.",
  missing: "Hier is geen camera gevonden. Kies een foto, of maak er een met je telefoon.",
  busy: "De camera doet even niet mee. Maak of kies een foto met je telefoon.",
};

export function createCamera(dialog, { onCapture, onPick, onClose }) {
  let stream = null;
  let facing = "environment";
  let session = 0; // bumps on every start/stop so late results are ignored
  let capturing = false;
  let ready = false;

  function render(challenge) {
    dialog.innerHTML = `
      <div class="camera__top">
        <button class="icon-btn icon-btn--dark" data-cam="close" aria-label="Camera sluiten">${icon("close")}</button>
        <p id="camera-title" class="camera__prompt">${esc(challenge.title)}</p>
        <span class="camera__spacer"></span>
      </div>
      <div class="camera__stage">
        <div class="camera__viewfinder">
          <video playsinline muted autoplay aria-label="Camerabeeld"></video>
          <span class="camera__corners" aria-hidden="true"></span>
          <span class="camera__flash" aria-hidden="true"></span>
          <p class="camera__status" role="status">Camera wordt gestart…</p>
          <div class="camera__fallback" hidden>
            <span class="camera__fallback-icon">${icon("camera", { size: 30 })}</span>
            <p class="camera__fallback-text"></p>
            <button class="btn btn--primary btn--light btn--big" data-cam="pick">${icon("image")} Foto maken of kiezen</button>
          </div>
        </div>
      </div>
      <div class="camera__controls">
        <button class="cam-btn" data-cam="pick" aria-label="Kies uit je foto's">${icon("image")}</button>
        <button class="shutter" data-cam="shutter" aria-label="Foto maken" disabled><span></span></button>
        <button class="cam-btn" data-cam="switch" aria-label="Wissel camera" hidden>${icon("switch")}</button>
      </div>`;
  }

  const $ = (sel) => dialog.querySelector(sel);

  function setStatus(text) {
    const el = $(".camera__status");
    if (!el) return;
    el.textContent = text;
    el.hidden = !text;
  }

  function setReady(on) {
    ready = on;
    const shutter = $(".shutter");
    if (shutter) shutter.disabled = !on;
  }

  async function start() {
    const mine = ++session;
    setReady(false);
    setStatus("Camera wordt gestart…");
    $(".camera__fallback").hidden = true;
    let next;
    try {
      next = await startStream(facing);
    } catch (err) {
      if (mine !== session) return;
      showFallback(cameraErrorKind(err));
      return;
    }
    if (mine !== session || !dialog.open) {
      stopStream(next);
      return;
    }
    stream = next;
    const video = $("video");
    video.srcObject = stream;
    video.classList.toggle("is-mirrored", facing === "user");
    try {
      await video.play();
    } catch {
      // Autoplay of a muted inline video is allowed everywhere we target;
      // if it isn't, the metadata wait below still lets frames through.
    }
    if (!video.videoWidth) await new Promise((r) => video.addEventListener("loadedmetadata", r, { once: true }));
    if (mine !== session) return;
    setStatus("");
    setReady(true);
    if ((await countCameras()) > 1 && mine === session) $("[data-cam=switch]").hidden = false;
  }

  function stop() {
    session++;
    setReady(false);
    stopStream(stream);
    stream = null;
    const video = $("video");
    if (video) video.srcObject = null;
  }

  function showFallback(kind) {
    stop();
    setStatus("");
    $(".camera__fallback-text").textContent = FALLBACK_TEXT[kind];
    $(".camera__fallback").hidden = false;
    $(".camera__controls").classList.add("is-hidden");
  }

  async function shutter() {
    if (!ready || capturing) return;
    capturing = true;
    setReady(false);
    const video = $("video");
    const flash = $(".camera__flash");
    flash.classList.remove("is-on");
    void flash.offsetWidth; // restart the flash animation
    flash.classList.add("is-on");
    haptic(15);
    try {
      const blob = await grabFrame(video, { mirror: facing === "user" });
      video.pause(); // hold the frame while the photo develops
      setStatus("Foto wordt ontwikkeld…");
      await onCapture(blob);
    } catch {
      setStatus("Dat lukte niet. Probeer het nog eens.");
      video.play().catch(() => {});
      setReady(Boolean(stream));
    } finally {
      capturing = false;
    }
  }

  async function switchCamera() {
    if (capturing) return;
    facing = facing === "environment" ? "user" : "environment";
    stop();
    await start();
  }

  dialog.addEventListener("click", (e) => {
    const action = e.target.closest("[data-cam]")?.dataset.cam;
    if (action === "close") {
      stop(); // don't wait for the async close event to release the camera
      dialog.close();
    }
    else if (action === "shutter") shutter();
    else if (action === "switch") switchCamera();
    else if (action === "pick") onPick();
  });

  // Never keep the camera running in the background.
  function onVisibility() {
    if (!dialog.open || !$(".camera__fallback").hidden) return;
    if (document.hidden) stop();
    else if (!stream && !capturing) start();
  }
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", stop);

  dialog.addEventListener("close", () => {
    stop();
    onClose();
  });

  return {
    open(challenge) {
      render(challenge);
      if (!dialog.open) dialog.showModal();
      start();
    },
    // Show the picker step straight away (camera already known to be blocked).
    openFallback(challenge, kind = "denied") {
      render(challenge);
      if (!dialog.open) dialog.showModal();
      showFallback(kind);
    },
    // A photo is being developed from the picker: keep the layer calm.
    setStatus,
    get isOpen() {
      return dialog.open;
    },
    stop,
    destroy() {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", stop);
    },
  };
}

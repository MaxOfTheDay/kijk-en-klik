// Live camera helpers around getUserMedia. Only what the browser offers:
// a stream, a frame grab, and cleanup. The UI lives in screens/camera.js.

let blocked = false;

export function liveCameraSupported() {
  return Boolean(window.isSecureContext && navigator.mediaDevices?.getUserMedia);
}

// True once the camera was refused (this session) or the browser reports the
// permission as denied. Then we go straight to the native picker.
export function liveCameraBlocked() {
  return blocked;
}

export async function checkCameraPermission() {
  try {
    const status = await navigator.permissions?.query({ name: "camera" });
    if (status?.state === "denied") blocked = true;
    else if (status?.state === "granted") blocked = false;
  } catch {
    // Permissions API without "camera" support (older Safari): just try.
  }
}

export async function startStream(facing) {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1440 } },
    });
  } catch (err) {
    if (err?.name === "NotAllowedError" || err?.name === "SecurityError") blocked = true;
    throw err;
  }
}

export function stopStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

export async function countCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput").length;
  } catch {
    return 1;
  }
}

// "denied" | "missing" | "busy"
export function cameraErrorKind(err) {
  if (err?.name === "NotAllowedError" || err?.name === "SecurityError") return "denied";
  if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") return "missing";
  return "busy";
}

// Grabs the current video frame as a JPEG, cropped to the viewfinder's
// portrait 3:4 frame so the photo matches exactly what was on screen.
// Frames from getUserMedia are already upright for the current orientation.
export function grabFrame(video, { aspect = 3 / 4, mirror = false } = {}) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  let sw = vw;
  let sh = vh;
  if (vw / vh > aspect) sw = Math.round(vh * aspect);
  else sh = Math.round(vw / aspect);
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (mirror) {
    ctx.translate(sw, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, sw, sh);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => {
      canvas.width = canvas.height = 0;
      blob ? resolve(blob) : reject(new Error("Frame capture failed"));
    }, "image/jpeg", 0.92),
  );
}

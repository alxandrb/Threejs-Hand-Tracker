/**
 * tracking.js
 * MediaPipe Hands inference loop — completely decoupled from rendering.
 *
 * Architecture:
 *  - Uses setTimeout (NOT requestAnimationFrame) so it never blocks the GPU.
 *  - Re-schedules itself AFTER inference completes → no frame stacking.
 *  - Rate is configurable via opts.mpFPS (default 20fps).
 *  - Writes raw positions to rawBuf (Float32Array) in smoothing.js.
 *  - Sets state.detected; stops recording if hand is lost.
 */

import { NJ, opts }        from './config.js';
import { state }           from './state.js';
import { rawBuf }          from './smoothing.js';
import { DOM, setHandData } from './ui.js';
import { stopRec }         from './recording.js';

// ─── Internal state ─────────────────────────────────────────────────
let _hands    = null; // Hands instance (MediaPipe)
let _timeout  = null; // setTimeout handle
let _running  = false;

// ─── Inference loop ─────────────────────────────────────────────────
function schedule() {
  _timeout = setTimeout(runInference, 1000 / opts.mpFPS);
}

async function runInference() {
  const video = DOM.video;

  if (!_running || !_hands || video.readyState < 2) {
    schedule();
    return;
  }

  try {
    await _hands.send({ image: video });
  } catch (_) {
    // Silently ignore transient inference errors
  }

  // Schedule the NEXT frame only after the current one finishes.
  // This prevents stacking if inference takes longer than the interval.
  schedule();
}

// ─── MediaPipe result callback ───────────────────────────────────────
function onResults(results) {
  DOM.dMp.classList.add('on');

  if (results.multiHandLandmarks?.length > 0) {
    const lms   = results.multiHandLandmarks[0];
    const scale = opts.scale;

    // Write to rawBuf — flat Float32Array, cache friendly
    for (let i = 0; i < NJ; i++) {
      const b = i * 3;
      rawBuf[b]     = -(lms[i].x - 0.5) * scale;
      rawBuf[b + 1] = -(lms[i].y - 0.5) * scale;
      rawBuf[b + 2] = -lms[i].z * 0.8;
    }

    state.detected = true;
    setHandData(true, countFingers(lms), results.multiHandedness[0]?.label ?? '-');
  } else {
    state.detected    = false;
    state.firstFrame  = false;
    setHandData(false, '-', '-');
    if (state.isRecording) stopRec();
  }
}

// ─── Finger count heuristic ──────────────────────────────────────────
function countFingers(lms) {
  // Tip indices: [4, 8, 12, 16, 20], PIP indices: [3, 6, 10, 14, 18]
  const tips = [8, 12, 16, 20];
  const pips = [6, 10, 14, 18];

  // Thumb: compare x instead of y (orientation-dependent)
  let count = lms[4].x < lms[3].x ? 1 : 0;

  for (let i = 0; i < 4; i++) {
    if (lms[tips[i]].y < lms[pips[i]].y) count++;
  }

  return count;
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Initialises MediaPipe Hands and warms up the model
 * (first inference call is slow; doing it during loading hides the lag).
 */
export async function initTracking() {
  _hands = new window.Hands({
    locateFile: f =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${f}`,
  });

  _hands.setOptions({
    maxNumHands:             1,
    modelComplexity:         0,   // 0 = lite/fast; 1 = full accuracy
    minDetectionConfidence:  0.65,
    minTrackingConfidence:   0.5,
  });

  _hands.onResults(onResults);

  // Warm-up: run one inference so the model is compiled before the user
  // sees the live feed. Errors here are non-fatal.
  const video = DOM.video;
  await new Promise(resolve => {
    if (video.readyState >= 2) { resolve(); return; }
    video.addEventListener('loadeddata', resolve, { once: true });
  });

  try { await _hands.send({ image: video }); } catch (_) {}
}

/** Starts the independent inference loop. Call after initTracking(). */
export function startMPLoop() {
  _running = true;
  schedule();
}

/**
 * Updates the inference rate on-the-fly (called by settings slider).
 * @param {number} fps - New target FPS.
 */
export function setMPRate(fps) {
  if (_timeout) clearTimeout(_timeout);
  opts.mpFPS = fps;
  if (_running) schedule();
}

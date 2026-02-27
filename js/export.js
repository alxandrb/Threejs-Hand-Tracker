/**
 * export.js
 * Generates the Blender Python import script and packages
 * everything into a downloadable ZIP file.
 */

import { LANDMARK_NAMES, TIPS } from './config.js';
import { recFrames }             from './recording.js';

const $ = id => document.getElementById(id);

// ─── Blender script generator ────────────────────────────────────────
/**
 * Returns a Python script string that, when run in Blender's
 * Scripting workspace, creates a "HandTracking" collection with
 * 21 keyframed Empty objects — one per landmark.
 *
 * @param {string} jsonFilename - Name of the JSON file (same folder as .py)
 * @returns {string}
 */
function buildBlenderScript(jsonFilename) {
  const namesLiteral = JSON.stringify(LANDMARK_NAMES); // valid Python list
  const tipsLiteral  = [...TIPS].join(', ');

  return `\
# ═══════════════════════════════════════════════════════════
# HAND.TRACK 3D — Blender Import Script
# Blender 3.0+  |  Scripting workspace → Open → Run Script ▶
# ═══════════════════════════════════════════════════════════
import bpy, json, os
from mathutils import Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH  = os.path.join(SCRIPT_DIR, "${jsonFilename}")
SCALE      = 1.0   # Three.js units → Blender units

NAMES = ${namesLiteral}
TIPS  = {${tipsLiteral}}


# ── Coordinate conversion: Three.js (Y-up) → Blender (Z-up) ────────
def to_blender(x, y, z):
    return Vector((x * SCALE, -z * SCALE, y * SCALE))


# ── Load data ────────────────────────────────────────────────────────
if not os.path.exists(JSON_PATH):
    raise FileNotFoundError(f"Not found: {JSON_PATH}\\n"
                             "Keep the .py and .json in the same folder.")

with open(JSON_PATH) as f:
    data = json.load(f)

fps    = data.get("fps", 30)
frames = data["frames"]
N      = len(frames)
print(f"\\n▶ Importing: {N} frames @ {fps} fps  ({data.get('duration', '?')}s)")


# ── Scene setup ──────────────────────────────────────────────────────
scene              = bpy.context.scene
scene.render.fps   = fps
scene.frame_start  = 1
scene.frame_end    = N


# ── Clean previous import ────────────────────────────────────────────
if "HandTracking" in bpy.data.collections:
    col = bpy.data.collections["HandTracking"]
    for obj in list(col.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.collections.remove(col)

col = bpy.data.collections.new("HandTracking")
scene.collection.children.link(col)


# ── Create one Empty per landmark ────────────────────────────────────
empties = []
for i, name in enumerate(NAMES):
    bpy.ops.object.empty_add(type="SPHERE", location=(0, 0, 0))
    obj = bpy.context.active_object
    obj.name               = f"Hand_{name}"
    obj.empty_display_size = 0.014 if i in TIPS else 0.009
    obj.color              = (1, 0, 0.67, 1) if i in TIPS else (0, 1, 0.91, 1)

    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)
    empties.append(obj)


# ── Insert keyframes ─────────────────────────────────────────────────
print("▶ Inserting keyframes...")
for fi, frame_data in enumerate(frames):
    lm = frame_data["lm"]   # flat array [x0,y0,z0, x1,y1,z1, ...]
    for i, obj in enumerate(empties):
        obj.location = to_blender(lm[i*3], lm[i*3+1], lm[i*3+2])
        obj.keyframe_insert(data_path="location", frame=fi + 1)
    if fi % 100 == 0:
        print(f"  {fi + 1}/{N}")


# ── Set linear interpolation (prevent Bezier overshoot) ─────────────
for obj in empties:
    if obj.animation_data and obj.animation_data.action:
        for fc in obj.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"


print(f"\\n✓ Done!  HandTracking → {len(empties)} empties × {N} keyframes @ {fps} fps")
print("  Tip: use Copy Location constraints on a Rigify hand armature")
`;
}

// ─── Modal helpers ───────────────────────────────────────────────────
function openModal() {
  if (!recFrames.length) return;

  const el  = recFrames[recFrames.length - 1].t;
  const fps = recFrames.length / Math.max(el, 0.001);

  $('ex-d').textContent   = el.toFixed(2) + 's';
  $('ex-f').textContent   = recFrames.length;
  $('ex-fps').textContent = fps.toFixed(1);

  $('emodal').classList.add('visible');
}

function closeModal() {
  $('emodal').classList.remove('visible');
}

// ─── ZIP download ────────────────────────────────────────────────────
async function downloadZip() {
  if (!recFrames.length) return;

  const el       = recFrames[recFrames.length - 1].t;
  const fps      = Math.round(recFrames.length / Math.max(el, 0.001)) || 30;
  const filename = 'hand_animation.json';

  const jsonPayload = {
    version:    '2.0',
    generator:  'Hand.Track 3D',
    fps,
    frameCount: recFrames.length,
    duration:   +el.toFixed(3),
    landmarks:  21,
    format:     'lm: flat Float32 array [x0,y0,z0,...] — Three.js Y-up world space',
    frames:     recFrames,
  };

  const readme = [
    'HAND.TRACK 3D — EXPORT',
    '======================',
    '',
    `Frames   : ${recFrames.length}`,
    `Duration : ${el.toFixed(2)}s`,
    `FPS      : ${fps}`,
    `Recorded : ${new Date().toLocaleString()}`,
    '',
    'HOW TO IMPORT IN BLENDER',
    '  1. Keep this .py next to hand_animation.json',
    '  2. Blender → Scripting workspace',
    '  3. Open → import_hand_blender.py → Run Script ▶',
    '',
    'Coordinate system: Three.js Y-up → Blender Z-up (handled by the script).',
    'Tip: Use Copy Location constraints to drive a Rigify hand armature.',
  ].join('\n');

  const zip = new window.JSZip();
  zip.file(filename,                JSON.stringify(jsonPayload));
  zip.file('import_hand_blender.py', buildBlenderScript(filename));
  zip.file('README.txt',             readme);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href:     url,
    download: `hand_track_${Date.now()}.zip`,
  });
  a.click();
  URL.revokeObjectURL(url);

  closeModal();
}

// ─── Public API ─────────────────────────────────────────────────────
export function initExport() {
  $('expbtn').addEventListener('click',   openModal);
  $('dlbtn').addEventListener('click',    downloadZip);
  $('closebtn').addEventListener('click', closeModal);
}

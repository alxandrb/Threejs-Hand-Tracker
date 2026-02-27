<div align="center">

```
██╗  ██╗ █████╗ ███╗   ██╗██████╗     ████████╗██████╗  █████╗  ██████╗██╗  ██╗
██║  ██║██╔══██╗████╗  ██║██╔══██╗    ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝
███████║███████║██╔██╗ ██║██║  ██║       ██║   ██████╔╝███████║██║     █████╔╝
██╔══██║██╔══██║██║╚██╗██║██║  ██║       ██║   ██╔══██╗██╔══██║██║     ██╔═██╗
██║  ██║██║  ██║██║ ╚████║██████╔╝       ██║   ██║  ██║██║  ██║╚██████╗██║  ██╗
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝        ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
```

### Real-time 3D hand tracking · MediaPipe × Three.js · Blender export

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-00ffe7?style=for-the-badge&logoColor=black)](https://YOUR-USERNAME.github.io/hand-tracking/)
[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-181717?style=for-the-badge&logo=github&logoColor=white)](https://pages.github.com/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Hands-0097A7?style=for-the-badge&logo=google&logoColor=white)](https://mediapipe.dev/)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-ff00aa?style=for-the-badge)](LICENSE)

</div>

---

## ✦ What is this?

A **single HTML file** that turns your webcam into a real-time 3D hand motion capture studio — directly in the browser, zero install required. Track your hand's 21 landmarks, visualize them as a glowing 3D rig, record the motion, and export it straight into **Blender** as keyframed animation data.

<div align="center">

|       🎯 Track        |          💀 Rig          |      ⏺ Record       |     🐍 Export     |
| :-------------------: | :----------------------: | :-----------------: | :---------------: |
| 21 landmarks at 60fps | Instanced joints + bones | Up to 30fps capture | ZIP → Blender .py |

</div>

---

## ⚡ Quick Start

**No install. No build step. No dependencies to download.**

```
1. Open index.html in Chrome / Edge / Firefox
2. Allow camera access
3. Point your hand at the webcam
4. Done.
```

Or visit the **[live demo →](https://YOUR-USERNAME.github.io/hand-tracking/)**

> ⚠️ Requires HTTPS or localhost for camera access. GitHub Pages handles this automatically.

---

## 🏗 Architecture

The core insight that makes this run at **60fps** is **fully decoupled loops**:

```
┌─────────────────────────────────────────┐     ┌────────────────────────────────────┐
│         RENDER LOOP  (rAF ~60fps)       │     │    MEDIAPIPE LOOP (setTimeout)     │
│                                         │     │                                    │
│  reads smoothPos[]                      │     │  captures video frame              │
│  lerp(smoothPos → rawBuf)               │◀────│  runs inference (complexity=0)     │
│  updates InstancedMesh matrices         │     │  writes rawBuf[Float32Array]       │
│  renders scene                          │     │  reschedules after inference done  │
│                                         │     │                                    │
│  NEVER waits for MediaPipe              │     │  rate: 5–30fps (configurable)      │
└─────────────────────────────────────────┘     └────────────────────────────────────┘
         ↑ always runs at full speed                      ↑ never blocks rendering
```

The **smoothing lerp** in the render loop bridges the gap — even at 20fps MediaPipe input, motion appears fluid at 60fps.

---

## 🔧 Performance Optimizations

| Optimization            | Before                               | After                                    |
| ----------------------- | ------------------------------------ | ---------------------------------------- |
| Draw calls              | **45** (21 spheres + 24 cylinders)   | **2** (InstancedMesh)                    |
| Allocations in hot path | `new Vector3()` every frame          | **zero** (pre-allocated scratch objects) |
| MediaPipe resolution    | 640×480                              | **320×240** (4× fewer pixels)            |
| MediaPipe model         | complexity=1                         | **complexity=0** (lite, ~2× faster)      |
| Renderer                | ACESFilmic, antialias on, PR=device  | **NoToneMapping, antialias off, PR≤1.5** |
| CSS                     | `backdrop-filter: blur()` everywhere | **removed** (GPU expensive)              |
| DOM updates             | Every frame                          | **Throttled every 8 frames**             |
| Tone mapping            | ACESFilmic                           | **None** (saves shader overhead)         |

**Result:** 9fps → **60fps** on typical hardware.

---

## 🎛 Settings Panel

Click **⚙ SETTINGS** to access:

**Motion**

- `Smoothing` — lerp alpha from `HIGH` (very smooth, slight lag) to `RAW` (instant, jittery)
- `Scale` — hand size in 3D space

**Visibility**

- Toggle joints, bones, fingertip highlights, particles, camera feed independently

**Effects**

- Pulse animation, wireframe bones

**Performance**

- `MediaPipe Rate` — 5 to 30fps inference rate. Lower = faster render, higher = more responsive tracking

---

## ⏺ Recording & Export

```
1. Choose duration (5s / 10s / 15s / 30s / ∞)
2. Click  ⏺ START RECORDING
3. Move your hand — captured at 30fps
4. Click  ⬇ EXPORT FOR BLENDER
5. Download the ZIP
```

The ZIP contains:

```
hand_track_TIMESTAMP.zip
├── hand_animation.json        ← 21 landmarks × N frames × [x,y,z]
├── import_hand_blender.py     ← Run this in Blender
└── README.txt
```

---

## 🐍 Blender Import

**Requirements:** Blender 3.0+

```
1. Extract the ZIP (keep both files in the same folder)
2. Open Blender
3. Go to the Scripting workspace
4. Click Open → select import_hand_blender.py
5. Click ▶ Run Script
```

This creates a **`HandTracking` collection** with 21 keyframed Empty objects — one per landmark, named anatomically:

```
HandTracking/
├── Hand_Wrist
├── Hand_Thumb_CMC  →  Hand_Thumb_Tip
├── Hand_Index_MCP  →  Hand_Index_Tip
├── Hand_Middle_MCP →  Hand_Middle_Tip
├── Hand_Ring_MCP   →  Hand_Ring_Tip
└── Hand_Pinky_MCP  →  Hand_Pinky_Tip
```

All keyframes use **LINEAR interpolation** — no Bezier overshoot on fast movements.

**Tip:** Drive a Rigify hand armature using **Copy Location** constraints targeting these empties, or use them directly as IK targets.

---

## 📐 Data Format

```json
{
  "version": "2.0",
  "fps": 30,
  "frameCount": 150,
  "duration": 5.0,
  "landmarks": 21,
  "format": "lm: flat array [x0,y0,z0,...] Three.js Y-up",
  "frames": [
    { "t": 0.0000, "lm": [0.012, -0.103, 0.001,  0.024, ...] },
    { "t": 0.0333, "lm": [...] }
  ]
}
```

**Coordinate system:**

```
Three.js (Y-up)     →    Blender (Z-up)
  X  (right)               X  (right)
  Y  (up)                  Z  (up)
  Z  (forward)            -Y  (forward)
```

The import script handles this conversion automatically.

---

## 🛠 Tech Stack

|                   |                                                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **3D Rendering**  | [Three.js r128](https://threejs.org/) — WebGL via `InstancedMesh`                                                             |
| **Hand Tracking** | [MediaPipe Hands 0.4](https://google.github.io/mediapipe/solutions/hands) — 21 landmark model                                 |
| **Export**        | [JSZip 3.10](https://stuk.github.io/jszip/) — client-side ZIP generation                                                      |
| **Fonts**         | [Share Tech Mono](https://fonts.google.com/specimen/Share+Tech+Mono) + [Rajdhani](https://fonts.google.com/specimen/Rajdhani) |
| **Deploy**        | GitHub Pages — zero config, free HTTPS                                                                                        |

**Zero build tools. Zero npm. Zero bundlers.** Pure HTML + vanilla JS.

---

## 🧠 MediaPipe Landmark Map

```
                    8   12  16  20
                    |   |   |   |
                7   11  15  19
                |   |   |   |
            6   10  14  18
            |   |   |   |
        5   9   13  17
         \  |   |  /
          \ |   | /
           \|   |/
    4        0 (Wrist)
    |       /
    3      /
    |     /
    2    /
    |   /
    1  /
    | /
    Thumb
```

---

## 📁 File Structure

```
hand-tracking/
└── index.html     ← The entire application (single file, ~650 lines)
```

That's it.

---

## 🚀 Deploy Your Own

```bash
# Fork or clone
git clone https://github.com/YOUR-USERNAME/hand-tracking.git

# No install needed — just serve it
npx serve .           # or
python -m http.server # or just open index.html in Chrome
```

**GitHub Pages:**

1. Repo → **Settings → Pages**
2. Source: `main` branch, `/ (root)`
3. Save → live at `https://alxandrb.github.io/Threejs-Hand-Tracker/`

---

## 📜 License

**Proprietary — All Rights Reserved.**

This code may not be used, copied, modified, or distributed without explicit written permission from the author. Viewing the source does not grant any rights. See [`LICENSE`](LICENSE) for full terms.

---

<div align="center">

Made with `Three.js` + `MediaPipe` + one HTML file

_Built for speed. Built for Blender. Built in the browser._

</div>

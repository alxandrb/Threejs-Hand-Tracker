/**
 * config.js
 * Application-wide constants and mutable options object.
 * All magic numbers live here — nowhere else.
 */

/** Number of hand landmarks (MediaPipe Hands) */
export const NJ = 21;

/** Number of bone connections */
export const NC = 24;

/**
 * Bone connection pairs [from, to] — indices into the 21 landmarks.
 * Ordered: thumb, index, middle, ring, pinky, palm cross-braces.
 */
export const CONNECTIONS = [
  // Thumb
  [0, 1],  [1, 2],  [2, 3],  [3, 4],
  // Index
  [0, 5],  [5, 6],  [6, 7],  [7, 8],
  // Middle
  [0, 9],  [9, 10], [10, 11],[11, 12],
  // Ring
  [0, 13], [13, 14],[14, 15],[15, 16],
  // Pinky
  [0, 17], [17, 18],[18, 19],[19, 20],
  // Palm cross-braces
  [5, 9],  [9, 13], [13, 17],[5, 17],
];

/** Indices of fingertip landmarks */
export const TIPS = new Set([4, 8, 12, 16, 20]);

/** Anatomical names for all 21 landmarks (used in Blender export) */
export const LANDMARK_NAMES = [
  'Wrist',
  'Thumb_CMC',  'Thumb_MCP',  'Thumb_IP',   'Thumb_Tip',
  'Index_MCP',  'Index_PIP',  'Index_DIP',  'Index_Tip',
  'Middle_MCP', 'Middle_PIP', 'Middle_DIP', 'Middle_Tip',
  'Ring_MCP',   'Ring_PIP',   'Ring_DIP',   'Ring_Tip',
  'Pinky_MCP',  'Pinky_PIP',  'Pinky_DIP',  'Pinky_Tip',
];

/**
 * Runtime options — mutated by the settings panel.
 * Exported as a plain object so all modules share the same reference.
 */
export const opts = {
  /** Lerp alpha applied each render frame (0.02 = max smooth, 1.0 = raw) */
  smooth: 0.18,

  /** World-space scale factor for landmark positions */
  scale: 1.20,

  /** Visibility toggles */
  joints:    true,
  bones:     true,
  tips:      true,
  particles: true,
  cam:       true,

  /** Effect toggles */
  pulse: true,
  wire:  false,

  /** MediaPipe inference target FPS (independent of render loop) */
  mpFPS: 20,
};

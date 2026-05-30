/**
 * useViewport – manages pan/zoom state for the schematic canvas.
 *
 * Coordinate spaces
 * -----------------
 * "Screen"  – pixel position relative to the canvas element (mouse events).
 * "World"   – the schematic coordinate system where components/wires live.
 *
 * Transform: screen = world * scale + offset
 *            world  = (screen - offset) / scale
 */

import { useCallback, useRef, useState } from 'react';
import type { Point } from '../types';

export interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export const DEFAULT_VIEWPORT: Viewport = { offsetX: 0, offsetY: 0, scale: 1 };

/** Convert a screen-space point to world-space. */
export function screenToWorld(p: Point, vp: Viewport): Point {
  return {
    x: (p.x - vp.offsetX) / vp.scale,
    y: (p.y - vp.offsetY) / vp.scale,
  };
}

/** Convert a world-space point to screen-space. */
export function worldToScreen(p: Point, vp: Viewport): Point {
  return {
    x: p.x * vp.scale + vp.offsetX,
    y: p.y * vp.scale + vp.offsetY,
  };
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;
const ZOOM_FACTOR = 1.12; // how much one scroll tick zooms

export function useViewport() {
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);

  // --- Pan -------------------------------------------------------------------
  const isPanning = useRef(false);
  const panStart = useRef<Point>({ x: 0, y: 0 });
  const panOrigin = useRef<Viewport>(DEFAULT_VIEWPORT);

  const beginPan = useCallback((screenPt: Point) => {
    isPanning.current = true;
    panStart.current = screenPt;
    panOrigin.current = viewport; // capture current viewport
  }, [viewport]);

  /** Call on mousemove; returns true while panning. */
  const continuePan = useCallback((screenPt: Point): boolean => {
    if (!isPanning.current) return false;
    const dx = screenPt.x - panStart.current.x;
    const dy = screenPt.y - panStart.current.y;
    setViewport({
      ...panOrigin.current,
      offsetX: panOrigin.current.offsetX + dx,
      offsetY: panOrigin.current.offsetY + dy,
    });
    return true;
  }, []);

  const endPan = useCallback(() => {
    isPanning.current = false;
  }, []);

  // --- Zoom -----------------------------------------------------------------
  /**
   * Zoom around a screen-space pivot so the world point under the cursor
   * stays fixed – exactly like LTspice / KiCad.
   */
  const zoomAt = useCallback((screenPivot: Point, delta: number) => {
    const factor = delta < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    setViewport((vp) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, vp.scale * factor));
      // Keep world point under cursor stationary:
      // screenPivot = worldPivot * newScale + newOffset  =>
      // newOffset = screenPivot - worldPivot * newScale
      const worldPivot = screenToWorld(screenPivot, vp);
      return {
        scale: newScale,
        offsetX: screenPivot.x - worldPivot.x * newScale,
        offsetY: screenPivot.y - worldPivot.y * newScale,
      };
    });
  }, []);

  // --- Reset -----------------------------------------------------------------
  const resetViewport = useCallback(() => setViewport(DEFAULT_VIEWPORT), []);

  return {
    viewport,
    setViewport,
    // pan
    isPanning,
    beginPan,
    continuePan,
    endPan,
    // zoom
    zoomAt,
    // misc
    resetViewport,
  };
}

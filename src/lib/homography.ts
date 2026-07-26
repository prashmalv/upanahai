/**
 * Perspective-correct measurement from a single photo.
 *
 * THE PROBLEM
 * A photo is a projection, so pixel distances are not proportional to real
 * distances: tilt the camera and the far end of the foot shrinks. Scaling by
 * "reference object pixels ÷ reference object mm" only works if the camera is
 * perfectly perpendicular, which it never is. That single assumption is the
 * biggest source of error in photo-based foot measurement.
 *
 * THE FIX
 * Anything lying flat on one plane (an A4 sheet, and the foot standing on it) is
 * related to that plane's real coordinates by a homography — a 3x3 projective
 * transform. Four point correspondences determine it exactly. Give it the four
 * corners of a sheet whose real size is known, and every other point on that
 * plane can be converted to millimetres, tilt and all.
 *
 * We ask the user to tap the corners rather than detect them automatically:
 * humans identify a sheet's corners more reliably than an edge detector does on
 * a patterned floor, and it keeps the whole thing dependency-free and
 * deterministic — the same taps always produce the same millimetres.
 */

export type Pt = { x: number; y: number };

/** Reference sheets, long edge x short edge in mm. */
export const REFERENCES = {
  a4: { label: "A4 sheet", w: 297, h: 210 },
  letter: { label: "US Letter", w: 279.4, h: 215.9 },
  card: { label: "Bank card", w: 85.6, h: 53.98 }
} as const;

export type ReferenceKey = keyof typeof REFERENCES;

/**
 * Solve the 8 unknowns of the homography that maps `src` (image pixels) to
 * `dst` (real mm), with h33 fixed at 1. Gaussian elimination with partial
 * pivoting — 8x8 is far too small to justify a linear-algebra dependency.
 *
 * Returns null when the points are degenerate (collinear, or two taps on the
 * same spot), which is exactly when a silently-wrong answer would be worst.
 */
export function solveHomography(src: Pt[], dst: Pt[]): number[] | null {
  if (src.length !== 4 || dst.length !== 4) return null;

  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: X, y: Y } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }

  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-10) return null; // degenerate
    [M[col], M[pivot]] = [M[pivot], M[col]];

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      if (f === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }

  const h = M.map((row, i) => row[n] / row[i]);
  if (h.some((v) => !Number.isFinite(v))) return null;
  return [...h, 1];
}

/** Map an image point to plane coordinates in mm. */
export function applyHomography(h: number[], p: Pt): Pt {
  const d = h[6] * p.x + h[7] * p.y + h[8];
  if (Math.abs(d) < 1e-12) return { x: NaN, y: NaN };
  return {
    x: (h[0] * p.x + h[1] * p.y + h[2]) / d,
    y: (h[3] * p.x + h[4] * p.y + h[5]) / d
  };
}

/**
 * Real distance in mm between two tapped image points, given the four tapped
 * corners of a reference of known size.
 *
 * `corners` must be in the order top-left, top-right, bottom-right,
 * bottom-left as seen in the photo — the UI enforces that order by asking for
 * one corner at a time.
 */
export function measureMm(
  corners: Pt[],
  reference: ReferenceKey,
  from: Pt,
  to: Pt
): number | null {
  const r = REFERENCES[reference];
  // The sheet's own coordinate frame: (0,0) at top-left, mm along each edge.
  const dst: Pt[] = [
    { x: 0, y: 0 },
    { x: r.w, y: 0 },
    { x: r.w, y: r.h },
    { x: 0, y: r.h }
  ];
  const h = solveHomography(corners, dst);
  if (!h) return null;

  const a = applyHomography(h, from);
  const b = applyHomography(h, to);
  if (!Number.isFinite(a.x) || !Number.isFinite(b.x)) return null;

  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Sanity check on the tapped quad. A reference photographed at a sane angle
 * stays convex and keeps roughly the right aspect ratio; wildly wrong taps
 * (corners out of order, a corner on the floor instead of the sheet) show up
 * here rather than as a plausible-looking wrong measurement.
 */
export function cornersLookSane(corners: Pt[], reference: ReferenceKey): string | null {
  if (corners.length !== 4) return "Tap all four corners of the sheet.";

  const cross = (o: Pt, a: Pt, b: Pt) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const signs = corners.map((_, i) =>
    Math.sign(cross(corners[i], corners[(i + 1) % 4], corners[(i + 2) % 4]))
  );
  if (signs.some((s) => s === 0) || new Set(signs).size > 1) {
    return "Those corners cross over each other — tap them going around the sheet, not diagonally.";
  }

  const side = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
  const top = side(corners[0], corners[1]);
  const right = side(corners[1], corners[2]);
  if (top < 40 || right < 40) return "The sheet looks too small in the photo — move closer and retake.";

  const r = REFERENCES[reference];
  const expected = r.w / r.h;
  const seen = top / right;
  // Perspective legitimately distorts the ratio; only flag the extreme case,
  // which usually means the corners were tapped in the wrong order.
  if (seen < expected / 3 || seen > expected * 3) {
    return "That doesn't look like the sheet's outline — start again from the top-left corner.";
  }
  return null;
}

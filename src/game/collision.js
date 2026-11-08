// Pure 2D (XZ-plane) collision helpers. No three.js dependency -> unit-testable in Node.

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/** Push circle (p.x, p.z, r) out of an axis-aligned box. Mutates p. Returns true on contact. */
export function resolveCircleAABB(p, r, b) {
  const cx = clamp(p.x, b.minX, b.maxX);
  const cz = clamp(p.z, b.minZ, b.maxZ);
  const dx = p.x - cx;
  const dz = p.z - cz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 > 1e-10) {
    const d = Math.sqrt(d2);
    const push = (r - d) / d;
    p.x += dx * push;
    p.z += dz * push;
  } else {
    // Centre inside the box: exit along the axis of least penetration
    const left = p.x - b.minX, right = b.maxX - p.x, back = p.z - b.minZ, front = b.maxZ - p.z;
    const m = Math.min(left, right, back, front);
    if (m === left) p.x = b.minX - r;
    else if (m === right) p.x = b.maxX + r;
    else if (m === back) p.z = b.minZ - r;
    else p.z = b.maxZ + r;
  }
  return true;
}

/** Push circle a away from a static circle b. Mutates a. */
export function resolveCircleCircle(a, ra, b, rb) {
  const dx = a.x - b.x, dz = a.z - b.z;
  const d2 = dx * dx + dz * dz;
  const R = ra + rb;
  if (d2 >= R * R || d2 < 1e-10) return false;
  const d = Math.sqrt(d2);
  a.x += (dx / d) * (R - d);
  a.z += (dz / d) * (R - d);
  return true;
}

/** Resolve a moving circle against all enabled colliders (a few passes for corners). */
export function resolveAll(p, r, colliders, circles = []) {
  let hit = false;
  for (let pass = 0; pass < 3; pass++) {
    for (const b of colliders) if (b.enabled !== false && resolveCircleAABB(p, r, b)) hit = true;
    for (const c of circles) if (resolveCircleCircle(p, r, c, c.r)) hit = true;
  }
  return hit;
}

export const box = (cx, cz, w, d, extra = {}) => ({
  minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, ...extra,
});

export const inRect = (x, z, r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;

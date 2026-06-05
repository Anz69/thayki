// Mirrors cobe v2's internal lat/lng → screen projection so DOM labels can be
// anchored to the exact same points cobe renders its markers/arcs at.
// Derived from cobe's `U` (location → unit vector), `O` (vector → screen) and
// the globe radius constant `ee = 0.8`. Assumes a square canvas, scale 1,
// offset [0,0] — which is how Globe.jsx configures createGlobe.

const PI = Math.PI
const EE = 0.8 // cobe globe radius

// cobe `U`: [lat, lng] (degrees) → unit vector on the sphere
function locationToVector(lat, lng) {
  const r = (lat * PI) / 180
  const a = (lng * PI) / 180 - PI
  const o = Math.cos(r)
  return [-o * Math.cos(a), Math.sin(r), o * Math.sin(a)]
}

// cobe `O`: 3D vector → { x, y } in 0..1 of the canvas + signed depth.
// depth >= 0 means the point faces the camera (front hemisphere).
function projectVector(v, phi, theta) {
  const ct = Math.cos(theta)
  const st = Math.sin(theta)
  const cp = Math.cos(phi)
  const sp = Math.sin(phi)
  const c = cp * v[0] + sp * v[2]
  const s = sp * st * v[0] + ct * v[1] - cp * st * v[2]
  const depth = -sp * ct * v[0] + st * v[1] + cp * ct * v[2]
  return { x: (c + 1) / 2, y: (-s + 1) / 2, depth }
}

export function projectCity(lat, lng, phi, theta, elevation = 0.04) {
  const u = locationToVector(lat, lng)
  const r = EE + elevation
  return projectVector([u[0] * r, u[1] * r, u[2] * r], phi, theta)
}

// cobe `X`: midpoint (peak) of an arc between two locations
export function projectArcMid(a, b, phi, theta, arcHeight = 0.42, elevation = 0.04) {
  const ta = locationToVector(a[0], a[1])
  const tb = locationToVector(b[0], b[1])
  const sum = [ta[0] + tb[0], ta[1] + tb[1], ta[2] + tb[2]]
  const o = Math.hypot(sum[0], sum[1], sum[2]) || 1e-6
  const i = 0.25 * (EE + elevation) + (0.5 * (EE + arcHeight + elevation)) / o
  return projectVector([sum[0] * i, sum[1] * i, sum[2] * i], phi, theta)
}

// Smooth front/back fade from signed depth
export function depthToOpacity(depth) {
  if (depth >= 0.04) return 1
  if (depth <= -0.06) return 0
  return (depth + 0.06) / 0.1
}

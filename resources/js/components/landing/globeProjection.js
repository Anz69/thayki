
const PI = Math.PI
const EE = 0.8

function locationToVector(lat, lng) {
  const r = (lat * PI) / 180
  const a = (lng * PI) / 180 - PI
  const o = Math.cos(r)
  return [-o * Math.cos(a), Math.sin(r), o * Math.sin(a)]
}

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

export function projectArcMid(a, b, phi, theta, arcHeight = 0.42, elevation = 0.04) {
  const ta = locationToVector(a[0], a[1])
  const tb = locationToVector(b[0], b[1])
  const sum = [ta[0] + tb[0], ta[1] + tb[1], ta[2] + tb[2]]
  const o = Math.hypot(sum[0], sum[1], sum[2]) || 1e-6
  const i = 0.25 * (EE + elevation) + (0.5 * (EE + arcHeight + elevation)) / o
  return projectVector([sum[0] * i, sum[1] * i, sum[2] * i], phi, theta)
}

export function depthToOpacity(depth) {
  if (depth >= 0.04) return 1
  if (depth <= -0.06) return 0
  return (depth + 0.06) / 0.1
}

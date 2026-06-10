export const catalogCache = {
  models: [],
  page: 1,
  hasMore: false,
  ts: 0,
}

export function clearCatalogCache() {
  catalogCache.models = []
  catalogCache.page = 1
  catalogCache.hasMore = false
  catalogCache.ts = 0
}

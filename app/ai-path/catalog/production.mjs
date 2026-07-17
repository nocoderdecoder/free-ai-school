import {
  selectEligibleCatalogResources,
  validateCatalogForPublication,
} from './catalog.ts'
import { AI_PATH_CATALOG_V1 } from './v1.ts'

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value).forEach(deepFreeze)
  return Object.freeze(value)
}

deepFreeze(AI_PATH_CATALOG_V1)

function adaptResource(resource) {
  return {
    id: resource.id,
    title: resource.title,
    provider: resource.provider,
    canonicalUrl: resource.canonicalUrl,
    format: resource.format,
    free: resource.cost.kind === 'free',
    costDisclosure: resource.cost.disclosure,
    estimatedHours: resource.estimatedMinutes / 60,
    quality: resource.qualityScore,
    skills: resource.skills.map(mapping => ({ ...mapping })),
    prerequisites: resource.prerequisites.map(prerequisite => ({ ...prerequisite })),
    reason: resource.reason,
  }
}

/**
 * Fail-closed production boundary between governed catalog records and the
 * smaller deterministic ranker contract. The optional snapshot exists for
 * deterministic gate tests; production callers always use the pinned export.
 */
export function selectPublishedCatalogResources(input, snapshot = AI_PATH_CATALOG_V1) {
  if (snapshot.publicationStatus !== 'published') {
    return {
      status: 'catalog_unavailable',
      catalogVersion: snapshot.catalogVersion,
      resources: [],
      issues: [{ path: 'publicationStatus', code: 'catalog_not_published', message: 'catalog must be published' }],
    }
  }

  const validation = validateCatalogForPublication(snapshot, input.asOf)
  if (!validation.ok) {
    return {
      status: 'catalog_unavailable',
      catalogVersion: snapshot.catalogVersion,
      resources: [],
      issues: validation.issues,
    }
  }

  const resources = selectEligibleCatalogResources(snapshot, input).map(adaptResource)
  return {
    status: resources.length ? 'available' : 'no_eligible_resources',
    catalogVersion: snapshot.catalogVersion,
    resources,
    issues: [],
  }
}

export { AI_PATH_CATALOG_V1 as AI_PATH_PUBLISHED_CATALOG }

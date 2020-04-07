const { createClient, CATALOGUE_INDEX } = require('./index')

const FIELDS = {
  PRODUCT: {
    ID: 'product.id',
    NAME: 'product.name',
    PATH: 'product.path',
    TOPICS: {
      NAME: 'product.topics.name',
    },
  },
  VARIANT: {
    ID: 'variant.id',
    NAME: 'variant.name',
    SKU: 'variant.sku',
    PRICE: 'variant.price',
    STOCK: 'variant.stock',
    IS_DEFAULT: 'variant.isDefault',
  },
}

const ORDER_FIELDS = {
  PRODUCT_NAME: `${FIELDS.PRODUCT.NAME}.keyword`, // keyword needed to order on textfield
  PRICE: FIELDS.VARIANT.PRICE,
  STOCK: FIELDS.VARIANT.STOCK,
}

const FILTER_FIELDS = {
  productIds: FIELDS.PRODUCT.ID,
  variantIds: FIELDS.VARIANT.ID,
  skus: FIELDS.VARIANT.SKU,
  paths: FIELDS.PRODUCT.PATH,
  topicNames: FIELDS.PRODUCT.TOPICS.NAME,
}

const buildFilterFieldsQueries = filters => {
  return Object.keys(FILTER_FIELDS)
    .map(key => {
      const values = filters[key]
      if (!values || !values.length) {
        return null
      }

      return {
        bool: {
          should: values.map(value => {
            const matchPhrase = {}
            matchPhrase[FILTER_FIELDS[key]] = value
            return {
              match_phrase: matchPhrase,
            }
          }),
          minimum_should_match: 1,
        },
      }
    })
    .filter(query => query)
}

/**
 * Builds the `filter` part of the ES query. You should put any non-text search
 * queries such as numbers and other computed values for performance.
 *
 * @param {Object} params Search params
 */
const buildFilterQuery = ({ isDefault, priceRange }) => {
  let filterQuery = []

  // Filter variants based on whether they are the default
  if (isDefault !== undefined) {
    const query = { term: {} }
    query.term[FIELDS.VARIANT.IS_DEFAULT] = isDefault
    filterQuery = filterQuery.concat(query)
  }

  // Filter variants based on price range
  if (priceRange) {
    const query = { range: {} }
    query.range[FIELDS.VARIANT.PRICE] = {
      gte: priceRange.min || 0,
      lte: priceRange.max || Number.MAX_SAFE_INTEGER,
    }
    filterQuery = filterQuery.concat(query)
  }

  return filterQuery
}

/**
 * Builds the `must` part of the ES query. You should use this for matching text
 * phrases and terms (non-computed values).
 *
 * @param {Object} params Search params
 */
const buildMustQuery = ({ searchTerm, include, attributes }) => {
  let mustQuery = []

  // Generic search term to query over multiple fields
  if (searchTerm) {
    mustQuery = mustQuery.concat({
      multi_match: {
        query: searchTerm,
        fields: [
          FIELDS.VARIANT.NAME,
          FIELDS.VARIANT.SKU,
          FIELDS.PRODUCT.NAME,
          FIELDS.PRODUCT.PATH,
          FIELDS.PRODUCT.TOPICS.NAME,
        ],
        operator: 'and',
        type: 'best_fields',
      },
    })
  }

  // Arrays of identifiers to match, e.g. searching for products by ids
  if (include) {
    mustQuery = mustQuery.concat(buildFilterFieldsQueries(include))
  }

  // Variant attributes based on a matrix of attributes and values
  if (attributes) {
    mustQuery = mustQuery.concat(
      attributes.map(({ attribute, values }) => ({
        bool: {
          must: [
            {
              match_phrase: {
                'variant.attributes.attribute': attribute,
              },
            },
            {
              bool: {
                should: values.map(val => ({
                  match_phrase: { 'variant.attributes.value': val },
                })),
                minimum_should_match: 1,
              },
            },
          ],
        },
      }))
    )
  }

  return mustQuery
}

/**
 * Builds the `must_not` part of the query to exclude certain search terms from
 * the results.
 *
 * @param {object} params Search params
 */
const buildMustNotQuery = ({ exclude }) => {
  let mustNotQuery = []

  if (exclude) {
    mustNotQuery = mustNotQuery.concat(buildFilterFieldsQueries(exclude))
  }

  return mustNotQuery
}

/**
 * Builds up a bool query to send to elasticsearch.
 *
 * @param {object} params Search params
 */
const buildQuery = params => {
  const filterQuery = buildFilterQuery(params)
  const mustQuery = buildMustQuery(params)
  const mustNotQuery = buildMustNotQuery(params)

  return {
    bool: {
      filter: filterQuery,
      must: mustQuery,
      must_not: mustNotQuery,
    },
  }
}

const buildSort = orderBy => {
  let sort = []

  if (orderBy) {
    const { field, direction } = orderBy
    const obj = {}
    obj[ORDER_FIELDS[field]] = direction
    sort = sort.concat(obj)
  }

  return sort
}

const buildAggregations = () => {
  const aggs = {}

  aggs.minPrice = {
    min: {
      field: FIELDS.VARIANT.PRICE,
    },
  }

  aggs.maxPrice = {
    max: {
      field: FIELDS.VARIANT.PRICE,
    },
  }

  return aggs
}

/**
 * Performs a search by building up a search function and executing it against
 * ElasticSearch.
 *
 * @param {object} searchParams
 */
const search = async ({ after = 0, first = 10, filter, orderBy }) => {
  const search = {
    index: CATALOGUE_INDEX,
    body: { from: after, size: first },
  }

  if (filter) {
    search.body.query = buildQuery(filter)
  }
  if (orderBy) {
    search.body.sort = buildSort(orderBy)
  }
  search.body.aggs = buildAggregations()

  const client = createClient()
  const { body } = await client.search(search)

  const { aggregations, hits } = body
  const { minPrice, maxPrice } = aggregations
  const productVariantsConnection = {
    aggregations: hits.hits.length
      ? {
          priceRange: {
            min: minPrice.value,
            max: maxPrice.value,
          },
        }
      : null,
    productVariants: hits.hits.map(({ _source: result }) => result),
    totalCount: hits.hits.length,
  }
  return productVariantsConnection
}

module.exports = { search }

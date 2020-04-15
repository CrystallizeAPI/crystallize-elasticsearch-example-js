const { request } = require('graphql-request')
const { chunk } = require('lodash')
const { performance } = require('perf_hooks')
const { createClient, CATALOGUE_INDEX } = require('./index')

const catalogueQuery = `
  query($language: String!) {
    catalogue(path: "/", language: $language) {
      children {
        ...item
        ...product
        children {
          ...item
          ...product
          children {
            ...item
            ...product
            children {
              ...item
              ...product
              children {
                ...item
                ...product
              }
            }
          }
        }
      }
    }
  }

  fragment item on Item {
    id
    name
    path
    type
    topics {
      id
      name
      parentId
    }
  }

  fragment product on Product {
    variants {
      id
      name
      sku
      price
      stock
      isDefault
      attributes {
        attribute
        value
      }
      images {
        key
        url
        variants {
          key
          url
          width
        }
      }
    }
  }
`

/**
 * Crystallize creates a bunch of different image variations on upload. To
 * improve performance we are just indexing a couple that could be used as
 * thumbnails in search results.
 *
 * @param {object} image
 */
const getImageVariants = (image) => {
  if (!image.variants) return null
  return image.variants.filter(
    (variant) => variant.width === 200 || variant.width === 500
  )
}

/**
 * Multiple images may be uploaded per variant product. In this example we are
 * removing all but the first image from elasticsearch in order to improve
 * performance in the transfer time of search results. This is because each
 * image has a collection of variations with different URLs, qualities, and
 * sizes that can greatly increase the size of a document.
 *
 * @param {object} variant
 */
const getImages = (variant) => {
  if (!variant.images || !variant.images.length) {
    return null
  }

  const variants = getImageVariants(variant.images[0])
  return [{ ...variant.images[0], variants }]
}

const normaliseChildren = (children) => {
  let items = []

  children.forEach((item) => {
    if (item.children) {
      items = items.concat(normaliseChildren(item.children))
    }

    // Don't nest all of the children into a single document.
    delete item.children

    // If the item is a product then we need to massage the data to reduce the
    // document size and remove unnecessary images and their variations from
    // being indexed.
    if (item.type === 'product') {
      const variants = item.variants.map((variant) => {
        const images = getImages(variant)
        return { variant: { ...variant, images }, product: item }
      })
      items = items.concat(variants)
    }
  })

  return items
}

const bulkIndex = async ({ tenant, language = 'en' }) => {
  const t0 = performance.now()
  const data = await request(
    `https://api.crystallize.com/${tenant}/catalogue`,
    catalogueQuery,
    {
      language,
    }
  )

  const dataset = normaliseChildren(data.catalogue.children)
  const body = dataset.flatMap((doc) => [
    { index: { _index: CATALOGUE_INDEX } },
    doc,
  ])
  const batches = chunk(body, 100)

  const client = createClient()

  // Recreate the index
  const { body: exists } = await client.indices.exists({
    index: CATALOGUE_INDEX,
  })
  if (exists) {
    await client.indices.delete({ index: CATALOGUE_INDEX })
  }
  await client.indices.create({ index: CATALOGUE_INDEX })

  for (const batch of batches) {
    const { body: bulkResponse } = await client.bulk({
      refresh: true,
      body: batch,
    })

    // https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/bulk_examples.html
    if (bulkResponse.errors) {
      const erroredDocuments = []
      // The items array has the same order of the dataset we just indexed.
      // The presence of the `error` key indicates that the operation
      // that we did for the document has failed.
      bulkResponse.items.forEach((action, i) => {
        const operation = Object.keys(action)[0]
        if (action[operation].error) {
          erroredDocuments.push({
            // If the status is 429 it means that you can retry the document,
            // otherwise it's very likely a mapping error, and you should
            // fix the document before to try it again.
            status: action[operation].status,
            error: action[operation].error,
            operation: body[i * 2],
            document: body[i * 2 + 1],
          })
        }
      })
      console.log(erroredDocuments)
      return {
        success: false,
        totalCount: 0,
        executionTime: Math.ceil(performance.now() - t0),
        message: `Encountered ${erroredDocuments.length} error(s). Check console for details.`,
      }
    }
  }

  const t1 = performance.now()
  const executionTime = Math.ceil(t1 - t0)

  const { body: result } = await client.count({ index: CATALOGUE_INDEX })
  console.log(result)

  return {
    success: true,
    totalCount: result.count,
    executionTime,
    message: `Successfully indexed ${result.count} items`,
  }
}

module.exports = { bulkIndex }

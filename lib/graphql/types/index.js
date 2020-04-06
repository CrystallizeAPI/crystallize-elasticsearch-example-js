const { gql } = require('apollo-server-express')

const typeDefs = gql`
  enum OrderDirection {
    ASC
    DESC
  }

  enum OrderField {
    PRODUCT_NAME
    PRICE
    STOCK
  }

  input OrderBy {
    field: OrderField!
    direction: OrderDirection!
  }

  input PriceRangeFilter {
    min: Float
    max: Float
  }

  input ProductFilterFields {
    productIds: [String!]
    variantIds: [String!]
    paths: [String!]
    skus: [String!]
    topicNames: [String!]
  }

  input ProductVariantsFilter {
    searchTerm: String
    isDefault: Boolean
    priceRange: PriceRangeFilter
    attributes: [VariantAttributeFilter!]
    include: ProductFilterFields
    exclude: ProductFilterFields
  }

  input VariantAttributeFilter {
    attribute: String!
    values: [String!]!
  }

  type Image {
    key: String!
    url: String!
    variants: [ImageVariant!]
  }

  type ImageVariant {
    key: String!
    url: String!
    width: Int!
  }

  type PriceRange {
    min: Float!
    max: Float!
  }

  type Product {
    id: ID!
    name: String!
    path: String!
    topics: [Topic!]
    variants: [ProductVariant!]
  }

  type ProductVariant {
    id: ID!
    name: String!
    sku: String!
    price: Float
    stock: Int
    isDefault: Boolean!
    images: [Image!]
    attributes: [VariantAttribute!]!
  }

  type ProductVariantsAggregation {
    priceRange: PriceRange!
  }

  type ProductVariantsConnection {
    aggregations: ProductVariantsAggregation
    productVariants: [ProductVariantsResult!]!
    totalCount: Int!
  }

  type ProductVariantsResult {
    product: Product!
    variant: ProductVariant!
  }

  type Topic {
    id: String!
    name: String!
  }

  type VariantAttribute {
    attribute: String!
    value: String!
  }

  type Query {
    productVariants(
      after: Int
      first: Int
      orderBy: OrderBy
      filter: ProductVariantsFilter
    ): ProductVariantsConnection!
  }
`

module.exports = { typeDefs }

# crystallize-elastic-js

> An example service for integrating ElasticSearch with Crystallize.

## Getting Started

### Creating an ElasticSearch Instance

#### Locally

For local development you can set up an ElasticSearch cluster easily via
docker-compose.

```sh
docker-compose up -d
```

This will provide you with an ElasticSearch node available at
`http://localhost:9200`.

Create a file named `.env` in the root of this project and place the following
variable in order to use your local cluster for indexing and searching.

```
ES_NODE=http://localhost:9200
```

#### Elastic Cloud

You can also create a deployment on [Elastic Cloud](https://www.elastic.co). If
you are using Elastic Cloud, create a new deployment and add the node, username,
and password to your `.env` file in the root of this project in order to use it
for indexing and searching. The username and password are generated after your
service has been deployed.

```
ES_NODE=<your-elastic-deployment-url>
ES_USER=<your-elastic-deployment-user>
ES_PASS=<your-elastic-deployment-pass>
```

### Running the Server

Being an example, this project exposes both queries for searching as well as
mutations for indexing a tenant via GraphQL. You may wish to remove mutations
from a publicly exposed endpoint.

You can run the server with either `yarn start` for production, or `yarn dev`
for local development.

This will provide you with a playground available at
`http://localhost:4000/graphql`.

#### Indexing Your Tenant

You can index your tenant's catalogue by running the `bulkIndex` mutation via
GraphQL. As an example you can try indexing the `teddy-bear-shop`, or
alternatively your own tenant.

```graphql
mutation {
  bulkIndex(tenant: "teddy-bear-shop", language: "en") {
    success
    message
    executionTime
  }
}
```

#### Searching Your Catalogue

You can search your catalogue using the `productVariants` query. You can view
the full schema via the GraphQL playground with all the fields you can query,
search and filter. For example:

```graphql
query {
  productVariants(
    after: 10
    first: 5
    orderBy: { field: PRICE, direction: DESC }
    filter: { searchTerm: "kiwi" }
  ) {
    totalCount
    productVariants {
      variant {
        name
        price
      }
      product {
        name
        path
      }
    }
  }
}
```

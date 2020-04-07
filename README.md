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

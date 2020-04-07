const { Client } = require('@elastic/elasticsearch')
const { elastic } = require('../../config')

const CATALOGUE_INDEX = 'catalogue'

const createClient = () => {
  return new Client({
    node: elastic.node,
    auth: {
      username: elastic.user,
      password: elastic.pass,
    },
  })
}

module.exports = {
  CATALOGUE_INDEX,
  createClient,
}

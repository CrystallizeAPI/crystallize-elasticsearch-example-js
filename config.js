const config = require('dotenv').config
const { ES_NODE, ES_USER, ES_PASS } = config

module.exports = {
  elastic: {
    node: ES_NODE || 'http://localhost:9200',
    user: ES_USER,
    pass: ES_PASS,
  },
}

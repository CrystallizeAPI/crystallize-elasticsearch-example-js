const { search } = require('../../elastic/search')

const resolvers = {
  Query: {
    productVariants(_parent, args, _context, _info) {
      return search(args)
    },
  },
}

module.exports = { resolvers }

const { search } = require('../../elastic/search')
const { bulkIndex } = require('../../elastic/bulk-index')

const resolvers = {
  Query: {
    productVariants(_parent, args, _context, _info) {
      return search(args)
    },
  },

  Mutation: {
    bulkIndex: async (_, { tenant, language }) => {
      const result = await bulkIndex({ tenant, language })
      return {
        success: true,
        message: 'Successfully indexed',
        executionTime: 1,
        totalCount: 100,
      }
    },
  },
}

module.exports = { resolvers }

import type { IOContext } from '@vtex/api'
import { Segment } from '@vtex/api'

import Service from '../index'
import { Search } from '../clients/search'

type GraphQLResolver = {
  resolvers: any
}

const vtexContext = () => {
  const { resolvers } = Service.config.graphql as GraphQLResolver
  const { Query } = resolvers
  const context = {} as IOContext
  const clients = {
    search: new Search(context),
    segment: new Segment(context),
  }

  const vtex = {} as IOContext

  return {
    context,
    clients,
    Query,
    resolvers,
    Service,
    vtex,
  }
}

export default vtexContext

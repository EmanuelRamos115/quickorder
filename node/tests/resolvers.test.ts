import vtexContext from './vtexContext'

describe('Graphql resolvers', () => {
  const { Query, clients } = vtexContext()

  it('[GraphQL] skuFromRefIds', async () => {
    const data = await Query.skuFromRefIds(
      {},
      {
        refids: true,
        orderFormId: '',
        refIdSellerMap: {},
      },
      {
        clients,
      }
    )

    expect(data).toBeDefined()
  })

  it('[GraphQL] sellers', async () => {
    const data = await Query.sellers(
      {},
      {
        refids: true,
        orderFormId: '',
        refIdSellerMap: {},
      },
      {
        clients,
      }
    )

    expect(data).toBeDefined()
  })
})

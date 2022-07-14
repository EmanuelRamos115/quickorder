import type { InstanceOptions, IOContext } from '@vtex/api'
import { JanusClient } from '@vtex/api'

interface RefIdArgs {
  refids: any
  orderFormId: string
  refIdSellerMap: RefIdSellerMap
  salesChannel: string
}
interface Items {
  id: string
  quantity: number
  seller: string
}

interface RefIdSellerMap {
  [key: string]: [string]
}

interface SimulateArgs {
  refids: [Items]
  orderForm: any
  refIdSellerMap: RefIdSellerMap
  salesChannel: string
}

export class Search extends JanusClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(context, {
      ...options,
      headers: {
        ...options?.headers,
        VtexIdClientAutCookie: context.authToken,
      },
      timeout: 5000,
    })
  }

  private sellersList: any[] | undefined

  private getNameFromId = (id: string) => {
    return this.sellersList?.find((seller: any) => {
      return seller.id === id
    }).name
  }

  public skuFromRefIds = async ({
    refids,
    orderFormId,
    refIdSellerMap,
    salesChannel,
  }: RefIdArgs): Promise<any> => {
    this.sellersList = await this.sellers()

    const url = `/api/catalog_system/pub/sku/stockkeepingunitidsbyrefids`

    const res: any = await this.http.postRaw(url, refids, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${this.context.authToken}`,
      },
    })

    let result: any = []

    const resultStr: any = {}

    if (res.status === 200) {
      const orderForm = await this.getOrderForm(orderFormId)
      const sc = salesChannel ?? orderForm.salesChannel

      // filter out sellers that aren't available in current sales channel
      this.sellersList = this.sellersList?.filter(seller => {
        return seller.availableSalesChannels.includes(Number(sc))
      })

      const refs = Object.getOwnPropertyNames(res.data)

      refs.forEach(id => {
        resultStr[id] = {
          sku: res.data[id],
          refid: id,
          sellers: this.sellersList,
        }
        result.push(resultStr[id])
      })

      if (this.sellersList?.length) {
        const promises = result.map(async (o: any) =>
          this.sellerBySku(o.sku, o.refid)
        )

        result = await Promise.all(promises)
      }

      // update refIdSellerMap to include list of sellers by SKU
      result.forEach((item: any) => {
        refIdSellerMap[item.refid] = item.sellers
          ? item.sellers.map((seller: any) => seller.id)
          : null
      })

      const { items }: any = await this.simulate({
        refids: result,
        orderForm,
        refIdSellerMap,
        salesChannel: sc,
      })

      if (!items.length) return items

      const resItems = items.reduce((acc: any, item: any) => {
        const sellerInfo = {
          seller: item.seller,
          availability: item.availability ?? '',
          unitMultiplier: item.unitMultiplier ?? 1,
        }

        return {
          ...acc,
          [item.id]: {
            sellers: acc[item.id]?.sellers?.length
              ? acc[item.id].sellers.concat(sellerInfo)
              : [sellerInfo],
          },
        }
      }, {})

      result = result.map((item: any) => {
        return {
          ...item,
          sellers: item.sellers
            ? item.sellers.map((seller: any) => {
                if (!resItems[item.sku]) {
                  return null
                }

                const currSeller = resItems[item.sku].sellers.filter(
                  (s: any) => s.seller === seller.id
                )

                return {
                  ...seller,
                  availability: currSeller.length
                    ? currSeller[0].availability
                    : '',
                  unitMultiplier: currSeller.length
                    ? currSeller[0].unitMultiplier
                    : 1,
                }
              })
            : null,
        }
      })
    }

    return result
  }

  private getOrderForm = async (orderFormId: string) => {
    return this.http.get(`/api/checkout/pub/orderForm/${orderFormId}`, {
      headers: {
        'Content-Type': 'application/json',
        VtexIdclientAutCookie: `${this.context.authToken}`,
      },
    })
  }

  private simulate = async ({
    refids,
    orderForm,
    refIdSellerMap,
    salesChannel,
  }: SimulateArgs) => {
    const {
      salesChannel: orderFormSC,
      storePreferencesData: { countryCode },
      shippingData,
    } = orderForm

    const simulateItems: any = []

    refids
      .filter((item: any) => {
        return !!item.sku
      })
      .forEach((item: any) => {
        refIdSellerMap[item.refid].forEach(sellerId => {
          simulateItems.push({
            id: item.sku,
            quantity: 1,
            seller: sellerId,
          })
        })
      })

    return this.http.post(
      `/api/checkout/pub/orderForms/simulation?sc=${
        salesChannel ?? orderFormSC
      }`,
      {
        items: simulateItems,
        country: countryCode,
        postalCode: shippingData?.address?.postalCode ?? '',
      }
    )
  }

  private sellerBySku = async (skuId: string, refid: string) => {
    if (skuId === null) {
      return {
        sku: null,
        refid,
        sellers: null,
      }
    }

    const url = `/api/catalog_system/pvt/sku/stockkeepingunitbyid/${skuId}`
    const res = await this.http.getRaw(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${this.context.authToken}`,
      },
    })

    const sellersIds = new Set(this.sellersList?.map(seller => seller.id))

    return res.data?.SkuSellers
      ? {
          sku: skuId,
          refid,
          sellers: res.data.SkuSellers.filter((item: any) => {
            // check if SKU seller is available in sellers list
            const inSellersList = sellersIds.has(item.SellerId)

            return item.IsActive === true && inSellersList
          }).map(({ SellerId }: any) => {
            return {
              id: SellerId,
              name: this.getNameFromId(SellerId),
            }
          }),
        }
      : []
  }

  public sellers = async (): Promise<any> => {
    const url = `/api/seller-register/pvt/sellers`

    const res = await this.http.getRaw(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${this.context.authToken}`,
      },
    })

    let result: any = []

    if (res.status === 200) {
      result = res.data.items
        .filter((item: any) => {
          return item.isActive === true
        })
        .map(({ id, name, availableSalesChannels }: any) => {
          const availableSalesChannelsIds = availableSalesChannels.map(
            (sc: { id: number }) => {
              return sc.id
            }
          )

          return {
            id,
            name,
            availableSalesChannels: availableSalesChannelsIds,
          }
        })
    }

    return result
  }
}

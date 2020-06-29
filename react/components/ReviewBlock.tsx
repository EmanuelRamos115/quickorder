/* eslint-disable vtex/prefer-early-return */
/* eslint-disable no-console */
import React, { useState, useEffect } from 'react'
import {
  Table,
  Input,
  ButtonWithIcon,
  IconDelete,
  Dropdown,
} from 'vtex.styleguide'
import { WrappedComponentProps, injectIntl, defineMessages } from 'react-intl'
import PropTypes from 'prop-types'
import { ParseText, GetText } from '../utils'
import { useApolloClient } from 'react-apollo'
import getRefIdTranslation from '../queries/refids.gql'

const remove = <IconDelete />
const messages = defineMessages({
  valid: {
    id: 'store/quickorder.valid',
  },
  invalidPattern: {
    id: 'store/quickorder.invalidPattern',
  },
  skuNotFound: {
    id: 'store/quickorder.skuNotFound',
  },
})

const ReviewBlock: StorefrontFunctionComponent<WrappedComponentProps & any> = ({
  onReviewItems,
  reviewedItems,
  onRefidLoading,
  intl,
}: any) => {
  const client = useApolloClient()

  const [state, setReviewState] = useState<any>({
    reviewItems:
      reviewedItems.map((item: any, index: number) => {
        return {
          ...item,
          index,
        }
      }) || [],
  })
  const { reviewItems } = state

  const errorMessage = {
    'store/quickorder.valid': messages.valid,
    'store/quickorder.invalidPattern': messages.invalidPattern,
    'store/quickorder.skuNotFound': messages.skuNotFound,
  }

  const validateRefids = (refidData: any, reviewed: any) => {
    let error = false
    if (refidData) {
      const refIdNotFound =
        !!refidData && !!refidData.skuFromRefIds.items
          ? refidData.skuFromRefIds.items.filter((item: any) => {
              return item.sku === null
            })
          : []

      const refIdFound =
        !!refidData && !!refidData.skuFromRefIds.items
          ? refidData.skuFromRefIds.items.filter((item: any) => {
              return item.sku !== null
            })
          : []

      const vtexSku = (item: any) => {
        let ret: any = null
        if (!!refidData && !!refidData.skuFromRefIds.items) {
          ret = refidData.skuFromRefIds.items.find((curr: any) => {
            return !!item.sku && item.sku === curr.refid
          })
          if (!!ret && !!ret.sku) {
            ret = ret.sku
          }
        }
        return ret
      }
      const getSellers = (item: any) => {
        let ret: any = []
        if (!!refidData && !!refidData.skuFromRefIds.items) {
          ret = refidData.skuFromRefIds.items.find((curr: any) => {
            return !!item.sku && item.sku === curr.refid
          })
          if (!!ret && !!ret.sellers) {
            ret = ret.sellers
          }
        }
        return ret
      }

      const errorMsg = (item: any) => {
        let ret = null
        const notfound = refIdNotFound.find((curr: any) => {
          return curr.refid === item.sku && curr.sku === null
        })
        const found = refIdFound.find((curr: any) => {
          return curr.refid === item.sku && curr.sku !== null
        })
        ret = notfound
          ? 'store/quickorder.skuNotFound'
          : found
          ? null
          : item.error
        return ret
      }

      if (refIdNotFound.length) {
        error = true
      }

      const items = reviewed.map((item: any) => {
        const sellers = getSellers(item)
        return {
          ...item,
          sellers: getSellers(item),
          seller: sellers.length ? sellers[0].id : '1',
          vtexSku: vtexSku(item),
          error: errorMsg(item),
        }
      })

      const merge = (original: any) => {
        const item = items.find((curr: any) => {
          return original.sku === curr.sku
        })
        return item || original
      }

      const updated = reviewItems.map((item: any) => {
        return merge(item)
      })

      onReviewItems(updated)
      setReviewState({
        ...state,
        reviewItems: updated,
        hasError: error,
      })
    }
  }

  const getRefIds = async (refids: any, reviewed: any) => {
    onRefidLoading(true)
    const query = {
      query: getRefIdTranslation,
      variables: { refids },
    }

    const { data } = await client.query(query)

    validateRefids(data, reviewed)
    onRefidLoading(false)
  }

  const convertRefIds = (items: any) => {
    const refids = items
      .filter((item: any) => {
        return item.error === null
      })
      .map((item: any) => {
        return item.sku
      })
    getRefIds(refids, items)
  }

  const checkValidatedItems = () => {
    const items: [any] = reviewItems.filter((item: any) => {
      return item.sku !== null && item.error === null && !item.vtexSku
    })
    if (items.length) {
      convertRefIds(items)
    }
  }

  useEffect(() => {
    checkValidatedItems()
  })

  const removeLine = (i: number) => {
    const items: [any] = reviewItems
      .filter((item: any) => {
        return item.index !== i
      })
      .map((item: any, index: number) => {
        return {
          ...item,
          line: index,
          index,
        }
      })
    onReviewItems(items)
    setReviewState({
      ...state,
      reviewItems: items,
    })
  }

  const updateLineContent = (index: number, content: string) => {
    const items = reviewItems.map((item: any) => {
      return item.index === index
        ? {
            ...item,
            content,
          }
        : item
    })
    setReviewState({
      ...state,
      reviewItems: items,
    })
  }

  const updateLineSeller = (index: number, seller: string) => {
    const items = reviewItems.map((item: any) => {
      return item.index === index
        ? {
            ...item,
            seller,
          }
        : item
    })
    setReviewState({
      ...state,
      reviewItems: items,
    })
  }

  const onBlurField = (line: number) => {
    const joinLines = GetText(reviewItems)
    const reviewd: any = ParseText(joinLines)
    if (reviewd[line].error === null) {
      setReviewState({
        ...state,
        reviewItems: reviewd,
      })
    }
  }

  const tableSchema = {
    properties: {
      line: {
        type: 'object',
        title: intl.formatMessage({
          id: 'store/quickorder.review.label.lineNumber',
        }),
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ rowData }: any) => {
          return <div>{parseInt(rowData.line, 10) + 1}</div>
        },
      },
      content: {
        type: 'object',
        title: intl.formatMessage({
          id: 'store/quickorder.review.label.content',
        }),
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ cellData, rowData }: any) => {
          if (rowData.error) {
            return (
              <div>
                <Input
                  value={cellData}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    updateLineContent(rowData.index, e.target.value)
                  }}
                  onBlur={() => {
                    onBlurField(rowData.line)
                  }}
                />
              </div>
            )
          }
          return <span>{cellData}</span>
        },
      },
      sku: {
        type: 'string',
        title: intl.formatMessage({ id: 'store/quickorder.review.label.sku' }),
      },
      quantity: {
        type: 'string',
        title: intl.formatMessage({
          id: 'store/quickorder.review.label.quantity',
        }),
      },
      seller: {
        type: 'string',
        title: intl.formatMessage({
          id: 'store/quickorder.review.label.seller',
        }),
        cellRenderer: ({ rowData }: any) => {
          if (rowData?.sellers?.length > 1) {
            return (
              <div className="mb5">
                <Dropdown
                  label="Regular"
                  options={rowData.sellers.map((item: any) => {
                    return {
                      label: item.name,
                      value: item.id,
                    }
                  })}
                  value={rowData.seller}
                  onChange={(_: any, v: any) =>
                    updateLineSeller(rowData.index, v)
                  }
                />
              </div>
            )
          }
          return rowData.sellers && rowData.sellers.length
            ? rowData.sellers[0].name
            : ''
        },
      },
      error: {
        type: 'string',
        title: intl.formatMessage({
          id: 'store/quickorder.review.label.status',
        }),
        cellRenderer: ({ cellData, rowData }: any) => {
          if (rowData.error) {
            const text = intl.formatMessage(
              errorMessage[cellData || 'store/quickorder.valid']
            )
            return (
              <span
                className={`pa3 br2 bg-danger--faded hover-bg-danger-faded active-bg-danger-faded c-danger hover-c-danger active-c-danger dib mr5 mv0 ba b--danger hover-b-danger active-b-danger`}
              >
                {text}
              </span>
            )
          }
          return intl.formatMessage({ id: 'store/quickorder.valid' })
        },
      },
      delete: {
        type: 'object',
        title: ' ',
        // eslint-disable-next-line react/display-name
        cellRenderer: ({ rowData }: any) => {
          return (
            <div>
              <ButtonWithIcon
                icon={remove}
                variation="tertiary"
                onClick={() => {
                  removeLine(rowData.index)
                }}
              />
            </div>
          )
        },
      },
    },
  }

  return (
    <div>
      <Table schema={tableSchema} items={reviewItems} fullWidth />
    </div>
  )
}
ReviewBlock.propTypes = {
  onReviewItems: PropTypes.func,
  reviewItems: PropTypes.array,
  onRefidLoading: PropTypes.func,
}

export default injectIntl(ReviewBlock)

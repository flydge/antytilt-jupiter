import { binanceMarketAdapter } from './binanceAdapter'
import { bingxMarketAdapter } from './bingxAdapter'
import { bybitMarketAdapter } from './bybitAdapter'
import { okxMarketAdapter } from './okxAdapter'
import type { MarketDataAdapter, MarketDataExchange } from './types'

const adapters: Record<MarketDataExchange, MarketDataAdapter> = {
  binance: binanceMarketAdapter,
  bingx: bingxMarketAdapter,
  bybit: bybitMarketAdapter,
  okx: okxMarketAdapter,
}

export function getMarketDataAdapter(exchange: MarketDataExchange) {
  return adapters[exchange]
}

export { MARKET_DATA_LABELS } from './types'
export type { MarketDataExchange } from './types'

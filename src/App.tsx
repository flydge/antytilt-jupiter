import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Crosshair,
  FlaskConical,
  Gauge,
  Globe2,
  Info,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  RefreshCw,
  WalletCards,
  X,
} from 'lucide-react'
import { PriceChart } from './components/PriceChart'
import { AuthScreen } from './components/AuthScreen'
import { ExchangeConnectionModal } from './components/ExchangeConnectionModal'
import { OrderEntryPanel } from './components/OrderEntryPanel'
import { MarketPulseIntro } from './components/MarketPulseIntro'
import { useExchangeAccount } from './hooks/useExchangeAccount'
import { useAuth } from './hooks/useAuth'
import { useMarketCatalog } from './hooks/useMarketCatalog'
import { useMarketData } from './hooks/useMarketData'
import { MARKET_DATA_LABELS, type MarketDataExchange } from './marketData'
import { selectSettlementBalance, settlementAsset } from './exchangeBalance'
import type {
  AccountHistory,
  AuthUser,
  BookLevel,
  DemoOrder,
  ExchangeBalance,
  ExchangeContract,
  ExchangeOrder,
  ExchangePosition,
  ExchangeSessionState,
  MarketInstrument,
  MarketTrade,
  OrderProtectionDraft,
  Ticker,
} from './types'

const RiskManagementPage = lazy(() => import('./components/RiskManagementPage').then((module) => ({ default: module.RiskManagementPage })))

const formatPrice = (value: number) => {
  if (!Number.isFinite(value)) return '--'
  const absolute = Math.abs(value)
  const maximumFractionDigits = absolute >= 1_000 ? 2 : absolute >= 1 ? 4 : absolute >= 0.01 ? 6 : 8
  const minimumFractionDigits = absolute >= 1 ? 2 : maximumFractionDigits
  return value.toLocaleString('en-US', { minimumFractionDigits, maximumFractionDigits })
}

type PriceDirection = 'up' | 'down' | 'flat'

function usePriceDirection(price: number, identity: string): PriceDirection {
  const previous = useRef({ identity, price })
  const [direction, setDirection] = useState<PriceDirection>('flat')
  useEffect(() => {
    if (previous.current.identity !== identity) {
      previous.current = { identity, price }
      setDirection('flat')
      return
    }
    if (price > previous.current.price) setDirection('up')
    else if (price < previous.current.price) setDirection('down')
    previous.current = { identity, price }
  }, [identity, price])
  return direction
}

const formatQuantity = (value: number) => value >= 1_000
  ? Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)
  : value.toLocaleString('en-US', { maximumFractionDigits: value >= 1 ? 3 : 6 })

const compact = (value: number) =>
  Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

const formatCountdown = (timestamp: number) => {
  if (!timestamp) return '--:--:--'
  const seconds = Math.max(0, Math.floor((timestamp - Date.now()) / 1_000))
  const hours = Math.floor(seconds / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)
  const remainder = seconds % 60
  return [hours, minutes, remainder].map((part) => part.toString().padStart(2, '0')).join(':')
}

const coinGlyph = (symbol: string) => ({ BTC: '₿', ETH: 'Ξ', DOGE: 'Ð', XRP: 'X' })[symbol] ?? symbol.slice(0, 1)

const coinColor = (symbol: string) => {
  const colors = ['#f7941a', '#627eea', '#8f6cff', '#20bca4', '#e0527d', '#4b8df8', '#e7ba45', '#7b8798']
  const hash = [...symbol].reduce((sum, character) => sum + character.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function CoinLogo({ market, className }: { market: MarketInstrument; className: string }) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => setImageFailed(false), [market.logoUrl])

  return (
    <span
      className={`${className}${imageFailed ? ' coin-image-fallback' : ''}`}
      style={imageFailed ? { background: coinColor(market.baseAsset) } : undefined}
      aria-hidden="true"
    >
      {!imageFailed && (
        <img
          src={market.logoUrl}
          alt=""
          width="32"
          height="32"
          loading={className === 'market-coin' ? 'lazy' : 'eager'}
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      )}
      {imageFailed && coinGlyph(market.baseAsset)}
    </span>
  )
}

function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <span />
        <span />
      </span>
      <span className="brand-name">ANTY<span>TILT</span></span>
    </div>
  )
}

type AppSection = 'trade' | 'risk'
type Theme = 'dark' | 'light'

function Header({ connection, marketSource, exchange, user, activeSection, theme, onNavigate, onSearch, onConnect, onLogout, onToggleTheme }: {
  connection: 'connecting' | 'live' | 'demo'
  marketSource: string
  exchange: ExchangeSessionState
  user: AuthUser
  activeSection: AppSection
  theme: Theme
  onNavigate: (section: AppSection) => void
  onSearch: () => void
  onConnect: () => void
  onLogout: () => void
  onToggleTheme: () => void
}) {
  const isLiveTradingAccount = exchange.connected && exchange.environment === 'prod-live'
  const tradingAccountLabel = exchange.connected
    ? `${MARKET_DATA_LABELS[exchange.exchange ?? 'bingx']} ${isLiveTradingAccount ? 'Live' : 'VST'}`
    : 'Connect exchange'
  return (
    <header className="app-header">
      <div className="header-left">
        <Logo />
        <nav className="main-nav">
          <button>Markets</button>
          <button className={activeSection === 'trade' ? 'active' : ''} onClick={() => onNavigate('trade')}>Trade</button>
          <button className={`rm-nav ${activeSection === 'risk' ? 'active' : ''}`} onClick={() => onNavigate('risk')}><ShieldCheck size={14} /> Risk Management</button>
        </nav>
      </div>
      <div className="header-actions">
        <div
          className={`connection-pill ${connection}`}
          aria-label={connection === 'live' ? `Market data: ${marketSource} Live` : connection === 'connecting' ? `Market data: Connecting ${marketSource}` : `Market data: ${marketSource} fallback`}
          title="Public market-data connection used by the chart and order book"
        >
          <span />
          <span className="connection-copy">
            <small>Market data:{' '}</small>
            <strong>{connection === 'live' ? `${marketSource} Live` : connection === 'connecting' ? `Connecting ${marketSource}` : `${marketSource} fallback`}</strong>
          </span>
        </div>
        <button
          className={`connect-button ${exchange.connected ? `connected ${isLiveTradingAccount ? 'live-account' : 'vst-account'}` : ''}`}
          onClick={onConnect}
          aria-label={exchange.connected ? `Trading account: ${tradingAccountLabel}` : tradingAccountLabel}
          title={exchange.connected ? `Order execution uses ${tradingAccountLabel}` : 'Connect a trading account'}
        >
          {isLiveTradingAccount ? <LockKeyhole size={14} /> : exchange.connected ? <FlaskConical size={14} /> : <LockKeyhole size={14} />}
          {exchange.connected && <span className="connect-prefix">Trading account:{' '}</span>}
          <strong>{tradingAccountLabel}</strong>
        </button>
        <button className="header-icon theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button className="header-icon" onClick={onSearch} aria-label="Open market search"><Search size={17} /></button>
        <button className="header-icon has-dot"><Bell size={17} /></button>
        <button className="header-icon"><Settings size={17} /></button>
        <span className="header-user" title={user.email}>{user.email}</span>
        <button className="header-icon" onClick={onLogout} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
        <button className="header-icon mobile-only"><Menu size={18} /></button>
      </div>
    </header>
  )
}

type CatalogStatus = ReturnType<typeof useMarketCatalog>['status']

type MarketSelectorProps = {
  open: boolean
  markets: MarketInstrument[]
  selectedSymbol: string
  status: CatalogStatus
  executionExchange?: 'BingX'
  onClose: () => void
  onSelect: (market: MarketInstrument) => void
}

function MarketSelector({ open, markets, selectedSymbol, status, executionExchange, onClose, onSelect }: MarketSelectorProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const filteredMarkets = useMemo(() => {
    const normalized = query.trim().toUpperCase()
    if (!normalized) return markets
    return markets.filter((market) => (
      market.symbol.includes(normalized)
      || market.baseAsset.includes(normalized)
      || market.name.toUpperCase().includes(normalized)
    ))
  }, [markets, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    window.setTimeout(() => inputRef.current?.focus(), 0)
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  if (!open) return null

  return (
    <>
      <button className="market-selector-scrim" onClick={onClose} aria-label="Close market catalog" tabIndex={-1} />
      <section className="market-selector" aria-label="Market catalog">
        <div className="market-selector-head">
          <div>
            <strong>Select market</strong>
            <span>{markets.length} assets · {executionExchange ? `available on ${executionExchange}` : 'Binance Futures + Bybit'}</span>
          </div>
          <button onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>
        <label className="market-search">
          <Search size={14} />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or symbol" />
          <kbd>/</kbd>
        </label>
        <div className="market-filter-row">
          <button className="active">Top 30</button>
          <span className={`catalog-source ${status}`}><i />{status === 'live' ? 'Live market-cap ranking' : status === 'loading' ? 'Updating catalog' : 'Verified fallback'}</span>
        </div>
        <div className="market-list-head"><span>Asset / rank</span><span>Exchange</span><span>Price / 24h</span></div>
        <div className="market-list">
          {filteredMarkets.map((market) => {
            const positive = market.priceChangePercent >= 0
            return (
              <button
                key={market.symbol}
                className={`market-row ${market.symbol === selectedSymbol ? 'selected' : ''}`}
                onClick={() => onSelect(market)}
              >
                <span className="market-identity">
                  <CoinLogo market={market} className="market-coin" />
                  <span><strong>{market.baseAsset}<small>/USDT</small></strong><small>#{market.marketCapRank} · {market.name}</small></span>
                </span>
                <span className="exchange-availability"><i>B</i><i>Y</i>{executionExchange && <i className="bingx">X</i>}</span>
                <span className="market-row-price"><strong>{formatPrice(market.lastPrice)}</strong><small className={positive ? 'up' : 'down'}>{positive ? '+' : ''}{market.priceChangePercent.toFixed(2)}%</small></span>
                {market.symbol === selectedSymbol && <span className="selected-check">✓</span>}
              </button>
            )
          })}
          {filteredMarkets.length === 0 && <div className="market-empty">No matching markets</div>}
        </div>
        <footer className="market-selector-footer">
          <span><ShieldCheck size={12} /> Active USDT Perpetual pairs {executionExchange ? `available for ${executionExchange} execution` : 'on both market-data exchanges'}</span>
          <a href="https://www.coingecko.com/" target="_blank" rel="noreferrer">Market cap by CoinGecko</a>
        </footer>
      </section>
    </>
  )
}

type InstrumentBarProps = {
  ticker: Ticker
  priceDirection: PriceDirection
  fundingRate: number
  nextFundingTime: number
  market: MarketInstrument
  markets: MarketInstrument[]
  selectorOpen: boolean
  catalogStatus: CatalogStatus
  marketSource: string
  marketDataExchange: MarketDataExchange
  executionExchange?: 'BingX'
  onOpenSelector: () => void
  onCloseSelector: () => void
  onSelectMarket: (market: MarketInstrument) => void
  onMarketDataExchange: (exchange: MarketDataExchange) => void
}

function InstrumentBar({ ticker, priceDirection, fundingRate, nextFundingTime, market, markets, selectorOpen, catalogStatus, marketSource, marketDataExchange, executionExchange, onOpenSelector, onCloseSelector, onSelectMarket, onMarketDataExchange }: InstrumentBarProps) {
  const changeTone = ticker.priceChangePercent > 0 ? 'up' : ticker.priceChangePercent < 0 ? 'down' : 'price-flat'
  return (
    <section className="instrument-bar">
      <div className="instrument-main">
        <button className="watch-star"><Star size={16} /></button>
        <CoinLogo market={market} className="coin-logo" />
        <div>
          <button className="instrument-name" onClick={onOpenSelector}>{market.symbol} <span>Perpetual</span> <ChevronDown size={14} /></button>
          <div className="instrument-meta">{market.name} · {marketSource} USDT Perpetual</div>
        </div>
        <MarketSelector
          open={selectorOpen}
          markets={markets}
          selectedSymbol={market.symbol}
          status={catalogStatus}
          executionExchange={executionExchange}
          onClose={onCloseSelector}
          onSelect={onSelectMarket}
        />
      </div>
      <div className="market-source-switch" aria-label="Chart exchange">
        <span>Chart</span>
        {(['binance', 'bingx', 'bybit'] as MarketDataExchange[]).map((source) => (
          <button type="button" key={source} className={marketDataExchange === source ? 'active' : ''} onClick={() => onMarketDataExchange(source)} title={`Use ${MARKET_DATA_LABELS[source]} market data`}>
            <i>{source === 'binance' ? 'B' : source === 'bingx' ? 'X' : 'Y'}</i>{MARKET_DATA_LABELS[source]}
          </button>
        ))}
      </div>
      <div className="instrument-price">
        <strong className={priceDirection === 'flat' ? 'price-flat' : priceDirection}>{formatPrice(ticker.lastPrice)}</strong>
        <span>${formatPrice(ticker.lastPrice)}</span>
      </div>
      <div className="market-stat">
        <span>24h Change</span>
        <strong className={changeTone}>{ticker.priceChangePercent > 0 ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%</strong>
      </div>
      <div className="market-stat">
        <span>24h High</span>
        <strong>{formatPrice(ticker.highPrice)}</strong>
      </div>
      <div className="market-stat">
        <span>24h Low</span>
        <strong>{formatPrice(ticker.lowPrice)}</strong>
      </div>
      <div className="market-stat optional-stat">
        <span>24h Volume ({market.baseAsset})</span>
        <strong>{compact(ticker.volume)}</strong>
      </div>
      <div className="market-stat optional-stat">
        <span>24h Turnover (USDT)</span>
        <strong>{compact(ticker.quoteVolume)}</strong>
      </div>
      <div className="market-stat optional-stat">
        <span>Funding / Countdown</span>
        <strong className="accent-text">{(fundingRate * 100).toFixed(4)}% <small>· {formatCountdown(nextFundingTime)}</small></strong>
      </div>
      <button className="instrument-more"><LayoutGrid size={15} /> Customize</button>
    </section>
  )
}

function BookRows({ rows, type, limit }: { rows: BookLevel[]; type: 'ask' | 'bid'; limit: number }) {
  const maxTotal = Math.max(...rows.map((row) => row.total), 1)
  const prepared = type === 'ask' ? [...rows].slice(0, limit).reverse() : rows.slice(0, limit)
  return (
    <div className={`book-side ${type}`}>
      {prepared.map((row) => (
        <div className="book-row" key={`${type}-${row.price}`}>
          <span className="book-depth" style={{ width: `${(row.total / maxTotal) * 100}%` }} />
          <span className="book-price">{formatPrice(row.price)}</span>
          <span>{formatQuantity(row.quantity)}</span>
          <span>{formatQuantity(row.total)}</span>
        </div>
      ))}
    </div>
  )
}

function OrderBook({ asks, bids, lastPrice, spread, baseAsset, priceDirection }: ReturnType<typeof useMarketData> & { lastPrice: number; baseAsset: string; priceDirection: PriceDirection }) {
  const panelRef = useRef<HTMLElement>(null)
  const [visibleLevels, setVisibleLevels] = useState(9)
  const precision = lastPrice >= 10_000 ? '0.1' : lastPrice >= 1_000 ? '0.01' : lastPrice >= 1 ? '0.001' : lastPrice >= 0.01 ? '0.0001' : '0.000001'

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const updateVisibleLevels = () => {
      const fixedContentHeight = 38 + 26 + 23 + 28
      const rowHeight = 16
      const availableRows = Math.floor(Math.max(0, panel.clientHeight - fixedContentHeight) / (rowHeight * 2))
      const next = Math.max(6, Math.min(20, availableRows))
      setVisibleLevels((current) => current === next ? current : next)
    }
    updateVisibleLevels()
    const observer = new ResizeObserver(updateVisibleLevels)
    observer.observe(panel)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={panelRef} className="orderbook-panel panel">
      <div className="panel-head compact-head">
        <div className="chart-tabs">
          <button className="panel-tab active">Order Book</button>
          <button className="panel-tab">Trades</button>
        </div>
        <span className="precision-button" title="Price step">
          {precision} <ChevronDown size={12} />
        </span>
      </div>
      <div className="book-toolbar">
        <div className="book-modes">
          <button className="book-mode both" aria-label="Combined order book"><i /><i /><i /></button>
          <button className="book-mode"><i /><i /><i /></button>
          <button className="book-mode"><i /><i /><i /></button>
        </div>
      </div>
      <div className="book-columns"><span>Price (USDT)</span><span>Size ({baseAsset})</span><span>Sum ({baseAsset})</span></div>
      <BookRows rows={asks} type="ask" limit={visibleLevels} />
      <div className="mid-price">
        <strong className={priceDirection === 'flat' ? 'price-flat' : priceDirection}>{formatPrice(lastPrice)}</strong>
        <span>{priceDirection === 'up' ? 'Last tick ↑' : priceDirection === 'down' ? 'Last tick ↓' : 'Last price'}</span>
        <small>Spread {formatPrice(spread)}</small>
      </div>
      <BookRows rows={bids} type="bid" limit={visibleLevels} />
    </section>
  )
}

function RecentTrades({ trades, fallbackPrice, baseAsset }: { trades: MarketTrade[]; fallbackPrice: number; baseAsset: string }) {
  const fallback = useMemo<MarketTrade[]>(
    () => Array.from({ length: 15 }, (_, index) => ({
      id: index,
      price: Math.max(0, fallbackPrice + (Math.random() - 0.5) * fallbackPrice * 0.0008),
      quantity: 0.002 + Math.random() * 0.7,
      time: Date.now() - index * 2100,
      side: index % 3 === 0 ? 'sell' : 'buy',
    })),
    [fallbackPrice],
  )
  const rows = trades.length ? trades : fallback
  return (
    <section className="trades-panel panel">
      <div className="panel-head compact-head">
        <div className="chart-tabs"><button className="panel-tab active">Recent Trades</button></div>
      </div>
      <div className="trade-columns"><span>Price (USDT)</span><span>Size ({baseAsset})</span><span>Time</span></div>
      <div className="trade-list">
        {rows.slice(0, 16).map((trade) => (
          <div className="trade-row" key={trade.id}>
            <span className={trade.side === 'buy' ? 'up' : 'down'}>{formatPrice(trade.price)}</span>
            <span>{formatQuantity(trade.quantity)}</span>
            <span>{new Date(trade.time).toLocaleTimeString('en-GB')}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

type BottomPanelProps = {
  demoOrders: DemoOrder[]
  exchangeOrders: ExchangeOrder[]
  contracts: ExchangeContract[]
  connected: boolean
  positions: ExchangePosition[]
  balances: ExchangeBalance[]
  history: AccountHistory
  historyLoading: boolean
  environment?: ExchangeSessionState['environment']
  liveTradingEnabled: boolean
  executing: boolean
  onRemoveDemo: (id: string) => void
  onCancelOrder: (orderId: string, input: { symbol: string; clientOrderId?: string; confirmation?: string }) => Promise<unknown>
  onAmendOrder: (orderId: string, input: { symbol: string; clientOrderId?: string; quantity: number; confirmation?: string }) => Promise<unknown>
  onClosePosition: (positionId: string, input: { quantity?: number; confirmation?: string }) => Promise<unknown>
  onRefreshHistory: () => Promise<unknown>
}

function PositionCloseDialog({ position, quantityPrecision, environment, liveTradingEnabled, executing, onCancel, onConfirm }: {
  position: ExchangePosition | null
  quantityPrecision: number
  environment?: ExchangeSessionState['environment']
  liveTradingEnabled: boolean
  executing: boolean
  onCancel: () => void
  onConfirm: BottomPanelProps['onClosePosition']
}) {
  const [quantity, setQuantity] = useState('')
  const [closePercentage, setClosePercentage] = useState(100)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!position) return
    setQuantity(String(Math.abs(Number(position.availableAmt || position.positionAmt))))
    setClosePercentage(100)
    setError(null)
  }, [position])

  if (!position) return null
  const available = Math.abs(Number(position.availableAmt || position.positionAmt))
  const parsedQuantity = Number(quantity)
  const fullClose = parsedQuantity >= available
  const live = environment === 'prod-live'
  const liveBlocked = live && !liveTradingEnabled
  const quantityFactor = 10 ** quantityPrecision
  const percentageLabel = Number.isInteger(closePercentage) ? closePercentage.toFixed(0) : closePercentage.toFixed(1)
  const formatCloseQuantity = (value: number) => {
    const fixed = value.toFixed(quantityPrecision)
    return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed
  }

  const setFromClosePercentage = (rawPercentage: number) => {
    const nextPercentage = clamp(Math.round(rawPercentage), 0, 100)
    const rawQuantity = available * nextPercentage / 100
    const nextQuantity = nextPercentage === 100
      ? available
      : Math.floor((rawQuantity + Number.EPSILON) * quantityFactor) / quantityFactor
    setClosePercentage(nextPercentage)
    setQuantity(nextQuantity > 0 ? formatCloseQuantity(nextQuantity) : '')
  }

  const changeCloseQuantity = (value: string) => {
    setQuantity(value)
    const numeric = Number(value)
    const nextPercentage = available > 0 && Number.isFinite(numeric)
      ? clamp(numeric / available * 100, 0, 100)
      : 0
    setClosePercentage(Number(nextPercentage.toFixed(1)))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > available) {
      setError(`Enter a quantity from 0 to ${formatQuantity(available)}.`)
      return
    }
    setError(null)
    try {
      await onConfirm(position.positionId, {
        quantity: fullClose ? undefined : parsedQuantity,
        confirmation: live ? 'CONFIRM' : undefined,
      })
      onCancel()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not close the position')
    }
  }

  return (
    <div className="exchange-modal-layer" role="dialog" aria-modal="true" aria-label="Close BingX position">
      <button className="exchange-modal-scrim" onClick={onCancel} aria-label="Cancel position close" />
      <form className="position-close-modal" onSubmit={submit}>
        <header>
          <div><strong>Close {position.symbol}</strong><small>{position.positionSide} · {position.leverage}x · {position.isolated ? 'Isolated' : 'Cross'}</small></div>
          <button type="button" onClick={onCancel}><X size={16} /></button>
        </header>
        <div className="close-position-body">
          <div className="close-position-summary">
            <span>Available to close<strong>{formatQuantity(available)}</strong></span>
            <span>Entry price<strong>{formatPrice(Number(position.avgPrice))}</strong></span>
            <span>Unrealized PnL<strong className={Number(position.unrealizedProfit) >= 0 ? 'up' : 'down'}>{formatPrice(Number(position.unrealizedProfit))} USDT</strong></span>
          </div>
          <div className="close-size-heading"><span>Close amount</span><strong>{percentageLabel}%</strong></div>
          <label className="close-quantity-field">
            <input className="number-clean" aria-label={`Close quantity ${position.symbol.split('-')[0]}`} type="number" min="0" max={available} step={1 / quantityFactor} value={quantity} onChange={(event) => changeCloseQuantity(event.target.value)} autoFocus />
            <span>{position.symbol.split('-')[0]}</span>
          </label>
          <div className="close-percentage-control">
            <input
              aria-label="Position percentage to close"
              type="range"
              min="0"
              max="100"
              step="1"
              value={closePercentage}
              onChange={(event) => setFromClosePercentage(Number(event.target.value))}
              style={{ '--range-progress': `${closePercentage}%` } as CSSProperties}
            />
            <div className="close-range-points">
              {[0, 25, 50, 75, 100].map((percent) => <button type="button" className={closePercentage >= percent ? 'active' : ''} style={{ left: `${percent}%` }} key={percent} onClick={() => setFromClosePercentage(percent)} aria-label={`Close ${percent}%`} />)}
            </div>
            <div className="close-range-labels">{[0, 25, 50, 75, 100].map((percent) => <button type="button" key={percent} onClick={() => setFromClosePercentage(percent)}>{percent}%</button>)}</div>
          </div>
          <div className="close-execution-row"><span>Market</span><strong>{quantity || '0'} {position.symbol.split('-')[0]}</strong></div>
          {liveBlocked && <div className="live-warning"><LockKeyhole size={15} />Live execution is disabled on this server.</div>}
          {error && <div className="exchange-error">{error}</div>}
          <button className="confirm-close-position" disabled={executing || liveBlocked || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > available}>
            {executing ? 'Closing…' : liveBlocked ? 'Live execution disabled' : fullClose ? 'Close position' : `Close ${percentageLabel}%`}
          </button>
        </div>
      </form>
    </div>
  )
}

function CancelOrderDialog({ order, environment, liveTradingEnabled, executing, onCancel, onConfirm }: {
  order: ExchangeOrder | null
  environment?: ExchangeSessionState['environment']
  liveTradingEnabled: boolean
  executing: boolean
  onCancel: () => void
  onConfirm: BottomPanelProps['onCancelOrder']
}) {
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setError(null)
  }, [order])
  if (!order) return null
  const orderId = String(order.orderId ?? order.orderID ?? '')
  const live = environment === 'prod-live'
  const blocked = live && !liveTradingEnabled
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!orderId || !order.symbol) return
    setError(null)
    try {
      await onConfirm(orderId, {
        symbol: order.symbol,
        clientOrderId: order.clientOrderId,
        confirmation: live ? 'CONFIRM' : undefined,
      })
      onCancel()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not cancel the order')
    }
  }
  return (
    <div className="exchange-modal-layer" role="dialog" aria-modal="true" aria-label="Cancel BingX order">
      <button className="exchange-modal-scrim" type="button" onClick={onCancel} />
      <form className="position-close-modal cancel-order-modal" onSubmit={submit}>
        <header><div><strong>Cancel order</strong><small>{order.symbol} · {String(order.type ?? 'Order')} · #{orderId}</small></div><button type="button" onClick={onCancel}><X size={16} /></button></header>
        <div className="close-position-body">
          <div className="close-position-summary"><span>Side<strong>{String(order.positionSide ?? order.side ?? '--')}</strong></span><span>Price<strong>{Number(order.price) > 0 ? formatPrice(Number(order.price)) : 'Market'}</strong></span><span>Quantity<strong>{formatQuantity(Number(order.origQty ?? order.quantity ?? 0))}</strong></span></div>
          <div className="live-warning neutral"><AlertTriangle size={15} />The order is cancelled only after BingX confirms the request.</div>
          {live && <div className="live-warning"><LockKeyhole size={15} />LIVE action — this order will be cancelled after one confirmation.</div>}
          {blocked && <div className="live-warning"><LockKeyhole size={15} />Live execution is disabled on this server.</div>}
          {error && <div className="exchange-error">{error}</div>}
          <button className="confirm-close-position danger-button" disabled={executing || blocked || !orderId}>{executing ? 'Cancelling on BingX…' : 'Cancel order'}</button>
        </div>
      </form>
    </div>
  )
}

function AmendOrderDialog({ order, environment, liveTradingEnabled, executing, onCancel, onConfirm }: {
  order: ExchangeOrder | null
  environment?: ExchangeSessionState['environment']
  liveTradingEnabled: boolean
  executing: boolean
  onCancel: () => void
  onConfirm: BottomPanelProps['onAmendOrder']
}) {
  const [quantity, setQuantity] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setQuantity(String(order?.origQty ?? order?.quantity ?? ''))
    setError(null)
  }, [order])
  if (!order) return null
  const orderId = String(order.orderId ?? order.orderID ?? '')
  const parsedQuantity = Number(quantity)
  const live = environment === 'prod-live'
  const blocked = live && !liveTradingEnabled
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!orderId || !order.symbol || !(parsedQuantity > 0)) return
    setError(null)
    try {
      await onConfirm(orderId, {
        symbol: order.symbol,
        clientOrderId: order.clientOrderId,
        quantity: parsedQuantity,
        confirmation: live ? 'CONFIRM' : undefined,
      })
      onCancel()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not change the order')
    }
  }
  return (
    <div className="exchange-modal-layer" role="dialog" aria-modal="true" aria-label="Change BingX order quantity">
      <button className="exchange-modal-scrim" type="button" onClick={onCancel} />
      <form className="position-close-modal amend-order-modal" onSubmit={submit}>
        <header><div><strong>Edit order quantity</strong><small>{order.symbol} · {String(order.type ?? 'Order')} · #{orderId}</small></div><button type="button" onClick={onCancel}><X size={16} /></button></header>
        <div className="close-position-body">
          <label className="exchange-field"><span>New total quantity ({order.symbol?.split('-')[0]})</span><input className="number-clean" type="number" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} autoFocus /></label>
          <div className="live-warning neutral"><Info size={15} />BingX Amend changes quantity only. Price changes require cancel-and-replace and are not performed implicitly.</div>
          {live && <div className="live-warning"><LockKeyhole size={15} />LIVE action — review the new quantity, then confirm once.</div>}
          {blocked && <div className="live-warning"><LockKeyhole size={15} />Live execution is disabled on this server.</div>}
          {error && <div className="exchange-error">{error}</div>}
          <button className="confirm-close-position amend-button" disabled={executing || blocked || !(parsedQuantity > 0)}>{executing ? 'Updating on BingX…' : 'Confirm new quantity'}</button>
        </div>
      </form>
    </div>
  )
}

function HistoryToolbar({ synchronizedAt, loading, onRefresh }: { synchronizedAt: number; loading: boolean; onRefresh: () => Promise<unknown> }) {
  return (
    <div className="history-toolbar">
      <span>{synchronizedAt > 0 ? `Synced ${new Date(synchronizedAt).toLocaleTimeString('en-GB')}` : 'Waiting for first synchronization'}</span>
      <button type="button" disabled={loading} onClick={() => onRefresh().catch(() => undefined)}><RefreshCw size={12} className={loading ? 'spin' : ''} />{loading ? 'Syncing…' : 'Refresh'}</button>
    </div>
  )
}

function OrderHistoryView({ connected, history, loading, onRefresh }: { connected: boolean; history: AccountHistory; loading: boolean; onRefresh: () => Promise<unknown> }) {
  if (!connected || (!loading && history.orderHistory.length === 0)) {
    return <div className="empty-state"><div className="empty-icon"><BookOpen size={19} /></div><span>{connected ? 'No historical orders found' : 'Connect BingX to synchronize order history'}</span><small>Orders are isolated to this signed-in account and retained in the terminal database.</small></div>
  }
  return (
    <div className="history-view">
      <HistoryToolbar synchronizedAt={history.synchronizedAt} loading={loading} onRefresh={onRefresh} />
      {history.warnings.map((warning) => <div className="history-warning" key={warning}>{warning}</div>)}
      <div className="history-table order-history-table history-head"><span>Contract</span><span>Side</span><span>Type</span><span>Order / Avg price</span><span>Filled / Quantity</span><span>Status</span><span>PnL / Fee</span><span>Time</span></div>
      {history.orderHistory.map((order) => {
        const pnl = Number(order.realizedPnl || 0)
        return <div className="history-table order-history-table" key={order.orderId}>
          <strong>{order.symbol}<small>#{order.orderId}</small></strong>
          <span className={String(order.positionSide || order.side).toUpperCase().includes('LONG') || String(order.side).toUpperCase() === 'BUY' ? 'up' : 'down'}>{order.positionSide || order.side}</span>
          <span>{order.type || '--'}</span>
          <span>{Number(order.price) > 0 ? formatPrice(Number(order.price)) : 'Market'}<small>{Number(order.avgPrice) > 0 ? `Avg ${formatPrice(Number(order.avgPrice))}` : 'Not filled'}</small></span>
          <span>{formatQuantity(Number(order.executedQty || 0))}<small>of {formatQuantity(Number(order.quantity || 0))}</small></span>
          <span className="history-status">{order.status || '--'}</span>
          <span className={pnl >= 0 ? 'up' : 'down'}>{pnl >= 0 ? '+' : ''}{formatPrice(pnl)}<small>Fee {formatPrice(Number(order.fee || 0))}</small></span>
          <span>{new Date(Number(order.time)).toLocaleDateString('en-GB')}<small>{new Date(Number(order.time)).toLocaleTimeString('en-GB')}</small></span>
        </div>
      })}
    </div>
  )
}

function TradeHistoryView({ connected, history, loading, onRefresh }: { connected: boolean; history: AccountHistory; loading: boolean; onRefresh: () => Promise<unknown> }) {
  if (!connected || (!loading && history.tradeHistory.length === 0)) {
    return <div className="empty-state"><div className="empty-icon"><BookOpen size={19} /></div><span>{connected ? 'No fills found in the synchronized period' : 'Connect BingX to synchronize trade fills'}</span><small>Every partial execution is shown as a separate fill with its fee and realized PnL.</small></div>
  }
  return (
    <div className="history-view">
      <HistoryToolbar synchronizedAt={history.synchronizedAt} loading={loading} onRefresh={onRefresh} />
      {history.warnings.map((warning) => <div className="history-warning" key={warning}>{warning}</div>)}
      <div className="history-table trade-history-table history-head"><span>Contract</span><span>Side</span><span>Fill price</span><span>Quantity</span><span>Realized PnL</span><span>Fee</span><span>Time</span></div>
      {history.tradeHistory.map((trade) => {
        const pnl = Number(trade.realizedPnl || 0)
        return <div className="history-table trade-history-table" key={trade.tradeId}>
          <strong>{trade.symbol}<small>Fill #{trade.tradeId} · Order #{trade.orderId}</small></strong>
          <span className={String(trade.positionSide || trade.side).toUpperCase().includes('LONG') || String(trade.side).toUpperCase() === 'BUY' ? 'up' : 'down'}>{trade.positionSide || trade.side}</span>
          <span>{formatPrice(Number(trade.price))}</span>
          <span>{formatQuantity(Number(trade.quantity))}</span>
          <span className={pnl >= 0 ? 'up' : 'down'}>{pnl >= 0 ? '+' : ''}{formatPrice(pnl)} USDT</span>
          <span>{formatPrice(Number(trade.fee || 0))} USDT</span>
          <span>{new Date(Number(trade.time)).toLocaleDateString('en-GB')}<small>{new Date(Number(trade.time)).toLocaleTimeString('en-GB')}</small></span>
        </div>
      })}
    </div>
  )
}

function AssetsView({ connected, balances, positions, environment }: { connected: boolean; balances: ExchangeBalance[]; positions: ExchangePosition[]; environment?: ExchangeSessionState['environment'] }) {
  if (!connected) return <div className="empty-state"><div className="empty-icon"><WalletCards size={19} /></div><span>Connect BingX to view account assets</span><small>Only balances belonging to this signed-in user are returned.</small></div>
  const preferredBalance = selectSettlementBalance(environment, balances)
  const summaryBalances = preferredBalance ? [preferredBalance] : balances
  const summaryAsset = preferredBalance?.asset || settlementAsset(environment)
  const totals = summaryBalances.reduce((result, balance) => ({
    balance: result.balance + Number(balance.balance || 0),
    equity: result.equity + Number(balance.equity || 0),
    available: result.available + Number(balance.availableMargin || 0),
    used: result.used + Number(balance.usedMargin || 0),
    unrealized: result.unrealized + Number(balance.unrealizedProfit || 0),
  }), { balance: 0, equity: 0, available: 0, used: 0, unrealized: 0 })
  return (
    <div className="assets-view">
      <div className="asset-summary-grid">
        <span>Wallet balance<strong>{formatPrice(totals.balance)} {summaryAsset}</strong></span>
        <span>Equity<strong>{formatPrice(totals.equity)} {summaryAsset}</strong></span>
        <span>Available margin<strong>{formatPrice(totals.available)} {summaryAsset}</strong></span>
        <span>Used margin<strong>{formatPrice(totals.used)} {summaryAsset}</strong></span>
        <span>Unrealized PnL<strong className={totals.unrealized >= 0 ? 'up' : 'down'}>{totals.unrealized >= 0 ? '+' : ''}{formatPrice(totals.unrealized)} {summaryAsset}</strong></span>
        <span>Open positions<strong>{positions.length}</strong></span>
      </div>
      <div className="asset-table asset-head"><span>Asset</span><span>Balance</span><span>Equity</span><span>Available margin</span><span>Used margin</span><span>Unrealized PnL</span></div>
      {balances.map((balance) => <div className="asset-table" key={balance.asset}><strong>{balance.asset}</strong><span>{formatPrice(Number(balance.balance))}</span><span>{formatPrice(Number(balance.equity))}</span><span>{formatPrice(Number(balance.availableMargin))}</span><span>{formatPrice(Number(balance.usedMargin))}</span><span className={Number(balance.unrealizedProfit) >= 0 ? 'up' : 'down'}>{formatPrice(Number(balance.unrealizedProfit))}</span></div>)}
    </div>
  )
}

function BottomPanel({ demoOrders, exchangeOrders, contracts, connected, positions, balances, history, historyLoading, environment, liveTradingEnabled, executing, onRemoveDemo, onCancelOrder, onAmendOrder, onClosePosition, onRefreshHistory }: BottomPanelProps) {
  const [tab, setTab] = useState<'positions' | 'orders' | 'order-history' | 'trade-history' | 'assets'>('positions')
  const [positionToClose, setPositionToClose] = useState<ExchangePosition | null>(null)
  const [orderToCancel, setOrderToCancel] = useState<ExchangeOrder | null>(null)
  const [orderToAmend, setOrderToAmend] = useState<ExchangeOrder | null>(null)
  const visibleOrderCount = connected ? exchangeOrders.length : demoOrders.length
  const marginAsset = settlementAsset(environment)
  const tabs = [
    { id: 'positions' as const, label: `Positions (${positions.length})` },
    { id: 'orders' as const, label: `Open Orders (${visibleOrderCount})` },
    { id: 'order-history' as const, label: `Order History (${history.orderHistory.length})` },
    { id: 'trade-history' as const, label: `Trade History (${history.tradeHistory.length})` },
    { id: 'assets' as const, label: `Assets (${balances.length})` },
  ]

  const isPositionsTab = tab === 'positions'
  const isOrdersTab = tab === 'orders'
  const isOrderHistoryTab = tab === 'order-history'
  const isTradeHistoryTab = tab === 'trade-history'
  const isAssetsTab = tab === 'assets'
  return (
    <section className="bottom-panel panel">
      <div className="bottom-tabs">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>
        ))}
        <div className="bottom-actions"><button><Gauge size={13} /> Trading rules</button><button><Settings size={14} /></button></div>
      </div>
      {isPositionsTab && positions.length > 0 ? (
        <div className="positions-table-wrap">
          <div className="positions-table positions-head">
            <span>Contract</span><span>Side / leverage</span><span>Size</span><span>Entry price</span><span>Position value</span><span>Unrealized PnL</span><span>Liq. price</span><span />
          </div>
          {positions.map((position) => {
            const pnl = Number(position.unrealizedProfit)
            return (
              <div className="positions-table" key={position.positionId}>
                <strong>{position.symbol}<small>{position.isolated ? 'Isolated' : 'Cross'} · BingX</small></strong>
                <span className={position.positionSide === 'LONG' ? 'up' : 'down'}>{position.positionSide} <small>{position.leverage}x</small></span>
                <span>{formatQuantity(Math.abs(Number(position.positionAmt)))}</span>
                <span>{formatPrice(Number(position.avgPrice))}</span>
                <span>{formatPrice(Math.abs(Number(position.positionValue || 0)))} USDT</span>
                <span className={pnl >= 0 ? 'up' : 'down'}>{pnl >= 0 ? '+' : ''}{formatPrice(pnl)} {marginAsset}</span>
                <span>{Number(position.liquidationPrice) > 0 ? formatPrice(Number(position.liquidationPrice)) : '--'}</span>
                <button disabled={executing} onClick={() => setPositionToClose(position)}>Close</button>
              </div>
            )
          })}
        </div>
      ) : isOrderHistoryTab ? (
        <OrderHistoryView connected={connected} history={history} loading={historyLoading} onRefresh={onRefreshHistory} />
      ) : isTradeHistoryTab ? (
        <TradeHistoryView connected={connected} history={history} loading={historyLoading} onRefresh={onRefreshHistory} />
      ) : isAssetsTab ? (
        <AssetsView connected={connected} balances={balances} positions={positions} environment={environment} />
      ) : (isPositionsTab || (isOrdersTab && visibleOrderCount === 0)) ? (
        <div className="empty-state">
          <div className="empty-icon"><BookOpen size={19} /></div>
          <span>{isPositionsTab ? 'No open BingX positions' : isOrdersTab ? 'No open orders' : 'No records in this view yet'}</span>
          <small>{isPositionsTab || isOrdersTab ? 'BingX positions and orders will appear here after exchange confirmation' : 'History synchronization is the next data stage'}</small>
        </div>
      ) : connected ? (
        <div className="orders-table-wrap">
          <div className="orders-table orders-head"><span>Symbol</span><span>Side</span><span>Type</span><span>Price</span><span>Qty</span><span>Status</span><span>Time</span><span /></div>
          {exchangeOrders.map((order, index) => {
            const orderId = String(order.orderId ?? order.orderID ?? `${index}`)
            const timestamp = Number(order.time)
            return (
              <div className="orders-table" key={orderId}>
                <strong>{String(order.symbol ?? '--')}<small>BingX</small></strong>
                <span className={String(order.side).toUpperCase() === 'BUY' ? 'up' : 'down'}>{String(order.positionSide ?? order.side ?? '--')}</span>
                <span>{String(order.type ?? '--')}</span>
                <span>{Number(order.price) > 0 ? formatPrice(Number(order.price)) : Number(order.stopPrice) > 0 ? `Trigger ${formatPrice(Number(order.stopPrice))}` : 'Market'}</span>
                <span>{formatQuantity(Number(order.executedQty ?? 0))} / {formatQuantity(Number(order.origQty ?? order.quantity ?? 0))}</span>
                <span className="demo-status live-status">{String(order.status ?? 'NEW')}</span>
                <span>{timestamp > 0 ? new Date(timestamp).toLocaleTimeString('en-GB') : '--'}</span>
                <div className="order-row-actions"><button disabled={executing || !order.orderId && !order.orderID} onClick={() => setOrderToAmend(order)}><Pencil size={11} /> Edit</button><button disabled={executing || !order.orderId && !order.orderID} onClick={() => setOrderToCancel(order)}><X size={13} /> Cancel</button></div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="orders-table-wrap">
          <div className="orders-table orders-head"><span>Symbol</span><span>Side</span><span>Type</span><span>Price</span><span>Qty</span><span>Status</span><span>Time</span><span /></div>
          {demoOrders.map((order) => (
            <div className="orders-table" key={order.id}>
              <strong>{order.symbol}<small>Demo</small></strong><span className={order.side === 'Buy' ? 'up' : 'down'}>{order.side}</span><span>{order.type}</span><span>{formatPrice(order.price)}</span><span>{formatQuantity(order.quantity)}</span><span className="demo-status">{order.status}</span><span>{order.createdAt}</span><button onClick={() => onRemoveDemo(order.id)}><X size={13} /> Cancel</button>
            </div>
          ))}
        </div>
      )}
      <PositionCloseDialog
        position={positionToClose}
        quantityPrecision={contracts.find((contract) => contract.symbol === positionToClose?.symbol)?.quantityPrecision ?? 8}
        environment={environment}
        liveTradingEnabled={liveTradingEnabled}
        executing={executing}
        onCancel={() => setPositionToClose(null)}
        onConfirm={onClosePosition}
      />
      <CancelOrderDialog order={orderToCancel} environment={environment} liveTradingEnabled={liveTradingEnabled} executing={executing} onCancel={() => setOrderToCancel(null)} onConfirm={onCancelOrder} />
      <AmendOrderDialog order={orderToAmend} environment={environment} liveTradingEnabled={liveTradingEnabled} executing={executing} onCancel={() => setOrderToAmend(null)} onConfirm={onAmendOrder} />
    </section>
  )
}

function StatusBar() {
  return (
    <footer className="status-bar">
      <div><span className="status-dot" /> All systems operational</div>
      <div className="status-links">
        <span><Clock3 size={12} /> UTC 13:42:18</span>
        <span><Activity size={12} /> 21 ms</span>
        <span><Globe2 size={12} /> English</span>
      </div>
    </footer>
  )
}

function TerminalApp({ user, theme, onLogout, onToggleTheme }: { user: AuthUser; theme: Theme; onLogout: () => void; onToggleTheme: () => void }) {
  const [interval, setInterval] = useState('1m')
  const [activeSection, setActiveSection] = useState<AppSection>('trade')
  const [orders, setOrders] = useState<DemoOrder[]>([])
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false)
  const [orderProtectionDraft, setOrderProtectionDraft] = useState<OrderProtectionDraft | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState(() => localStorage.getItem(`antytilt:${user.id}:selected-market`) ?? 'BTCUSDT')
  const [marketDataExchange, setMarketDataExchange] = useState<MarketDataExchange>(() => {
    const saved = localStorage.getItem(`antytilt:${user.id}:market-source`)
    return saved === 'bingx' || saved === 'bybit' || saved === 'binance' ? saved : 'binance'
  })
  const catalog = useMarketCatalog()
  const selectedMarket = catalog.markets.find((item) => item.symbol === selectedSymbol) ?? catalog.markets[0]
  const exchange = useExchangeAccount(`${selectedMarket.baseAsset}-USDT`)
  const bingxSymbols = useMemo(
    () => new Set((exchange.contractCatalog?.contracts ?? []).map((contract) => contract.symbol)),
    [exchange.contractCatalog],
  )
  const executionMarkets = useMemo(() => (
    exchange.session.connected && exchange.contractCatalog
      ? catalog.markets.filter((item) => bingxSymbols.has(`${item.baseAsset}-USDT`))
      : catalog.markets
  ), [bingxSymbols, catalog.markets, exchange.contractCatalog, exchange.session.connected])
  const selectedInstrumentSupported = !exchange.session.connected
    || !exchange.contractCatalog
    || bingxSymbols.has(`${selectedMarket.baseAsset}-USDT`)
  const market = useMarketData(marketDataExchange, selectedMarket.baseAsset, interval, selectedMarket.lastPrice)
  const priceDirection = usePriceDirection(market.ticker.lastPrice, `${marketDataExchange}:${selectedMarket.symbol}`)

  useEffect(() => {
    if (selectedMarket.symbol !== selectedSymbol) setSelectedSymbol(selectedMarket.symbol)
    localStorage.setItem(`antytilt:${user.id}:selected-market`, selectedMarket.symbol)
  }, [selectedMarket.symbol, selectedSymbol, user.id])

  useEffect(() => {
    localStorage.setItem(`antytilt:${user.id}:market-source`, marketDataExchange)
  }, [marketDataExchange, user.id])

  useEffect(() => {
    if (!exchange.session.connected || !exchange.contractCatalog || selectedInstrumentSupported) return
    const firstExecutable = executionMarkets[0]
    if (firstExecutable) setSelectedSymbol(firstExecutable.symbol)
  }, [exchange.contractCatalog, exchange.session.connected, executionMarkets, selectedInstrumentSupported])

  const closeSelector = useCallback(() => setSelectorOpen(false), [])
  const selectMarket = useCallback((nextMarket: MarketInstrument) => {
    setSelectedSymbol(nextMarket.symbol)
    setSelectorOpen(false)
  }, [])

  return (
    <div className="app-shell">
      <Header
        connection={market.connection}
        marketSource={market.sourceLabel}
        exchange={exchange.session}
        user={user}
        activeSection={activeSection}
        theme={theme}
        onNavigate={setActiveSection}
        onSearch={() => setSelectorOpen(true)}
        onConnect={() => setExchangeModalOpen(true)}
        onLogout={onLogout}
        onToggleTheme={onToggleTheme}
      />
      {activeSection === 'risk' ? (
        <>
          <Suspense fallback={<main className="rm-page"><div className="rm-loading"><span className="button-spinner" /> Loading risk management…</div></main>}>
            <RiskManagementPage onBackToTrade={() => setActiveSection('trade')} />
          </Suspense>
          <StatusBar />
        </>
      ) : (
      <>
      <InstrumentBar
        ticker={market.ticker}
        priceDirection={priceDirection}
        fundingRate={market.fundingRate}
        nextFundingTime={market.nextFundingTime}
        market={selectedMarket}
        markets={executionMarkets}
        selectorOpen={selectorOpen}
        catalogStatus={catalog.status}
        marketSource={market.sourceLabel}
        marketDataExchange={marketDataExchange}
        executionExchange={exchange.session.connected && exchange.contractCatalog ? 'BingX' : undefined}
        onOpenSelector={() => setSelectorOpen(true)}
        onCloseSelector={closeSelector}
        onSelectMarket={selectMarket}
        onMarketDataExchange={setMarketDataExchange}
      />
      <main className="terminal-layout">
        <PriceChart
          key={`${marketDataExchange}:${selectedMarket.symbol}`}
          candles={market.candles}
          interval={interval}
          symbol={selectedMarket.symbol}
          storageScope={user.id}
          marketExchange={marketDataExchange}
          marketStatus={market.connection}
          marketError={market.error}
          referencePrice={selectedMarket.lastPrice}
          exchangeReferencePrice={exchange.tradingSettings?.prices.markPrice}
          priceDirection={priceDirection}
          theme={theme}
          positions={exchange.session.snapshot?.positions ?? []}
          openOrders={exchange.session.snapshot?.openOrders ?? []}
          orderProtectionDraft={orderProtectionDraft}
          protectionBusy={exchange.status === 'executing'}
          onUpdateProtection={exchange.updatePositionProtection}
          onIntervalChange={setInterval}
        />
        <aside className="market-column">
          <OrderBook {...market} lastPrice={market.ticker.lastPrice} baseAsset={selectedMarket.baseAsset} priceDirection={priceDirection} />
          <RecentTrades trades={market.trades} fallbackPrice={market.ticker.lastPrice} baseAsset={selectedMarket.baseAsset} />
        </aside>
        <OrderEntryPanel
          price={market.ticker.lastPrice}
          marketDataExchange={marketDataExchange}
          market={selectedMarket}
          exchange={exchange.session}
          status={exchange.status}
          exchangeError={exchange.error}
          settings={exchange.tradingSettings}
          settingsLoading={exchange.settingsLoading}
          instrumentSupported={selectedInstrumentSupported}
          positions={exchange.session.snapshot?.positions ?? []}
          openOrders={exchange.session.snapshot?.openOrders ?? []}
          onCreateOrder={(order) => setOrders((current) => [order, ...current])}
          onChangeMarginType={exchange.changeMarginType}
          onChangeLeverage={exchange.changeLeverage}
          onPreviewOrder={exchange.previewOrder}
          onExecuteOrder={exchange.executeOrder}
          onOpenRiskManagement={() => setActiveSection('risk')}
          onProtectionDraftChange={setOrderProtectionDraft}
        />
        <BottomPanel
          demoOrders={orders}
          exchangeOrders={exchange.session.snapshot?.openOrders ?? []}
          contracts={exchange.contractCatalog?.contracts ?? []}
          connected={exchange.session.connected}
          positions={exchange.session.snapshot?.positions ?? []}
          balances={exchange.session.snapshot?.balances ?? []}
          history={exchange.history}
          historyLoading={exchange.historyLoading}
          environment={exchange.session.environment}
          liveTradingEnabled={exchange.session.liveTradingEnabled}
          executing={exchange.status === 'executing'}
          onRemoveDemo={(id) => setOrders((current) => current.filter((order) => order.id !== id))}
          onCancelOrder={exchange.cancelOrder}
          onAmendOrder={exchange.amendOrder}
          onClosePosition={exchange.closePosition}
          onRefreshHistory={() => exchange.refreshHistory()}
        />
      </main>
      <StatusBar />
      </>
      )}
      <ExchangeConnectionModal
        open={exchangeModalOpen}
        session={exchange.session}
        accounts={exchange.accounts}
        connecting={exchange.status === 'connecting'}
        error={exchange.error}
        onClose={() => setExchangeModalOpen(false)}
        onConnect={exchange.connect}
        onSelectAccount={exchange.selectAccount}
        onDisconnect={exchange.disconnect}
      />
    </div>
  )
}

export default function App() {
  const auth = useAuth()
  const [theme, setTheme] = useState<Theme>(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
  const [completedAuthSequence, setCompletedAuthSequence] = useState(0)
  const toggleTheme = useCallback(() => setTheme((current) => current === 'dark' ? 'light' : 'dark'), [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('antytilt:theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f6f8' : '#090b0f')
  }, [theme])

  if (auth.status === 'checking') return <div className="auth-shell"><div className="auth-loading"><span className="button-spinner" />Securing your session…</div></div>
  if (!auth.session.authenticated || !auth.session.user) {
    return <AuthScreen busy={auth.status === 'submitting'} error={auth.error} theme={theme} onToggleTheme={toggleTheme} onSubmit={auth.submit} />
  }
  const showMarketPulse = auth.manualAuthSequence > completedAuthSequence
  return (
    <>
      <TerminalApp user={auth.session.user} theme={theme} onToggleTheme={toggleTheme} onLogout={() => auth.logout().catch(() => undefined)} />
      {showMarketPulse && (
        <MarketPulseIntro
          key={auth.manualAuthSequence}
          onComplete={() => setCompletedAuthSequence(auth.manualAuthSequence)}
        />
      )}
    </>
  )
}

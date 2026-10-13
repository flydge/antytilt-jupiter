# AntyTILT: состояние проекта, план выпуска и интеграция Jupiter

Актуально на 11 октября 2026 года.

Этот документ отвечает на три вопроса:

1. Что уже реализовано в AntyTILT и действительно поддержано backend-логикой.
2. Что ещё требуется для полноценного публичного продукта.
3. Как добавить Solana/Jupiter, не сохраняя приватные ключи пользователей на стороне AntyTILT.

## 1. Краткий вывод

AntyTILT уже является работающим многопользовательским MVP торгового терминала и серверной системы риск-менеджмента для BingX. Это не только интерфейс: настройки, аккаунты, торговая история, идемпотентность запросов, состояние RM и события сохраняются в PostgreSQL, а независимый worker продолжает проверять подключённые аккаунты, когда браузер пользователя закрыт.

Главные ограничения текущей версии:

- приватное исполнение ордеров и автоматические RM-действия реализованы только для BingX;
- email verification, восстановление пароля и MFA ещё не реализованы;
- production-секреты пока не вынесены в KMS/Vault;
- нужны централизованные monitoring/alerting, резервное восстановление и внешний security review;
- Jupiter/Solana пока не подключены;
- полный запрет обхода RM через внешний кошелёк невозможен без заранее выданного on-chain разрешения или smart-account/vault архитектуры.

Для Jupiter рекомендуется двухэтапный путь:

- сначала сделать реальный MVP через Jupiter Swap V2 и Trigger V2: пользователь подписывает операции своим кошельком, а TP/SL/OCO исполняет Jupiter;
- затем создать on-chain программу AntyTILT Guard с ограниченным SPL delegate-разрешением или программным vault/smart account, если требуется автономное закрытие нарушающих правила позиций.

`Durable nonce` полезен для эксперимента с одной заранее подписанной аварийной транзакцией, но не заменяет постоянное разрешение на управление риском.

## 2. Что уже есть в проекте

### 2.1 Технологический контур

| Область | Реализация | Статус |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite, адаптивный desktop/mobile UI | Реализовано |
| График | TradingView Lightweight Charts, свечи, объём, собственная панель рисования | Реализовано |
| API | Express 5, Zod-валидация, Helmet, cookie-сессии | Реализовано |
| Основная БД | PostgreSQL 17, последовательные SQL-миграции | Реализовано |
| Очередь RM | Redis 8, BullMQ, retry/backoff | Реализовано |
| RM-worker | Отдельный процесс, heartbeat и распределённый lock на биржевой аккаунт | Реализовано |
| Локальный production-контур | Docker Compose: API/frontend, worker, PostgreSQL, Redis, gateway | Реализовано |
| Временный публичный доступ | Cloudflare Tunnel поверх локального контура | Реализовано для тестов |
| Постоянный cloud deployment | Render Blueprint и инструкции | Подготовлено, требует развёртывания и секретов |

### 2.2 Пользователи и разделение данных

Реализовано:

- регистрация и вход по email/паролю;
- серверные сессии и выход из аккаунта;
- раздельные данные каждого пользователя;
- несколько биржевых подключений пользователя;
- отдельные RM-профили и состояния по `exchange_account_id`;
- выбор активного торгового аккаунта;
- сохранение пользователей, сессий, аккаунтов, истории и RM-состояния в PostgreSQL.

Пока отсутствует:

- подтверждение email;
- восстановление и смена забытого пароля через email;
- MFA/passkeys;
- управление активными устройствами и принудительный выход со всех сессий;
- административная панель поддержки и безопасная процедура восстановления доступа.

### 2.3 Биржевое подключение и торговля

Для BingX VST и BingX Live реализовано:

- подключение API key/secret;
- отдельное хранение нескольких подключений;
- AES-256-GCM шифрование credentials в базе;
- баланс, equity, позиции, активные ордера, история ордеров, fills и assets;
- Cross/Isolated margin mode и leverage;
- Market, Limit и ограниченные Trigger orders;
- Reduce-only, GTC/IOC/FOK/PostOnly;
- TP/SL по цене, ROI или P&L;
- Last/Mark/Index trigger source в поддерживаемых сценариях;
- предварительный серверный расчёт margin, fee, slippage и liquidation;
- полное и частичное закрытие позиции;
- отмена и изменение ордеров;
- изменение защиты существующей позиции с подтверждением биржи;
- идемпотентность торговых mutations в PostgreSQL, чтобы повтор запроса после перезапуска не создал второй ордер;
- явное подтверждение live-операций пользователем.

Для Binance и Bybit сейчас реализованы публичные market-data адаптеры и выбор источника графика. Приватное подключение аккаунта, исполнение и RM-worker для этих бирж ещё не завершены. Hyperliquid и Jupiter пока отсутствуют в коде.

### 2.4 Рыночные данные и терминал

Реализовано:

- каталог активов и выбор рынка;
- live candles, ticker, funding, order book и recent trades;
- WebSocket reconnect/backoff, проверка устаревшего потока и REST-восстановление;
- светлая и тёмная темы;
- таблицы Positions, Open Orders, Order History, Trade History и Assets;
- разделение статусов `Market data` и `Trading account`;
- интерактивные линии позиции, TP и SL;
- пользовательские рисунки: trend line, ray, horizontal/vertical level, Fibonacci, rectangle, measurement, long/short position и text;
- перемещение точек, magnet mode, undo/redo, lock/hide/duplicate/delete;
- экспорт/импорт рисунков и отдельное хранение рабочего пространства по пользователю и рынку.

### 2.5 Серверный Risk Management

Профиль RM применяется к конкретному `exchange_account_id`. Проверка выполняется:

1. при preview ордера;
2. непосредственно перед отправкой ордера;
3. независимо RM-worker-ом для позиций и ордеров, появившихся напрямую на BingX.

Реализованы все десять правил:

| Правило | Что делает backend |
| --- | --- |
| Protective Stop | Требует и поддерживает Stop Loss с заданным максимальным расстоянием |
| Break-even | После достижения заданной прибыли переносит защиту к цене входа с offset |
| Daily Loss Limit | Блокирует новые входы после достижения дневного убытка в процентах или USDT |
| Risk per Trade | Сравнивает ожидаемый убыток до SL с equity и отклоняет превышение |
| Maximum Leverage | Не разрешает плечо выше лимита |
| Trades per Day | Считает новые входы и блокирует превышение дневного числа сделок |
| Consecutive Losses | Считает последовательные закрытые убыточные сделки |
| Cooldown | Блокирует новые входы до окончания периода паузы |
| Exposure | Ограничивает суммарный размер открытой экспозиции относительно equity |
| Open Positions | Ограничивает количество уникальных открытых позиций |

Политика нарушения может:

- только блокировать новые ордера AntyTILT;
- отменять ожидающие ордера;
- закрывать нарушающую позицию;
- закрывать все позиции;
- обнаруживать и закрывать новый прямой вход с BingX, открытый в обход терминала.

Автоматическое действие для Live требует одновременно:

- работающего RM-worker;
- включённого `ALLOW_LIVE_RM_AUTOMATION`;
- активного RM-профиля;
- сохранённого пользователем `automationConsent`;
- выбранной политики закрытия;
- доступного и правильно настроенного BingX API account.

Поэтому формулировка «все десять правил работают» означает, что их расчёты и серверные состояния реализованы. Это не означает, что любое правило всегда закроет внешнюю позицию: автоматическое закрытие зависит от перечисленных разрешений и доступности биржи.

### 2.6 Надёжность и аудит

Реализовано:

- PostgreSQL как source of truth;
- account-scoped ключи и ограничения;
- Redis queue и per-account distributed lock;
- retry/backoff и worker heartbeat;
- защита от параллельной обработки одного аккаунта;
- restart-safe trading idempotency;
- durable daily counters, reservations, position/protection state и streak state;
- RM event feed и audit events;
- health/live, health/ready и health/worker endpoints;
- unit/integration тесты базы, auth, API, RM Guard, RM automation, exchange UI и drawing tools.

## 3. Основной поток данных

```text
Browser
  -> React terminal
  -> Express API
       -> PostgreSQL: users, sessions, accounts, history, RM state, audit
       -> Redis/BullMQ: RM jobs, retries, heartbeat, locks
       -> BingX signed API: trading and private account data

Independent RM worker
  -> receives account jobs
  -> acquires exchange_account_id lock
  -> synchronizes BingX positions/orders/fills
  -> evaluates saved RM profile
  -> records decision and event
  -> performs an authorized cancel/close/protection action
```

Закрытие браузера не останавливает worker. Закрытие компьютера или Docker-контейнеров останавливает локальный контур, поэтому публичный продукт должен работать на постоянно доступной инфраструктуре.

## 4. Что нужно сделать до полноценного публичного запуска

### P0 — безопасность денег и контроль доступа

- Email verification, password reset и безопасная смена email.
- MFA или passkeys для входа и критических действий.
- Managed KMS/Vault и ротация ключа шифрования API credentials.
- Проверка permissions биржевого ключа: trading разрешён, withdrawal запрещён.
- Dedicated outbound IP и обязательный exchange IP whitelist, где это возможно.
- Redis-backed distributed rate limiting для auth и trading endpoints.
- CSRF/session hardening, device/session management и security audit.
- Разделение production/staging/test секретов и баз.
- Юридические документы: Terms, Privacy, risk disclosure и анализ требований юрисдикций.

### P0 — торговая надёжность

- Полная reconciliation-машина после timeout/unknown exchange response.
- Dead-letter queue и операторский интерфейс для застрявших RM jobs.
- Fencing token для защиты от устаревшего worker после потери lock.
- Проверка всех breach actions на VST и controlled Live-суммах.
- E2E-сценарии: ручной внешний вход, partial fill, hedge, reconnect, restart, stale data, недоступная биржа.
- Multi-user и multi-account нагрузочные тесты.
- Явное состояние `automation degraded`: worker/market data/exchange unavailable.

### P0 — эксплуатация

- Постоянно работающие API/frontend и отдельный worker.
- Managed PostgreSQL с автоматическими backup и point-in-time recovery.
- Managed Redis с persistence/HA в соответствии с выбранной очередью.
- Monitoring: error rate, API latency, worker heartbeat, queue age, failed jobs, exchange errors и RM action latency.
- Alerting в Telegram/Slack/email и runbooks для каждого критического сигнала.
- Проверенный restore drill и disaster recovery plan.
- HTTPS, домен, WAF/CDN и безопасные production cookies.

### P1 — полнота продукта

- Приватные адаптеры и сертификационные тесты Binance/Bybit.
- Hyperliquid adapter и отдельная модель его account/signing boundary.
- Полная нормализация P&L и trade history между провайдерами.
- Notification center: закрытие RM, неуспешное действие, потеря соединения, окончание cooldown.
- Пользовательский журнал действий с понятными причинами каждого решения RM.
- Онбординг, demo account, guided setup и проверка готовности профиля.
- Admin/support инструменты без доступа к исходным секретам.

### P2 — масштабирование и качество

- Перенос краткоживущих preview/rate-limit состояний из памяти API в Redis.
- Горизонтальное масштабирование API и worker pool.
- Контрактные тесты всех exchange adapters.
- Performance budget, frontend telemetry и accessibility review.
- Версионирование RM-политик и воспроизводимый расчёт решения по историческому snapshot.

## 5. Что именно предложил технический директор

В переписке предложены две разные идеи:

1. Solana durable nonce — пользователь заранее подписывает транзакцию, которую можно отправить позже.
2. On-chain программа — контракт проверяет RM-правила до выполнения swap, поэтому бот не обязан быть доверенной стороной.

Обе идеи технически реальны, но решают разные части задачи.

## 6. Durable nonce: что он даёт и чего не даёт

Обычная Solana-транзакция содержит recent blockhash и быстро истекает. Durable nonce заменяет его сохранённым nonce, поэтому уже собранную и подписанную транзакцию можно отправить позднее.

Это позволяет сделать такой сценарий:

1. Пользователь заранее собирает конкретную аварийную транзакцию.
2. Пользователь проверяет её и подписывает кошельком.
3. Backend хранит только сериализованную подписанную транзакцию, а не private key.
4. При наступлении заранее оговорённого условия worker отправляет именно эту транзакцию.
5. После выполнения nonce изменяется, и старую транзакцию нельзя повторить.

Критическое ограничение: подпись относится к точным байтам транзакции. Нельзя после подписи изменить token amount, адреса, маршрут Jupiter, slippage, fee payer, порядок инструкций или другие данные. Любое изменение требует новой подписи пользователя.

Для RM это означает:

- можно заранее подписать один конкретный emergency exit;
- нельзя получить универсальную подпись «закрой любую будущую позицию на нужный объём»;
- маршрут и accounts Jupiter могут потерять актуальность;
- баланс пользователя может измениться;
- nonce может быть использован или изменён другой операцией;
- неуспешное исполнение всё равно может продвинуть nonce и списать fee;
- официальная документация предупреждает, что durable nonces могут быть deprecated в будущем.

Вывод: durable nonce стоит реализовать только как изолированный proof of concept или резервный выход для фиксированного актива и количества. Строить на нём основную RM-автоматизацию не следует.

## 7. On-chain программа AntyTILT Guard

Более сильная идея — Solana-программа, которая хранит или проверяет политику пользователя и разрешает автоматическое действие только при выполнении правил.

Возможный поток:

```text
User wallet
  -> signs policy creation/update
  -> optionally grants capped SPL delegate permission

AntyTILT worker / keeper
  -> observes wallet, prices and policy state
  -> calls AntyTILT Guard when a rule is breached

AntyTILT Guard program
  -> verifies policy, limits, oracle/price freshness and allowed assets
  -> invokes Jupiter Router instructions through CPI
  -> swaps the permitted amount into the configured safe asset
  -> emits an auditable on-chain event
```

Преимущество: keeper не получает произвольный доступ. Даже если backend скомпрометирован, программа должна отклонить действие, которое не соответствует правилам и лимитам.

Но программа может гарантированно контролировать только операции, проходящие через неё. Пользователь по-прежнему может сделать прямой swap из обычного wallet UI, если его активы и authority ничем не ограничены.

Есть три модели authority:

| Модель | Где средства | Что может AntyTILT | Ограничение |
| --- | --- | --- | --- |
| Только wallet signature | В кошельке пользователя | Проверять правила до swap через AntyTILT | Нельзя автономно закрыть позже без новой подписи |
| SPL token delegate | В token account пользователя | Потратить не больше заранее разрешённого количества | Пользователь может отозвать delegate; один delegate на token account; лимит уменьшается |
| Program vault / smart account | В account, контролируемом программой | Жёстко применять политику и выполнять разрешённые действия | Smart-contract custody и обязательный аудит программы |

SPL delegation ближе всего к требованию «AntyTILT не хранит средства»: пользователь остаётся владельцем и может отозвать разрешение, а delegate имеет ограниченный allowance. Но это не абсолютная защита от обхода — пользователь может переместить средства или revoke permission.

## 8. Что уже можно сделать через Jupiter без своей программы

### Jupiter Swap V2

Подходит для обычного swap из интерфейса AntyTILT:

- AntyTILT запрашивает маршрут;
- Risk Guard проверяет swap до подписи;
- пользователь видит параметры и подписывает транзакцию кошельком;
- Jupiter выполняет и отправляет swap;
- AntyTILT сохраняет signature, quote, расчёт риска и итоговый статус.

Meta-Aggregator отдаёт готовую транзакцию и лучший доступный маршрут. Router отдаёт raw instructions и предназначен для custom transaction/CPI, поэтому именно Router понадобится будущей on-chain программе.

### Jupiter Trigger V2

Уже поддерживает:

- single trigger;
- limit order;
- stop loss и trailing stop;
- OCO — общая пара Take Profit/Stop Loss, где исполнение одного отменяет второе;
- OTOCO — условный вход, после которого активируется TP/SL;
- DCA.

Это самый быстрый путь к работающему Jupiter RM MVP. Пользователь подписывает challenge и deposit, а Jupiter затем самостоятельно отслеживает условие и исполняет swap.

Важное уточнение по хранению средств: Trigger V2 использует custodial vault, управляемый Privy. Средства не находятся у AntyTILT и AntyTILT не получает private key, но средства активного ордера переводятся из обычного кошелька в Jupiter/Privy vault. Поэтому нельзя обещать пользователю, что они всё время остаются в его исходном token account.

## 9. Рекомендуемая архитектура Jupiter для AntyTILT

### Этап A — hackathon/MVP

Название направления: **AntyTILT Guarded Execution for Jupiter**.

Состав:

1. Подключение Solana wallet без передачи seed/private key.
2. Sign-In With Solana или эквивалентный challenge-response для привязки wallet к пользователю.
3. Новая таблица `wallet_accounts` с owner pubkey, chain, environment и status.
4. Jupiter Swap V2 adapter для quote, build/order, user signing, submit/execute и confirmation.
5. Отдельный `JUPITER_SPOT` account type в общей provider architecture.
6. Портирование применимых правил RM для spot:
   - daily loss;
   - trades per day;
   - consecutive losses;
   - cooldown;
   - max exposure;
   - max open assets/positions;
   - risk per trade только при определённом entry и protective exit.
7. Обязательный preview: route, minimum received, fees, price impact, safe asset и RM result.
8. Trigger V2 OCO/OTOCO/trailing для автономных TP/SL.
9. Индексация wallet transactions и Jupiter order events в PostgreSQL.
10. Отдельный audit event на quote, подпись, submit, confirmation, trigger и cancellation.

Важно: на spot нет фьючерсной позиции в том же смысле, что на BingX. «Закрыть позицию» здесь означает обменять контролируемый risk token на заранее выбранный safe asset, например USDC. Плечо и liquidation к обычному Jupiter spot swap не применимы.

### Этап B — доказательство on-chain RM

1. Anchor/Rust программа `antytilt_guard`.
2. Policy PDA на wallet с версией, лимитами, safe mint и временными ограничениями.
3. Allowlist поддерживаемых token programs/mints и проверка decimals.
4. Проверка свежести oracle/price input и maximum slippage.
5. Capped SPL delegate или ограниченный program vault.
6. Keeper, который не хранит user private keys.
7. Jupiter Swap V2 Router/CPI для защитного swap.
8. On-chain события и off-chain reconciliation.
9. Emergency revoke/pause пользователя.
10. Независимый smart-contract audit до реальных значимых сумм.

### Этап C — полноценный anti-bypass режим

Если продукт должен не просто закрывать риск, а запрещать пользователю обходить правила через любой внешний интерфейс, нужен smart account/program vault, через который проходят все допустимые действия. Обычный self-custody wallet одновременно даёт пользователю полный контроль, поэтому AntyTILT не может криптографически запретить владельцу подписать другую прямую транзакцию.

Это продуктовый выбор, а не недоработка API:

- self-custody сохраняет свободу пользователя, но допускает bypass/revoke;
- enforced smart account обеспечивает жёсткие правила, но добавляет smart-contract custody и технический риск контракта.

## 10. Что нельзя обещать пользователю

- «Мы можем закрыть любую Jupiter-позицию без заранее выданного разрешения» — нет, нужна подпись, delegate или vault/smart account.
- «Durable nonce даёт боту постоянную подпись» — нет, он сохраняет действительность одной неизменяемой транзакции.
- «Trigger V2 полностью self-custodial» — нет, активные order funds находятся в Privy-managed vault.
- «On-chain программа контролирует все swap пользователя» — только если все операции обязаны проходить через неё или средства находятся под её authority.
- «Правила BingX можно перенести один в один» — spot, perpetual futures и margin/perps имеют разные модели позиции и риска.

## 11. Критерии готовности Jupiter MVP

MVP считается рабочим, если:

- пользователь подключает wallet и никогда не передаёт AntyTILT seed/private key;
- backend проверяет challenge/signature и связывает pubkey с нужным user ID;
- любой swap из AntyTILT проходит server-side RM preview;
- пользователь подписывает точные параметры операции;
- transaction signature и итоговый on-chain status сохраняются идемпотентно;
- повторный submit не создаёт второй swap;
- OCO/OTOCO либо trailing protection можно создать, увидеть и отменить;
- UI честно показывает, где находятся средства активного Trigger order;
- worker восстанавливает состояние после рестарта;
- stale quote, expired transaction, partial/failed order и RPC outage имеют проверенные состояния;
- тесты доказывают изоляцию двух пользователей и двух wallet accounts;
- секрет Jupiter API хранится только на сервере;
- пользователь может отключить wallet, отменить orders и отозвать on-chain permissions.

## 12. Предлагаемый ближайший backlog

Порядок, который даёт демонстрируемый результат без преждевременного smart-contract риска:

1. Зафиксировать provider interface для CEX и wallet-based DEX accounts.
2. Добавить Solana wallet auth и таблицы wallet/account/order state.
3. Реализовать read-only portfolio и transaction indexing.
4. Реализовать Jupiter Swap V2 preview с существующим Risk Guard.
5. Добавить browser-wallet signing и идемпотентный submit/confirm.
6. Добавить Trigger V2 OCO/OTOCO/trailing и ясное предупреждение о Privy vault.
7. Написать E2E для двух пользователей, reconnect и duplicate submit.
8. Сделать маленький durable-nonce spike только для проверки технической гипотезы.
9. Спроектировать Anchor policy account и threat model.
10. После review реализовать limited-delegate prototype и CPI через Jupiter Router.

## 13. Официальные источники

- [Solana Durable Nonces](https://solana.com/docs/core/transactions/durable-nonces)
- [Solana Partial Signing](https://solana.com/docs/core/transactions/partial-signing)
- [Solana Spend Permissions / SPL delegation](https://solana.com/docs/payments/advanced-payments/spend-permissions)
- [Jupiter Trigger Order API V2](https://developers.jup.ag/docs/trigger)
- [Jupiter Trigger Create Order](https://developers.jup.ag/docs/trigger/create-order)
- [Jupiter Swap V2](https://developers.jup.ag/docs/swap)

## 14. Остальная документация репозитория

- [README.md](./README.md) — запуск, возможности и основные ограничения.
- [LOCAL_DEPLOYMENT.md](./LOCAL_DEPLOYMENT.md) — локальный production-контур и Cloudflare Tunnel.
- [DEPLOYMENT.md](./DEPLOYMENT.md) — постоянное развёртывание.
- [РАБОТА_RM.md](./РАБОТА_RM.md) — детальная логика десяти RM-правил.
- [ТУДУ_ЛИСТ_РЕЛИЗ.md](./ТУДУ_ЛИСТ_РЕЛИЗ.md) — полный release checklist.
- [TODO.md](./TODO.md) — общий технический backlog.


import { Router, type IRouter } from "express";
import {
  CreateJournalEntryBody,
  GetAnalyticsResponse,
  GetDashboardResponse,
  GetPortfolioResponse,
  GetReplayResponse,
  ListInstrumentsResponse,
  ListOrdersResponse,
  ListTradesResponse,
  PerformReplayActionBody,
  PerformReplayActionResponse,
  PlaceOrderBody,
} from "@workspace/api-zod";
import { appendTradeLabEvent } from "../lib/sheetsRepository";

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Instrument = {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  change: number;
  changePct: number;
  session: string;
  description: string;
};

type Position = {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealisedPnl: number;
  returnPct: number;
  weight: number;
  stopLoss: number | null;
};

type Order = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit" | "stop";
  quantity: number;
  limitPrice?: number | null;
  stopPrice?: number | null;
  status: "executed" | "pending" | "cancelled";
  executedPrice: number | null;
  createdAt: string;
  journalStatus: "complete" | "needs_review" | "not_required";
};

type Trade = {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  realisedPnl: number;
  returnPct: number;
  reason: string | null;
  mistake: string | null;
  journalStatus: "complete" | "needs_review";
  executedAt: string;
  plannedStop?: number | null;
};

const router: IRouter = Router();
const startingCash = 1_000_000;

const seedCandles = (base: number, offset: number): Candle[] =>
  Array.from({ length: 42 }, (_, index) => {
    const wave = Math.sin((index + offset) / 2.8) * base * 0.018;
    const drift = index * base * 0.0012;
    const open = base + wave + drift;
    const close = open + Math.sin(index * 1.7 + offset) * base * 0.009;
    const high = Math.max(open, close) + base * (0.008 + (index % 3) * 0.002);
    const low = Math.min(open, close) - base * (0.007 + (index % 2) * 0.002);
    return {
      time: `2024-0${(index % 6) + 1}-${String((index % 27) + 1).padStart(2, "0")}T${String(9 + (index % 7)).padStart(2, "0")}:15:00Z`,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: 120_000 + index * 7_500 + offset * 900,
    };
  });

const marketData: Record<string, Candle[]> = {
  "TLAB": seedCandles(1_248, 2),
  "NIFTY-DEMO": seedCandles(22_180, 4),
  "RELIANCE-DEMO": seedCandles(2_964, 6),
  "INFY-DEMO": seedCandles(1_485, 8),
};

const instruments: Instrument[] = [
  {
    symbol: "TLAB",
    name: "TradeLab Index",
    exchange: "EDU",
    price: 1298.45,
    change: 18.4,
    changePct: 1.44,
    session: "Replay ready",
    description: "Fictional learning instrument with a trend-led replay set.",
  },
  {
    symbol: "NIFTY-DEMO",
    name: "NIFTY Demo",
    exchange: "EDU",
    price: 22480.2,
    change: -94.1,
    changePct: -0.42,
    session: "Replay ready",
    description: "Synthetic index data for practicing position sizing.",
  },
  {
    symbol: "RELIANCE-DEMO",
    name: "Reliance Demo",
    exchange: "EDU",
    price: 3012.75,
    change: 26.2,
    changePct: 0.88,
    session: "Replay ready",
    description: "Fictional large-cap replay data for execution drills.",
  },
  {
    symbol: "INFY-DEMO",
    name: "INFY Demo",
    exchange: "EDU",
    price: 1518.35,
    change: 7.6,
    changePct: 0.5,
    session: "Replay ready",
    description: "Synthetic technology instrument for journaling practice.",
  },
];

let cash = startingCash;
let replaySymbol = "TLAB";
let replayIndex = 24;
let replayPlaying = false;
let replaySpeed = 1;
let orderSequence = 1004;
let tradeSequence = 3;
const positions = new Map<string, Position>();
const orders: Order[] = [
  {
    id: "ORD-1003",
    symbol: "TLAB",
    side: "buy",
    orderType: "market",
    quantity: 120,
    executedPrice: 1248.25,
    status: "executed",
    createdAt: "2024-05-22T09:30:00Z",
    journalStatus: "complete",
  },
];
const trades: Trade[] = [
  {
    id: "TRD-0002",
    symbol: "TLAB",
    side: "sell",
    entryPrice: 1216.5,
    exitPrice: 1264.75,
    quantity: 80,
    realisedPnl: 3860,
    returnPct: 4.97,
    reason: "Breakout",
    mistake: null,
    journalStatus: "complete",
    executedAt: "2024-05-21T11:10:00Z",
    plannedStop: 1198,
  },
  {
    id: "TRD-0001",
    symbol: "INFY-DEMO",
    side: "sell",
    entryPrice: 1488.2,
    exitPrice: 1469.9,
    quantity: 65,
    realisedPnl: -1189.5,
    returnPct: -1.23,
    reason: "FOMO",
    mistake: "Entered without a stop",
    journalStatus: "complete",
    executedAt: "2024-05-17T13:45:00Z",
    plannedStop: null,
  },
];

const now = () => new Date().toISOString();
const currentCandle = () => marketData[replaySymbol][replayIndex] ?? marketData[replaySymbol].at(-1)!;
const currentPrice = () => currentCandle().close;
const currentInstrument = () => instruments.find((item) => item.symbol === replaySymbol)!;

const portfolio = () => {
  const currentPositions = [...positions.values()].map((position) => {
    const livePrice = position.symbol === replaySymbol ? currentPrice() : position.currentPrice;
    const marketValue = livePrice * position.quantity;
    const unrealisedPnl = (livePrice - position.averagePrice) * position.quantity;
    return {
      ...position,
      currentPrice: Number(livePrice.toFixed(2)),
      marketValue: Number(marketValue.toFixed(2)),
      unrealisedPnl: Number(unrealisedPnl.toFixed(2)),
      returnPct: Number(((unrealisedPnl / (position.averagePrice * position.quantity)) * 100).toFixed(2)),
    };
  });
  const investedValue = currentPositions.reduce((sum, position) => sum + position.marketValue, 0);
  const unrealisedPnl = currentPositions.reduce((sum, position) => sum + position.unrealisedPnl, 0);
  const realisedPnl = trades.reduce((sum, trade) => sum + trade.realisedPnl, 0);
  const equity = cash + investedValue;
  return {
    cash: Number(cash.toFixed(2)),
    equity: Number(equity.toFixed(2)),
    investedValue: Number(investedValue.toFixed(2)),
    realisedPnl: Number(realisedPnl.toFixed(2)),
    unrealisedPnl: Number(unrealisedPnl.toFixed(2)),
    positions: currentPositions.map((position) => ({
      ...position,
      weight: equity ? Number(((position.marketValue / equity) * 100).toFixed(2)) : 0,
    })),
  };
};

const replayState = () => {
  const candles = marketData[replaySymbol].slice(0, replayIndex + 1);
  return {
    symbol: replaySymbol,
    instrumentName: currentInstrument().name,
    replayDate: currentCandle().time,
    currentPrice: currentPrice(),
    previousClose: candles.at(-2)?.close ?? currentCandle().open,
    isPlaying: replayPlaying,
    speed: replaySpeed,
    candleIndex: replayIndex,
    totalCandles: marketData[replaySymbol].length,
    candles,
  };
};

const analytics = () => {
  const closed = trades.filter((trade) => trade.exitPrice !== null);
  const wins = closed.filter((trade) => trade.realisedPnl > 0);
  const losses = closed.filter((trade) => trade.realisedPnl < 0);
  const totalWinningPnl = wins.reduce((sum, trade) => sum + trade.realisedPnl, 0);
  const totalLosingPnl = losses.reduce((sum, trade) => sum + trade.realisedPnl, 0);
  const averageWin = wins.length ? totalWinningPnl / wins.length : 0;
  const averageLoss = losses.length ? totalLosingPnl / losses.length : 0;
  const byReason = [...new Set(closed.map((trade) => trade.reason).filter(Boolean))].map((reason) => ({
    reason: reason as string,
    pnl: Number(closed.filter((trade) => trade.reason === reason).reduce((sum, trade) => sum + trade.realisedPnl, 0).toFixed(2)),
  }));
  return {
    totalTrades: closed.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    winRate: closed.length ? Number(((wins.length / closed.length) * 100).toFixed(2)) : 0,
    totalRealisedPnl: Number((totalWinningPnl + totalLosingPnl).toFixed(2)),
    averageWin: Number(averageWin.toFixed(2)),
    averageLoss: Number(averageLoss.toFixed(2)),
    riskReward: averageLoss ? Number((averageWin / Math.abs(averageLoss)).toFixed(2)) : 0,
    profitFactor: totalLosingPnl ? Number((totalWinningPnl / Math.abs(totalLosingPnl)).toFixed(2)) : 0,
    largestWin: wins.length ? Math.max(...wins.map((trade) => trade.realisedPnl)) : 0,
    largestLoss: losses.length ? Math.min(...losses.map((trade) => trade.realisedPnl)) : 0,
    averageHoldingHours: 18.4,
    maxDrawdown: -2.14,
    plannedStopPct: closed.length ? Number(((closed.filter((trade) => trade.plannedStop).length / closed.length) * 100).toFixed(2)) : 0,
    equityCurve: [
      { date: "May 17", equity: 1_000_000 },
      { date: "May 18", equity: 1_004_200 },
      { date: "May 19", equity: 1_001_800 },
      { date: "May 20", equity: 1_006_900 },
      { date: "May 21", equity: 1_008_900 },
      { date: "May 22", equity: portfolio().equity },
    ],
    pnlByReason: byReason,
  };
};

router.get("/dashboard", (_req, res) => {
  const currentPortfolio = portfolio();
  const currentAnalytics = analytics();
  const data = {
    portfolio: currentPortfolio,
    winRate: currentAnalytics.winRate,
    drawdown: currentAnalytics.maxDrawdown,
    openPositions: currentPortfolio.positions.length,
    activeReplay: replayState(),
    recentTrades: trades,
    insights: [
      "Your breakout trades currently have a higher win rate than your FOMO trades.",
      "You planned stops on 50% of closed trades. Try making risk visible before every entry.",
      "Your strongest result so far came from the Breakout reason tag.",
    ],
  };
  res.json(GetDashboardResponse.parse(data));
});

router.get("/instruments", (_req, res) => res.json(ListInstrumentsResponse.parse(instruments)));

router.get("/replay", (_req, res) => res.json(GetReplayResponse.parse(replayState())));

router.post("/replay/action", (req, res) => {
  const parsed = PerformReplayActionBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Choose a valid replay action." }) as never;
  const { action, speed, symbol } = parsed.data;
  if (symbol && marketData[symbol]) {
    replaySymbol = symbol;
    replayIndex = 24;
  }
  if (speed) replaySpeed = speed;
  if (action === "play") replayPlaying = true;
  if (action === "pause") replayPlaying = false;
  if (action === "restart") {
    replayIndex = 8;
    replayPlaying = false;
  }
  if (action === "next") {
    replayIndex = Math.min(replayIndex + 1, marketData[replaySymbol].length - 1);
    replayPlaying = false;
  }
  return res.json(PerformReplayActionResponse.parse(replayState())) as never;
});

router.get("/portfolio", (_req, res) => res.json(GetPortfolioResponse.parse(portfolio())));
router.get("/orders", (_req, res) => res.json(ListOrdersResponse.parse(orders)));
router.get("/trades", (_req, res) => res.json(ListTradesResponse.parse(trades)));

router.post("/orders", (req, res) => {
  const parsed = PlaceOrderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a whole-number quantity and a valid order type." }) as never;
  const input = parsed.data;
  const price = currentPrice();
  if (!marketData[input.symbol]) return res.status(400).json({ error: "That instrument is not available in the educational dataset." }) as never;
  const position = positions.get(input.symbol);
  if (input.side === "buy" && input.orderType === "market" && cash < price * input.quantity) {
    return res.status(400).json({ error: "Insufficient available cash for this simulated order." }) as never;
  }
  if (input.side === "sell" && (!position || position.quantity < input.quantity)) {
    return res.status(400).json({ error: "You do not have enough simulated shares to sell." }) as never;
  }
  const canExecute = input.orderType === "market";
  const order: Order = {
    id: `ORD-${orderSequence++}`,
    ...input,
    status: canExecute ? "executed" : "pending",
    executedPrice: canExecute ? price : null,
    createdAt: now(),
    journalStatus: canExecute ? "needs_review" : "not_required",
  };
  orders.unshift(order);
  if (canExecute) {
    if (input.side === "buy") {
      const previous = position?.quantity ?? 0;
      const averagePrice = position
        ? ((position.averagePrice * previous) + price * input.quantity) / (previous + input.quantity)
        : price;
      cash -= price * input.quantity;
      positions.set(input.symbol, {
        symbol: input.symbol,
        name: currentInstrument().name,
        quantity: previous + input.quantity,
        averagePrice,
        currentPrice: price,
        marketValue: price * (previous + input.quantity),
        unrealisedPnl: 0,
        returnPct: 0,
        weight: 0,
        stopLoss: input.stopPrice ?? null,
      });
    } else {
      const heldPosition = position!;
      const averagePrice = heldPosition.averagePrice;
      cash += price * input.quantity;
      const realisedPnl = (price - averagePrice) * input.quantity;
      trades.unshift({
        id: `TRD-${String(tradeSequence++).padStart(4, "0")}`,
        symbol: input.symbol,
        side: "sell",
        entryPrice: averagePrice,
        exitPrice: price,
        quantity: input.quantity,
        realisedPnl,
        returnPct: (realisedPnl / (averagePrice * input.quantity)) * 100,
        reason: null,
        mistake: null,
        journalStatus: "needs_review",
        executedAt: now(),
        plannedStop: null,
      });
      const remaining = heldPosition.quantity - input.quantity;
      if (remaining) positions.set(input.symbol, { ...heldPosition, quantity: remaining });
      else positions.delete(input.symbol);
    }
    const buyTrade: Trade = {
      id: `TRD-${String(tradeSequence++).padStart(4, "0")}`,
      symbol: input.symbol,
      side: input.side,
      entryPrice: price,
      exitPrice: input.side === "sell" ? price : null,
      quantity: input.quantity,
      realisedPnl: 0,
      returnPct: 0,
      reason: null,
      mistake: null,
      journalStatus: "needs_review",
      executedAt: now(),
      plannedStop: input.stopPrice ?? null,
    };
    if (input.side === "buy") trades.unshift(buyTrade);
    void appendTradeLabEvent({
      type: "order",
      id: order.id,
      symbol: input.symbol,
      user: "demo-trader",
      payload: JSON.stringify(order),
      createdAt: order.createdAt,
    });
  }
  return res.status(201).json(order) as never;
});

router.post("/journal", (req, res) => {
  const parsed = CreateJournalEntryBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A reason, confidence score, and notes are required." }) as never;
  const trade = trades.find((item) => item.id === parsed.data.tradeId);
  if (!trade) return res.status(404).json({ error: "Trade not found." }) as never;
  trade.reason = parsed.data.reason;
  trade.mistake = parsed.data.mistake ?? null;
  trade.plannedStop = parsed.data.plannedStop ?? null;
  trade.journalStatus = "complete";
  const order = orders.find((item) => item.symbol === trade.symbol && item.journalStatus === "needs_review");
  if (order) order.journalStatus = "complete";
  void appendTradeLabEvent({
    type: "journal",
    id: trade.id,
    symbol: trade.symbol,
    user: "demo-trader",
    payload: JSON.stringify(parsed.data),
    createdAt: now(),
  });
  return res.status(201).json({ id: `JRN-${trade.id}`, ...parsed.data, createdAt: now() }) as never;
});

router.get("/analytics", (_req, res) => res.json(GetAnalyticsResponse.parse(analytics())));

export default router;
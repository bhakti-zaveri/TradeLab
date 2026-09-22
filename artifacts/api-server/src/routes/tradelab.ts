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
import { requireAuth } from "../middlewares/auth";
import { db } from "@workspace/db";
import { accounts, positions, orders, trades } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

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

const router: IRouter = Router();

// --- IN-MEMORY MARKET DATA FOR REPLAY ---
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

const marketData: Record<string, Candle[]> = {};
const instruments: Instrument[] = [];

const createInstrument = (
  symbol: string,
  name: string,
  price: number,
  change: number,
  desc: string,
) => {
  instruments.push({
    symbol,
    name,
    exchange: "SIM",
    price,
    change,
    changePct: Number(((change / price) * 100).toFixed(2)),
    session: "regular",
    description: desc,
  });
  marketData[symbol] = seedCandles(price, instruments.length * 4);
};

createInstrument("RELIANCE", "Reliance Industries", 2954.2, 12.5, "Heavyweight Indian conglomerate. Expect steady institutional flow.");
createInstrument("TCS", "Tata Consultancy Services", 4125.8, -15.4, "Leading IT services. Slower price action and range-bound behavior.");
createInstrument("HDFCBANK", "HDFC Bank Ltd.", 1642.1, 8.2, "Banking sector proxy. Watch for breakout failures and moving average support.");
createInstrument("INFY", "Infosys Limited", 1892.4, -2.1, "High volume IT stock. Prone to gap downs and slow grinds.");
createInstrument("NIFTY-50", "Nifty 50 Index", 24350.5, 115.2, "Broad market Indian index. Highly liquid and volatile.");

let replaySymbol = "RELIANCE";
let replayIndex = 24;
let replayPlaying = false;
let replaySpeed = 1;

const now = () => new Date().toISOString();
const currentCandle = () => marketData[replaySymbol]?.[replayIndex] ?? null;
const currentPrice = () => currentCandle()?.close ?? 0;
const currentInstrument = () => instruments.find((item) => item.symbol === replaySymbol);

// Apply auth middleware to all routes
router.use(requireAuth);

const getPortfolio = async (accountId: string) => {
  const account = await db.query.accounts.findFirst({ where: eq(accounts.id, accountId) });
  if (!account) throw new Error("Account not found");

  const allPositions = await db.query.positions.findMany({ where: eq(positions.accountId, accountId) });
  const allTrades = await db.query.trades.findMany({ where: eq(trades.accountId, accountId) });
  
  const currentPositions = allPositions.map((position) => {
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
  const realisedPnl = allTrades.reduce((sum, trade) => sum + trade.realisedPnl, 0);
  const equity = account.balance + investedValue;

  return {
    cash: Number(account.balance.toFixed(2)),
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
  const candles = marketData[replaySymbol]?.slice(0, replayIndex + 1) ?? [];
  return {
    symbol: replaySymbol,
    instrumentName: currentInstrument()?.name ?? "",
    replayDate: currentCandle()?.time ?? now(),
    currentPrice: currentPrice(),
    previousClose: candles.at(-2)?.close ?? currentCandle()?.open ?? 0,
    isPlaying: replayPlaying,
    speed: replaySpeed,
    candleIndex: replayIndex,
    totalCandles: marketData[replaySymbol]?.length ?? 0,
    candles,
  };
};

const getAnalytics = async (accountId: string) => {
  const allTrades = await db.query.trades.findMany({ where: eq(trades.accountId, accountId) });
  const closed = allTrades.filter((trade) => trade.exitPrice !== null);
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

  // Build equity curve and calculate max drawdown
  let runningEquity = 1000000;
  let peakEquity = runningEquity;
  let maxDrawdownPct = 0;
  const equityCurve = [];
  
  // Sort closed trades by execution date chronologically
  const sortedTrades = [...closed].sort((a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime());
  
  for (const trade of sortedTrades) {
    runningEquity += trade.realisedPnl;
    if (runningEquity > peakEquity) peakEquity = runningEquity;
    
    const drawdownPct = ((peakEquity - runningEquity) / peakEquity) * 100;
    if (drawdownPct > maxDrawdownPct) maxDrawdownPct = drawdownPct;
    
    equityCurve.push({
      date: trade.executedAt,
      equity: Number(runningEquity.toFixed(2))
    });
  }
  
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
    averageHoldingHours: 1.2, // Mocked for now as we don't store entry time separately
    maxDrawdown: Number((-maxDrawdownPct).toFixed(2)),
    plannedStopPct: closed.length ? Number(((closed.filter((trade) => trade.plannedStop).length / closed.length) * 100).toFixed(2)) : 0,
    equityCurve,
    pnlByReason: byReason,
  };
};

router.get("/dashboard", async (req, res) => {
  const accountId = (req as any).account.id;
  const currentPortfolio = await getPortfolio(accountId);
  const currentAnalytics = await getAnalytics(accountId);
  const recentTrades = await db.query.trades.findMany({ 
    where: eq(trades.accountId, accountId), 
    orderBy: [desc(trades.executedAt)],
    limit: 5
  });

  const data = {
    portfolio: currentPortfolio,
    winRate: currentAnalytics.winRate,
    drawdown: currentAnalytics.maxDrawdown,
    openPositions: currentPortfolio.positions.length,
    activeReplay: replayState(),
    recentTrades,
    insights: [],
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
    replayIndex = Math.min(replayIndex + 1, (marketData[replaySymbol]?.length ?? 1) - 1);
    replayPlaying = false;
  }
  return res.json(PerformReplayActionResponse.parse(replayState())) as never;
});

router.get("/portfolio", async (req, res) => {
  const accountId = (req as any).account.id;
  res.json(GetPortfolioResponse.parse(await getPortfolio(accountId)));
});

router.get("/orders", async (req, res) => {
  const accountId = (req as any).account.id;
  const allOrders = await db.query.orders.findMany({ where: eq(orders.accountId, accountId), orderBy: [desc(orders.createdAt)] });
  res.json(ListOrdersResponse.parse(allOrders));
});

router.get("/trades", async (req, res) => {
  const accountId = (req as any).account.id;
  const allTrades = await db.query.trades.findMany({ where: eq(trades.accountId, accountId), orderBy: [desc(trades.executedAt)] });
  res.json(ListTradesResponse.parse(allTrades));
});

router.post("/orders", async (req, res) => {
  const parsed = PlaceOrderBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a whole-number quantity and a valid order type." }) as never;
  const input = parsed.data;
  const accountId = (req as any).account.id;
  let cash = (req as any).account.balance;
  
  const price = currentPrice();
  if (!marketData[input.symbol]) return res.status(400).json({ error: "That instrument is not available in the educational dataset." }) as never;
  
  const position = await db.query.positions.findFirst({ where: eq(positions.symbol, input.symbol) });
  
  if (!input.stopPrice) {
    return res.status(400).json({ error: "A stop-loss is mandatory. Calculate your risk before entering." }) as never;
  }

  const riskPerShare = input.side === "buy" ? price - input.stopPrice : input.stopPrice - price;
  if (riskPerShare <= 0) {
    return res.status(400).json({ error: "Stop-loss must be below entry for longs and above entry for shorts." }) as never;
  }

  const totalRisk = riskPerShare * input.quantity;

  if (input.side === "buy" && input.orderType === "market" && cash < price * input.quantity) {
    return res.status(400).json({ error: "Insufficient available cash for this simulated order." }) as never;
  }
  if (input.side === "sell" && (!position || position.quantity < input.quantity)) {
    return res.status(400).json({ error: "You do not have enough simulated shares to sell." }) as never;
  }
  
  const canExecute = input.orderType === "market";
  const orderId = `ORD-${crypto.randomUUID()}`;
  
  const orderData = {
    id: orderId,
    accountId,
    ...input,
    status: canExecute ? "executed" : "pending",
    executedPrice: canExecute ? price : null,
    createdAt: now(),
  } as any;
  
  await db.insert(orders).values(orderData);
  
  if (canExecute) {
    if (input.side === "buy") {
      const previous = position?.quantity ?? 0;
      const averagePrice = position
        ? ((position.averagePrice * previous) + price * input.quantity) / (previous + input.quantity)
        : price;
        
      cash -= price * input.quantity;
      await db.update(accounts).set({ balance: cash }).where(eq(accounts.id, accountId));
      
      if (position) {
        await db.update(positions).set({ quantity: previous + input.quantity, averagePrice, currentPrice: price }).where(eq(positions.id, position.id));
      } else {
        await db.insert(positions).values({
          id: crypto.randomUUID(),
          accountId,
          symbol: input.symbol,
          name: currentInstrument()?.name ?? "",
          quantity: input.quantity,
          averagePrice,
          currentPrice: price,
          stopLoss: input.stopPrice ?? null,
        });
      }
      
      await db.insert(trades).values({
        id: `TRD-${crypto.randomUUID()}`,
        accountId,
        symbol: input.symbol,
        side: input.side,
        entryPrice: price,
        exitPrice: null,
        quantity: input.quantity,
        realisedPnl: 0,
        returnPct: 0,
        reason: null,
        mistake: null,
        journalStatus: "needs_review",
        executedAt: now(),
        plannedStop: input.stopPrice ?? null,
      });
      
    } else {
      const heldPosition = position!;
      const averagePrice = heldPosition.averagePrice;
      cash += price * input.quantity;
      await db.update(accounts).set({ balance: cash }).where(eq(accounts.id, accountId));
      
      const realisedPnl = (price - averagePrice) * input.quantity;
      await db.insert(trades).values({
        id: `TRD-${crypto.randomUUID()}`,
        accountId,
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
      if (remaining > 0) {
        await db.update(positions).set({ quantity: remaining }).where(eq(positions.id, heldPosition.id));
      } else {
        await db.delete(positions).where(eq(positions.id, heldPosition.id));
      }
    }
  }
  
  return res.status(201).json(orderData) as never;
});

router.post("/journal", async (req, res) => {
  const parsed = CreateJournalEntryBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A reason, confidence score, and notes are required." }) as never;
  const accountId = (req as any).account.id;
  const trade = await db.query.trades.findFirst({ where: eq(trades.id, parsed.data.tradeId) });
  
  if (!trade || trade.accountId !== accountId) return res.status(404).json({ error: "Trade not found." }) as never;
  
  await db.update(trades).set({
    reason: parsed.data.reason,
    mistake: parsed.data.mistake ?? null,
    confidence: parsed.data.confidence ?? null,
    plannedStop: parsed.data.plannedStop ?? null,
    journalStatus: "complete"
  }).where(eq(trades.id, trade.id));
  
  return res.status(201).json({ id: `JRN-${trade.id}`, ...parsed.data, createdAt: now() }) as never;
});

router.get("/analytics", async (req, res) => {
  const accountId = (req as any).account.id;
  res.json(GetAnalyticsResponse.parse(await getAnalytics(accountId)));
});

export default router;
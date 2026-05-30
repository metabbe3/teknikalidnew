import { stockRepository } from "./stock.repository";
import { decimalToNumber } from "@/lib/serialize";
import { getIO } from "@/lib/socket";
import { INTERVAL, SIGNALS, RSI_THRESHOLDS } from "@/lib/constants";

interface StockAlert {
  type: string;
  message: string;
}

export const stockAlertService = {
  async checkAlerts(tickers: string[]) {
    for (const ticker of tickers) {
      try {
        const stock = await stockRepository.findStockByTicker(ticker);
        if (!stock) continue;

        const indicator = await stockRepository.findLatestIndicator(
          stock.id,
          INTERVAL.DAY
        );
        if (!indicator) continue;

        const alerts: StockAlert[] = [];
        const rsi14 = decimalToNumber(indicator.rsi14);

        if (rsi14 !== null) {
          if (rsi14 > RSI_THRESHOLDS.OVERBOUGHT)
            alerts.push({
              type: "RSI_OVERBOUGHT",
              message: `RSI ${rsi14.toFixed(0)} — Overbought`,
            });
          if (rsi14 < RSI_THRESHOLDS.OVERSOLD)
            alerts.push({
              type: "RSI_OVERSOLD",
              message: `RSI ${rsi14.toFixed(0)} — Oversold`,
            });
        }

        if (indicator.smaCrossSignal) {
          alerts.push({
            type: "SMA_CROSS",
            message:
              indicator.smaCrossSignal === SIGNALS.SMA_CROSS.GOLDEN
                ? "Golden Cross"
                : "Death Cross",
          });
        }

        if (indicator.emaCrossSignal) {
          alerts.push({
            type: "EMA_CROSS",
            message:
              indicator.emaCrossSignal === SIGNALS.EMA_CROSS.BULLISH
                ? "EMA Bullish Cross"
                : "EMA Bearish Cross",
          });
        }

        if (alerts.length > 0) {
          getIO()
            .to(`stock:${ticker}`)
            .emit("stock-alert", { ticker, alerts });
        }
      } catch (error) {
        console.error(`[StockAlert] ${ticker}:`, error);
      }
    }
  },
};

export const BOT_CONFIG = {
  USERNAME: "teknikal_robo",
  EMAIL: "bot+robo@teknikalid.id",
  NAME: "Teknikal Robo",
  BIO: "Robot analisis teknikal otomatis TeknikalID. Sharing insight saham IDX setiap hari.",
  CUSTOM_TITLE: "Robo Analyst",

  MAX_POSTS_PER_DAY: 0,
  MAX_REPLIES_PER_DAY: 0,
  MAX_AI_CALLS_PER_RUN: 0,
  MAX_POSTS_PER_RUN: 0,
  MAX_REPLIES_PER_RUN: 0,

  RSI_EXTREME_LOW: 25,
  RSI_EXTREME_HIGH: 80,
  RSI_OVERSOLD: 30,
  RSI_OVERBOUGHT: 70,
  VOLUME_SPIKE_MULTIPLIER: 3,
  SIGNAL_SCORE_THRESHOLD: 0.5,
} as const;

export const POST_TYPE = {
  RSI_EXTREME: "rsi_extreme",
  CROSSOVER: "crossover",
  VOLUME_SPIKE: "volume_spike",
  GORENGAN: "gorengan",
  SIGNAL_SCORE: "signal_score",
  MARKET_PULSE: "market_pulse",
  RANDOM_INSIGHT: "random_insight",
} as const;

export type PostType = typeof POST_TYPE[keyof typeof POST_TYPE];

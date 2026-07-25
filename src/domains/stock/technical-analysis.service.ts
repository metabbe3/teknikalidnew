import { indicatorService } from "./indicator.service";
import { screenerAnalysisService } from "./screener-analysis.service";
import { marketStructureService } from "./market-structure.service";

// Backwards-compatible unified service object
export const technicalAnalysisService = {
  ...indicatorService,
  ...screenerAnalysisService,
  ...marketStructureService,
};

// Re-export types and utilities that were previously exported
export type { PresetKey } from "./indicator.service";
export { computeSignalScore, detectGorengan } from "./indicator.service";
export { detectCrossover, buildIndicatorWhere, EMPTY_INDICATOR_RESULT, VOLUME_SPIKE_MULTIPLIER, VALID_PRESETS } from "./indicator.service";
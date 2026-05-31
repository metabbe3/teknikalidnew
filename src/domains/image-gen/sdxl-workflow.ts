export function buildSDXLWorkflow(params: {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  filenamePrefix: string;
}): object {
  const seed = params.seed ?? Math.floor(Math.random() * 2147483647);

  return {
    "4": {
      inputs: { ckpt_name: "sd_xl_base_1.0.safetensors" },
      class_type: "CheckpointLoaderSimple",
    },
    "5": {
      inputs: {
        width: params.width ?? 1024,
        height: params.height ?? 1024,
        batch_size: 1,
      },
      class_type: "EmptyLatentImage",
    },
    "6": {
      inputs: {
        text: params.prompt,
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "7": {
      inputs: {
        text:
          params.negativePrompt ??
          "blurry, low quality, distorted, text, watermark, ugly, deformed, noisy",
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "10": {
      inputs: {
        seed,
        steps: 20,
        cfg: 7.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
      class_type: "KSampler",
    },
    "12": {
      inputs: {
        samples: ["10", 0],
        vae: ["4", 2],
      },
      class_type: "VAEDecode",
    },
    "13": {
      inputs: {
        filename_prefix: params.filenamePrefix,
        images: ["12", 0],
      },
      class_type: "SaveImage",
    },
  };
}

const STYLE_PREFIX =
  "professional financial illustration, stock market visualization, clean modern design, abstract, no text, no words";

export function buildAutoPrompt(
  content: string,
  tickerTag?: string | null
): string {
  let prompt = STYLE_PREFIX;

  if (tickerTag) {
    prompt += `, Indonesian stock exchange, ${tickerTag.replace(".JK", "")}`;
  }

  const bullish = /\bbullish\b|\bnaik\b|\bbeli\b|\bgreen\b/i.test(content);
  const bearish = /\bbearish\b|\bturun\b|\bjual\b|\bred\b/i.test(content);

  if (bullish) {
    prompt += ", upward trend, green candlesticks, growth chart";
  } else if (bearish) {
    prompt += ", downward trend, red candlesticks, decline chart";
  }

  if (prompt.length > 500) {
    prompt = prompt.slice(0, 500);
  }

  return prompt;
}

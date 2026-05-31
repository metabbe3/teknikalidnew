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
    "1": {
      inputs: {
        unet_name: "z_image_turbo_bf16.safetensors",
        weight_dtype: "default",
      },
      class_type: "UNETLoader",
    },
    "2": {
      inputs: {
        clip_name: "qwen_3_4b.safetensors",
        type: "sd3",
      },
      class_type: "CLIPLoader",
    },
    "3": {
      inputs: { vae_name: "ae.safetensors" },
      class_type: "VAELoader",
    },
    "4": {
      inputs: {
        width: params.width ?? 1024,
        height: params.height ?? 1024,
        batch_size: 1,
      },
      class_type: "EmptyLatentImage",
    },
    "5": {
      inputs: {
        text: params.prompt,
        clip: ["2", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "7": {
      inputs: {
        seed,
        steps: 4,
        cfg: 1.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1,
        model: ["1", 0],
        positive: ["5", 0],
        negative: ["5", 0],
        latent_image: ["4", 0],
      },
      class_type: "KSampler",
    },
    "8": {
      inputs: {
        samples: ["7", 0],
        vae: ["3", 0],
      },
      class_type: "VAEDecode",
    },
    "9": {
      inputs: {
        filename_prefix: params.filenamePrefix,
        images: ["8", 0],
      },
      class_type: "SaveImage",
    },
  };
}

const BASE_STYLE =
  "cinematic 4K, ultra detailed, dark moody atmosphere, dramatic volumetric lighting, no text, no words, no letters, no writing";

export function buildAutoPrompt(
  content: string,
  tickerTag?: string | null
): string {
  const bullish = /\bbullish\b|\bnaik\b|\bbeli\b|\bgreen\b/i.test(content);
  const bearish = /\bbearish\b|\bturun\b|\bjual\b|\bred\b/i.test(content);

  let subject: string;
  let setting: string;
  let lighting: string;
  let composition: string;

  if (bullish) {
    subject =
      "explosive upward surge of glowing neon-green energy beams piercing through darkness";
    setting = tickerTag
      ? `Indonesian stock exchange trading floor for ${tickerTag.replace(".JK", "")}, abstract financial battlefield`
      : "abstract financial battlefield, stock market trading arena";
    lighting =
      "intense neon green and electric blue rim lighting, orange and gold highlights, high contrast dark void background";
    composition =
      "low angle looking up at surging light, large negative space on right third for text overlay, cinematic wide shot";
  } else if (bearish) {
    subject =
      "cascading crimson data streams collapsing into an abyss, shattering crystal structures falling through darkness";
    setting = tickerTag
      ? `Indonesian stock market crash scene for ${tickerTag.replace(".JK", "")}, crumbling financial monuments`
      : "crumbling financial monuments, collapsing stock market architecture";
    lighting =
      "blood red and deep black dominant, harsh orange warning glow, ominous shadows, extreme contrast";
    composition =
      "dramatic dutch angle, subject falling through frame, negative space in upper left for text overlay, cinematic tension";
  } else {
    subject =
      "tense face-off between two opposing forces of light and shadow, frozen moment of decision";
    setting = tickerTag
      ? `Indonesian financial crossroads for ${tickerTag.replace(".JK", "")}, dramatic split-world composition`
      : "dramatic split-world composition, financial crossroads at twilight";
    lighting =
      "split lighting — warm amber on one side, cold steel blue on the other, dramatic chiaroscuro, volumetric fog";
    composition =
      "symmetrical tension, subject off-center left, large negative space on right for text overlay, cinematic medium shot";
  }

  const prompt = `${subject}, ${setting}, ${lighting}, ${composition}, ${BASE_STYLE}`;

  if (prompt.length > 500) {
    return prompt.slice(0, 500);
  }

  return prompt;
}

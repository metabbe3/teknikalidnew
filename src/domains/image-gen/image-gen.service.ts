import path from "path";
import { imageGenRepository } from "./image-gen.repository";
import { submitWorkflow, getJobStatus, getImageUrl, downloadImage } from "./comfyui-client";
import { buildSDXLWorkflow, buildAutoPrompt } from "./sdxl-workflow";
import { compressToWebP } from "./compress";
import {
  ComfyUIUnavailableError,
  InvalidPromptError,
  ImageJobNotFoundError,
} from "./image-gen.errors";
import { createAIProvider } from "@/domains/article/ai-provider";

const COMFYUI_OUTPUT_DIR =
  process.env.COMFYUI_OUTPUT_DIR ||
  path.resolve(process.cwd(), "../../ComfyUI/output");

export const imageGenService = {
  async startGeneration(
    userId: string,
    params: {
      prompt?: string;
      source: "manual" | "auto";
      content?: string;
      tickerTag?: string | null;
    }
  ) {
    let prompt: string;

    if (params.source === "auto" && params.content) {
      prompt = await buildAIPrompt(params.content, params.tickerTag);
    } else if (params.source === "auto") {
      prompt = buildAutoPrompt(params.content ?? "", params.tickerTag);
    } else {
      prompt = params.prompt ?? "";
    }

    if (!prompt || prompt.length > 2000) {
      throw new InvalidPromptError();
    }

    const job = await imageGenRepository.createJob({
      prompt,
      source: params.source,
      requestedBy: userId,
    });

    try {
      const workflow = buildSDXLWorkflow({
        prompt,
        filenamePrefix: `teknikalid_${job.id}`,
      });

      const { promptId } = await submitWorkflow(workflow, "teknikalid-server");

      await imageGenRepository.updateJobStatus(job.id, {
        status: "processing",
        comfyuiPromptId: promptId,
      });
    } catch (err) {
      await imageGenRepository.updateJobStatus(job.id, {
        status: "failed",
        error:
          err instanceof Error ? err.message : "Failed to submit to ComfyUI",
      });

      throw new ComfyUIUnavailableError();
    }

    return { jobId: job.id };
  },

  async getJobStatus(jobId: string, userId: string) {
    const job = await imageGenRepository.findJobById(jobId);
    if (!job || job.requestedBy !== userId) {
      throw new ImageJobNotFoundError();
    }

    if (job.status === "completed") {
      return {
        status: "completed" as const,
        imageUrl: job.imageUrl,
      };
    }

    if (job.status === "failed") {
      return {
        status: "failed" as const,
        error: job.error,
      };
    }

    // Poll ComfyUI for the current status
    if (job.comfyuiPromptId) {
      try {
        const comfyResult = await getJobStatus(job.comfyuiPromptId);

        if (comfyResult.status === "completed" && comfyResult.outputs) {
          const imagesOutput = Object.values(comfyResult.outputs).find(
            (o) => o.images && o.images.length > 0
          );
          const image = imagesOutput?.images?.[0];

          if (image) {
            const localPath = await downloadImage(image.filename, COMFYUI_OUTPUT_DIR);
            const webpFilename = await compressToWebP(localPath);
            const imageUrl = await getImageUrl(webpFilename);

            await imageGenRepository.updateJobStatus(job.id, {
              status: "completed",
              outputFilename: webpFilename,
              imageUrl,
              completedAt: new Date(),
            });

            return { status: "completed" as const, imageUrl };
          }
        }

        if (comfyResult.status === "failed") {
          await imageGenRepository.updateJobStatus(job.id, {
            status: "failed",
            error: comfyResult.error || "Generation failed",
            completedAt: new Date(),
          });

          return {
            status: "failed" as const,
            error: comfyResult.error,
          };
        }
      } catch {
        // ComfyUI unreachable — keep polling
      }
    }

    return { status: job.status as "pending" | "processing" };
  },

  buildAutoPrompt(content: string, tickerTag?: string | null): string {
    return buildAutoPrompt(content, tickerTag);
  },
};

async function buildAIPrompt(
  title: string,
  tickerTag?: string | null
): Promise<string> {
  try {
    const provider = createAIProvider();
    const response = await provider.generateImagePrompt(
      `Article title: "${title}"${tickerTag ? ` | Stock: ${tickerTag}` : ""}`,
      `You are a thumbnail psychologist. Generate a scroll-stopping image prompt for a financial article cover image.

Use this exact formula: [Subject + Exaggerated Emotion] + [Setting/Context] + [Lighting & Colors] + [Composition / Negative Space]

Rules:
- HIGH CONTRAST: Use complementary color pairs (blue/orange, green/red, cyan/magenta) against dark backgrounds
- EMOTION: The image must evoke urgency, tension, or excitement — never calm or boring
- COMPOSITION: Leave large negative space on one side for text overlay, use cinematic angles (low angle, dutch angle)
- LIGHTING: Dramatic volumetric lighting, rim lights, neon glow, chiaroscuro — never flat lighting
- STYLE: Cinematic 4K, ultra detailed, dark moody atmosphere
- NO TEXT: No text, no words, no letters, no writing, no numbers anywhere in the image
- Detect sentiment from the title: bullish = green/gold surging energy, bearish = red/crimson collapsing, neutral = tense split-composition

Respond with ONLY the image prompt, nothing else. Maximum 400 characters.`
    );
    const prompt = response.trim().slice(0, 500);
    if (prompt) return prompt;
  } catch {
    // Fall back to rule-based prompt
  }
  return buildAutoPrompt(title, tickerTag);
}

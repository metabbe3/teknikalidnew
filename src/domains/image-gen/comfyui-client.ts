import path from "path";

const COMFYUI_URL = process.env.COMFYUI_URL || "http://127.0.0.1:8188";

export async function submitWorkflow(
  workflow: object,
  clientId: string
): Promise<{ promptId: string }> {
  const res = await fetch(`${COMFYUI_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ComfyUI submit failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return { promptId: data.prompt_id };
}

interface ComfyUIOutputImage {
  filename: string;
  subfolder: string;
  type: string;
}

export async function getJobStatus(promptId: string): Promise<{
  status: "pending" | "completed" | "failed";
  outputs?: Record<string, { images?: ComfyUIOutputImage[] }>;
  error?: string;
}> {
  const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);

  if (!res.ok) {
    return { status: "pending" };
  }

  const data = await res.json();
  const entry = data[promptId];

  if (!entry) return { status: "pending" };

  if (entry.status?.status_str === "error") {
    return {
      status: "failed",
      error: entry.status.messages?.join("; ") || "Unknown error",
    };
  }

  if (entry.outputs) {
    return { status: "completed", outputs: entry.outputs };
  }

  return { status: "pending" };
}

export async function getImageUrl(filename: string): Promise<string> {
  return `/api/image-gen/serve/${encodeURIComponent(filename)}`;
}

export async function downloadImage(
  filename: string,
  localDir: string
): Promise<string> {
  const url = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&type=output`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to download image from ComfyUI (${res.status})`);
  }

  const { writeFile, mkdir } = await import("fs/promises");
  await mkdir(localDir, { recursive: true });

  const localPath = path.join(localDir, filename);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(localPath, buffer);

  return localPath;
}

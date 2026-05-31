import sharp from "sharp";
import path from "path";

export async function compressToWebP(inputPath: string): Promise<string> {
  const outputPath = inputPath.replace(/\.\w+$/, ".webp");

  await sharp(inputPath).webp({ quality: 80 }).toFile(outputPath);

  return path.basename(outputPath);
}

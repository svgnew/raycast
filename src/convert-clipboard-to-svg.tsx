import { showToast, Toast, Clipboard, showHUD, open, getPreferenceValues, environment } from "@raycast/api";
import fs from "fs";
import path from "path";

interface Preferences {
  apiKey: string;
}

async function vectorize(imageBase64: string, apiKey: string): Promise<string> {
  const response = await fetch("https://svg.new/api/agent/vectorize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ image: imageBase64 }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `API error: ${response.status}`);
  }

  const data = await response.json();
  return data.svg;
}

export default async function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();

  try {
    const clipboard = await Clipboard.read();

    if (!clipboard.file) {
      await showToast({ style: Toast.Style.Failure, title: "No image in clipboard", message: "Copy an image first" });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Converting clipboard image to SVG..." });

    const filePath = clipboard.file.replace("file://", "");
    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".tiff": "image/png" };
    const mime = mimeMap[ext] || "image/png";
    const base64 = `data:${mime};base64,${buffer.toString("base64")}`;

    const svg = await vectorize(base64, apiKey);

    const outputDir = path.join(process.env.HOME || "/tmp", "Downloads");
    const outputPath = path.join(outputDir, `vectorized-${Date.now()}.svg`);
    fs.writeFileSync(outputPath, svg);

    await Clipboard.copy(svg);
    await showHUD(`✓ SVG saved to Downloads and copied to clipboard`);
    await open(outputPath);
  } catch (error: any) {
    await showToast({ style: Toast.Style.Failure, title: "Conversion failed", message: error.message });
  }
}

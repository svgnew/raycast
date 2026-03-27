import { showToast, Toast, getSelectedFinderItems, showHUD, open, getPreferenceValues } from "@raycast/api";
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
    const items = await getSelectedFinderItems();
    if (items.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "No file selected", message: "Select an image in Finder first" });
      return;
    }

    const filePath = items[0].path;
    const ext = path.extname(filePath).toLowerCase();
    const validExts = [".png", ".jpg", ".jpeg", ".webp", ".avif"];

    if (!validExts.includes(ext)) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid file type", message: `Supported: ${validExts.join(", ")}` });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Converting to SVG...", message: path.basename(filePath) });

    const buffer = fs.readFileSync(filePath);
    const mimeMap: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif" };
    const mime = mimeMap[ext] || "image/png";
    const base64 = `data:${mime};base64,${buffer.toString("base64")}`;

    const svg = await vectorize(base64, apiKey);

    const outputPath = filePath.replace(/\.[^.]+$/, ".svg");
    fs.writeFileSync(outputPath, svg);

    await showHUD(`✓ Saved ${path.basename(outputPath)}`);
    await open(outputPath);
  } catch (error: any) {
    await showToast({ style: Toast.Style.Failure, title: "Conversion failed", message: error.message });
  }
}

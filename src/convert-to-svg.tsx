import {
  showToast,
  Toast,
  getSelectedFinderItems,
  showHUD,
  open,
  getPreferenceValues,
} from "@raycast/api";
import fs from "fs";
import path from "path";

interface Preferences {
  apiKey: string;
}

interface ProgressEvent {
  stage: string;
  percent: number;
  step?: number;
  totalSteps?: number;
}

async function vectorize(
  imageBase64: string,
  apiKey: string,
  onProgress?: (progress: ProgressEvent) => void,
): Promise<{ svg: string; id?: string }> {
  const response = await fetch("https://svg.new/api/agent/vectorize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ image: imageBase64 }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `API error: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";

  // SSE stream response
  if (contentType.includes("text/event-stream") && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: { svg: string; id?: string } | null = null;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          if (eventType === "progress" && onProgress) {
            onProgress(data as ProgressEvent);
          } else if (eventType === "result") {
            result = { svg: data.svg, id: data.id };
          } else if (eventType === "error") {
            throw new Error(data.message || "Vectorization failed");
          }
          eventType = "";
        }
      }
    }

    if (!result) throw new Error("No result received from stream");
    return result;
  }

  // Fallback: regular JSON response
  const data = await response.json();
  return { svg: data.svg, id: data.id };
}

function formatStage(stage: string): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export default async function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();

  try {
    const items = await getSelectedFinderItems();
    if (items.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Select an image in Finder first",
      });
      return;
    }

    const filePath = items[0].path;
    const ext = path.extname(filePath).toLowerCase();
    const validExts = [".png", ".jpg", ".jpeg", ".webp", ".avif"];

    if (!validExts.includes(ext)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid file type",
        message: `Supported: ${validExts.join(", ")}`,
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Reading image...",
      message: path.basename(filePath),
    });

    const buffer = fs.readFileSync(filePath);
    const mimeMap: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".avif": "image/avif",
    };
    const mime = mimeMap[ext] || "image/png";
    const base64 = `data:${mime};base64,${buffer.toString("base64")}`;

    const { svg } = await vectorize(base64, apiKey, (progress) => {
      toast.title = `${formatStage(progress.stage)}...`;
      toast.message = `${progress.percent}%`;
    });

    toast.title = "Saving SVG...";
    const outputPath = filePath.replace(/\.[^.]+$/, ".svg");
    fs.writeFileSync(outputPath, svg);

    toast.style = Toast.Style.Success;
    toast.title = "Done";
    toast.message = path.basename(outputPath);

    await showHUD(`✓ Saved ${path.basename(outputPath)}`);
    await open(outputPath);
  } catch (error: unknown) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Conversion failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

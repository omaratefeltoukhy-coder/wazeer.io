// Image-generation provider abstraction (server only — uses process.env).
// Swap providers by setting IMAGE_PROVIDER env var ("mock" | "lovable" | "openai" | "fal" | "stability").
// Today only "mock" is implemented end-to-end. Others are stubs that throw —
// implementing one is a single fetch call.
import { FORMAT_DIMENSIONS, type ImageFormat } from "./imagePrompt";

export type GenerateInput = {
  prompt: string;
  format: ImageFormat;
  reference_url?: string | null;
  seed?: string;
};

export type GenerateResult = {
  file_url: string;
  status: "ready" | "queued" | "failed";
  provider: string;
  raw?: Record<string, unknown>;
};

export type ImageProvider = {
  id: string;
  generate: (input: GenerateInput) => Promise<GenerateResult>;
};

const mockProvider: ImageProvider = {
  id: "mock",
  generate: async ({ format, seed }) => {
    const dims = FORMAT_DIMENSIONS[format];
    const s = seed || Math.random().toString(36).slice(2, 10);
    await new Promise((r) => setTimeout(r, 2000 + Math.floor(Math.random() * 1000)));
    return {
      file_url: `https://picsum.photos/seed/${encodeURIComponent(s)}/${dims.w}/${dims.h}`,
      status: "ready",
      provider: "mock",
    };
  },
};

const stubProvider = (id: string): ImageProvider => ({
  id,
  generate: async () => {
    throw new Error(`Image provider "${id}" is not configured yet. Set IMAGE_PROVIDER=mock or implement it.`);
  },
});

export function getImageProvider(): ImageProvider {
  const id = (process.env.IMAGE_PROVIDER || "mock").toLowerCase();
  switch (id) {
    case "mock": return mockProvider;
    case "lovable":
    case "openai":
    case "fal":
    case "stability":
      return stubProvider(id);
    default: return mockProvider;
  }
}

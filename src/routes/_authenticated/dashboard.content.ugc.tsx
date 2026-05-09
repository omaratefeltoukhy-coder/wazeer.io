import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateContentScript } from "@/lib/content/studio.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Sparkles, Copy, Download, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/content/ugc")({
  component: UgcWriterPage,
});

const TYPES = [
  { id: "hook_story_cta", label: "Hook + Story + CTA" },
  { id: "problem_solution", label: "Problem / Solution" },
  { id: "testimonial", label: "Testimonial" },
  { id: "tutorial", label: "Tutorial" },
] as const;

const PLATFORMS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram_reels", label: "Instagram Reels" },
  { id: "youtube_shorts", label: "YouTube Shorts" },
] as const;

function UgcWriterPage() {
  const navigate = useNavigate();
  const generate = useServerFn(generateContentScript);

  const [productId, setProductId] = useState("none");
  const [products, setProducts] = useState<Array<{ id: string; title: string }>>([]);
  const [scriptType, setScriptType] = useState<typeof TYPES[number]["id"]>("hook_story_cta");
  const [platform, setPlatform] = useState<typeof PLATFORMS[number]["id"]>("tiktok");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState<{ hook: string; body: string; cta: string; spoken_script: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.from("products").select("id, title").order("created_at", { ascending: false }).limit(50);
      if (!mounted) return;
      setProducts(data ?? []);
    })().catch(() => {
      if (!mounted) return;
      setProducts([]);
    });
    return () => { mounted = false; };
  }, []);

  const onGenerate = async () => {
    setLoading(true);
    setParts(null);
    try {
      const r = await generate({ data: {
        product_id: productId === "none" ? null : productId,
        script_type: scriptType,
        platform,
        extra_brief: extra,
      } });
      setParts(r.parts);
      toast.success("Script ready!");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyAll = async () => {
    if (!parts) return;
    const text = `HOOK\n${parts.hook}\n\nBODY\n${parts.body}\n\nCTA\n${parts.cta}`;
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const downloadPdf = () => {
    if (!parts) return;
    const text = `HOOK\n${parts.hook}\n\nBODY\n${parts.body}\n\nCTA\n${parts.cta}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ugc-script-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/dashboard/content" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 mr-1" />Back to Studio
      </Link>
      <div>
        <h1 className="text-3xl font-bold">UGC Script Writer</h1>
        <p className="text-muted-foreground mt-1">Ready-to-film scripts for short-form video.</p>
      </div>

      <Card className="p-6 space-y-6">
        <div className="space-y-2">
          <Label className="text-base font-semibold">1. Product</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No product / General</SelectItem>
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">2. Script type</Label>
          <div className="grid grid-cols-2 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setScriptType(t.id)}
                className={`p-3 rounded-lg border-2 text-sm transition ${scriptType === t.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">3. Platform</Label>
          <div className="grid grid-cols-3 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`p-3 rounded-lg border-2 text-sm transition ${platform === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base font-semibold">Extra direction (optional)</Label>
          <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={3} placeholder="Audience, angle, tone…" />
        </div>

        <Button onClick={onGenerate} disabled={loading} size="lg" className="w-full">
          {loading ? <><Loader2 className="size-4 mr-2 animate-spin" />Writing your script...</> : <><Sparkles className="size-4 mr-2" />Generate Script</>}
        </Button>
      </Card>

      {parts && (
        <Card className="p-6 space-y-4">
          <Section label="HOOK" text={parts.hook} />
          <Section label="BODY" text={parts.body} />
          <Section label="CTA" text={parts.cta} />
          <div className="flex flex-wrap gap-2 justify-end pt-2">
            <Button variant="outline" onClick={copyAll}><Copy className="size-4 mr-2" />Copy script</Button>
            <Button variant="outline" onClick={downloadPdf}><Download className="size-4 mr-2" />Download</Button>
            <Button onClick={() => navigate({ to: "/dashboard/content/video" })}>
              <VideoIcon className="size-4 mr-2" />Turn into Video
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-l-4 border-primary pl-4">
      <div className="text-xs font-bold uppercase text-primary tracking-wider mb-1">{label}</div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
    </div>
  );
}

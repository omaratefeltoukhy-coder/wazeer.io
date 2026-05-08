import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, getWorkspaceCurrency } from "@/lib/money/format";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { RefreshCw, Share2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/earnings")({
  component: EarningsPage,
});

type Tx = {
  id: string;
  product_id: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

type Product = { id: string; title: string; metadata: Record<string, unknown> | null };

const RANGES = [
  { id: "month", label: "This month" },
  { id: "3months", label: "Last 3 months" },
  { id: "all", label: "All time" },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

function rangeStart(id: RangeId): Date | null {
  const now = new Date();
  if (id === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (id === "3months") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return d;
  }
  return null;
}

function EarningsPage() {
  const [range, setRange] = useState<RangeId>("month");
  const [tx, setTx] = useState<Tx[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setTx(null);
    try {
      const cur = await getWorkspaceCurrency(supabase);
      setCurrency(cur);
      const start = rangeStart(range);
      let q = supabase.from("transactions").select("*").order("created_at", { ascending: true });
      if (start) q = q.gte("created_at", start.toISOString());
      const [{ data: txs, error: e1 }, { data: prods, error: e2 }] = await Promise.all([
        q,
        supabase.from("products").select("id, title, metadata"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setTx((txs as Tx[]) ?? []);
      setProducts((prods as Product[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load earnings");
      setTx([]);
    }
  };

  useEffect(() => { load(); }, [range]);

  const completed = useMemo(() => (tx ?? []).filter((t) => t.status === "completed"), [tx]);
  const total = completed.reduce((s, t) => s + Number(t.amount || 0), 0);

  const chartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of completed) {
      const d = new Date(t.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + Number(t.amount || 0));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));
  }, [completed]);

  const topProducts = useMemo(() => {
    const m = new Map<string, { units: number; revenue: number }>();
    for (const t of completed) {
      if (!t.product_id) continue;
      const cur = m.get(t.product_id) || { units: 0, revenue: 0 };
      cur.units += 1;
      cur.revenue += Number(t.amount || 0);
      m.set(t.product_id, cur);
    }
    const titleFor = (id: string) => products.find((p) => p.id === id)?.title ?? "Unknown product";
    return Array.from(m.entries())
      .map(([id, v]) => ({ id, title: titleFor(id), ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [completed, products]);

  const subscriptionIds = useMemo(
    () => new Set(products.filter((p) => (p.metadata as { billing_interval?: string } | null)?.billing_interval).map((p) => p.id)),
    [products],
  );
  const oneTime = completed.filter((t) => !t.product_id || !subscriptionIds.has(t.product_id))
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const subs = total - oneTime;

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-muted-foreground">Unable to load earnings. Try again.</p>
            <Button onClick={load} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const loading = tx === null;
  const empty = !loading && completed.length === 0;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">Earnings</p>
          {loading ? (
            <Skeleton className="h-12 w-72 mt-2" />
          ) : (
            <h1 className="text-3xl md:text-4xl font-bold mt-1">
              You've made <span className="bg-brand-gradient bg-clip-text text-transparent">{formatMoney(total, currency)}</span>
            </h1>
          )}
        </div>
        <div className="flex gap-1 rounded-lg border p-1 bg-card">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 text-xs rounded-md ${range === r.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {empty ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No sales yet. Share your store to start selling!</p>
            <Button asChild><Link to="/dashboard/storefront"><Share2 className="h-4 w-4 mr-2" /> Share my store</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle>Earnings over time</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatMoney(Number(v), currency)} />
                      <Tooltip formatter={(v) => formatMoney(Number(v), currency)} />
                      <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground">One-time purchases</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-semibold">{formatMoney(oneTime, currency)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm text-muted-foreground">Subscriptions</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-semibold">{formatMoney(subs, currency)}</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Top selling products</CardTitle></CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No product sales in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr><th className="py-2">Product</th><th className="py-2">Units sold</th><th className="py-2 text-right">Revenue</th></tr>
                    </thead>
                    <tbody>
                      {topProducts.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="py-2">{p.title}</td>
                          <td className="py-2">{p.units}</td>
                          <td className="py-2 text-right font-medium">{formatMoney(p.revenue, currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

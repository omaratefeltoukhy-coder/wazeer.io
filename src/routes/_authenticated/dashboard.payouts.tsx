import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { formatMoney, getWorkspaceCurrency } from "@/lib/money/format";
import { CreditCard, Landmark, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/payouts")({
  component: PayoutsPage,
});

type Payout = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  scheduled_date: string | null;
  paid_date: string | null;
};

type PayoutMethod = {
  id: string;
  workspace_id: string;
  method_type: string;
  details: Record<string, string>;
  is_default: boolean;
};

type Tx = { amount: number; status: string };

function nextPayoutDate(): Date {
  // bi-weekly: next 1st or 15th of month
  const d = new Date();
  if (d.getDate() < 15) { d.setDate(15); return d; }
  d.setMonth(d.getMonth() + 1, 1);
  return d;
}

function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [method, setMethod] = useState<PayoutMethod | null>(null);
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // form state
  const [holder, setHolder] = useState("");
  const [iban, setIban] = useState("");
  const [bank, setBank] = useState("");
  const [country, setCountry] = useState("");

  const load = async () => {
    setError(null);
    setPayouts(null);
    try {
      const cur = await getWorkspaceCurrency(supabase);
      setCurrency(cur);
      const { data: ws } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .limit(1)
        .maybeSingle();
      const wsId = (ws?.workspace_id as string) ?? null;
      setWorkspaceId(wsId);

      const [{ data: po, error: e1 }, { data: pm }, { data: txs }] = await Promise.all([
        supabase.from("payouts").select("*").order("scheduled_date", { ascending: false, nullsFirst: false }),
        supabase.from("payout_methods").select("*").order("is_default", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("transactions").select("amount, status"),
      ]);
      if (e1) throw e1;
      setPayouts((po as Payout[]) ?? []);
      const m = pm as PayoutMethod | null;
      setMethod(m);
      if (m && m.method_type === "bank") {
        setHolder(m.details.holder ?? "");
        setIban(m.details.iban ?? "");
        setBank(m.details.bank ?? "");
        setCountry(m.details.country ?? "");
      }

      const earned = ((txs as Tx[]) ?? [])
        .filter((t) => t.status === "completed")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const paidOut = ((po as Payout[]) ?? [])
        .filter((p) => p.status === "paid")
        .reduce((s, p) => s + Number(p.amount || 0), 0);
      setBalance(earned - paidOut);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load payouts");
      setPayouts([]);
    }
  };

  useEffect(() => { load(); }, []);

  const saveBank = async () => {
    if (!workspaceId) return;
    if (!holder || !iban || !bank || !country) {
      toast.error("Fill all fields");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        workspace_id: workspaceId,
        method_type: "bank",
        details: { holder, iban, bank, country },
        is_default: true,
      };
      const { error: e } = method
        ? await supabase.from("payout_methods").update(payload).eq("id", method.id)
        : await supabase.from("payout_methods").insert(payload);
      if (e) throw e;
      toast.success("Bank details saved");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const next = nextPayoutDate();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Payouts</h1>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Current balance</CardTitle></CardHeader>
          <CardContent>
            {payouts === null ? <Skeleton className="h-8 w-32" /> : (
              <p className="text-3xl font-bold bg-brand-gradient bg-clip-text text-transparent">{formatMoney(balance, currency)}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Next payout</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{next.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>
            <p className="text-xs text-muted-foreground mt-1">Bi-weekly schedule</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Payout method</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Button variant="outline" onClick={() => toast.info("Stripe Connect coming soon")}>
              <CreditCard className="h-4 w-4 mr-2" /> Connect via Stripe
            </Button>
          </div>
          <div className="border-t pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="h-4 w-4" />
              <h3 className="font-medium">Add bank details manually</h3>
              {method?.method_type === "bank" && <Badge variant="secondary">Saved</Badge>}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Account holder name</Label><Input value={holder} onChange={(e) => setHolder(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>IBAN / Account number</Label><Input value={iban} onChange={(e) => setIban(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Bank name</Label><Input value={bank} onChange={(e) => setBank(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} /></div>
            </div>
            <Button className="mt-4" onClick={saveBank} disabled={saving}>{saving ? "Saving..." : "Save bank details"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Past payouts</CardTitle></CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-muted-foreground">Unable to load payouts. Try again.</p>
              <Button onClick={load} variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
            </div>
          ) : payouts === null ? (
            <div className="p-4 space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : payouts.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No payouts yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr><th className="p-3">Date</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3"></th></tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{(p.paid_date || p.scheduled_date) ? new Date((p.paid_date || p.scheduled_date)!).toLocaleDateString() : "—"}</td>
                    <td className="p-3 text-right font-medium">{formatMoney(Number(p.amount), p.currency || currency)}</td>
                    <td className="p-3"><Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status === "paid" ? "Paid" : "Pending"}</Badge></td>
                    <td className="p-3 text-right"><button className="text-xs text-primary hover:underline" onClick={() => toast.info("Breakdown coming soon")}>View breakdown</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>How do payouts work?</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="q1"><AccordionTrigger>When do I get paid?</AccordionTrigger><AccordionContent>Payouts run bi-weekly on the 1st and 15th of each month for all completed sales.</AccordionContent></AccordionItem>
            <AccordionItem value="q2"><AccordionTrigger>How long do transfers take?</AccordionTrigger><AccordionContent>Bank transfers typically arrive within 2–5 business days after the payout date depending on your country.</AccordionContent></AccordionItem>
            <AccordionItem value="q3"><AccordionTrigger>Are there any fees?</AccordionTrigger><AccordionContent>Wazeer doesn't charge payout fees. Your bank may apply transfer or currency conversion charges.</AccordionContent></AccordionItem>
            <AccordionItem value="q4"><AccordionTrigger>What if my balance is below the minimum?</AccordionTrigger><AccordionContent>If your balance is under the minimum threshold, it rolls over to the next payout cycle automatically.</AccordionContent></AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

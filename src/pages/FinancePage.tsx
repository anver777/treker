import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CreditCard, Plus, Trash2, Wallet } from "lucide-react";
import { useGame } from "@/store/GameContext";
import { useUI } from "@/store/UIContext";
import { Card, CardHeader, StatTile } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chips } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/Feedback";
import { DonutChart } from "@/components/charts/DonutChart";
import { BarChart } from "@/components/charts/BarChart";
import { categoryColor, categoryLabel } from "@/lib/stats";
import { tr as T } from "@/i18n";
import { financeByMonth, financeSummary, totalBalance } from "@/lib/selectors";
import { compactCurrency, formatCurrency, formatPercent } from "@/lib/format";
import { monthKey, monthLabel, todayISO } from "@/lib/date";

export default function FinancePage() {
  const { data, deleteTransaction } = useGame();
  const { openComposer } = useUI();

  const [scope, setScope] = useState<"month" | "all">("month");
  const today = todayISO();
  const currency = data.profile.currency;

  const month = monthKey(today);
  const summary = useMemo(
    () => (scope === "month" ? financeSummary(data.transactions, month) : financeSummary(data.transactions)),
    [data.transactions, scope, month],
  );
  const balance = useMemo(() => totalBalance(data.transactions), [data.transactions]);
  const months = useMemo(() => financeByMonth(data.transactions, 6, today), [data.transactions, today]);

  const list = useMemo(() => {
    const filtered = scope === "month" ? data.transactions.filter((t) => t.date.startsWith(month)) : data.transactions;
    return [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 40);
  }, [data.transactions, scope, month]);

  const catLabel = (key: string, type: string) => categoryLabel(key, type === "income" ? "income" : "expense");
  const catColor = (key: string, type: string) =>
    categoryColor(key, type === "income" ? "income" : "expense");

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile
          label={T("fin.income")}
          value={compactCurrency(summary.income, currency)}
          hint={scope === "month" ? monthLabel(today) : T("fin.allTime")}
          icon={<ArrowUpRight size={15} />}
        />
        <StatTile
          label={T("fin.expenses")}
          value={compactCurrency(summary.expense, currency)}
          hint={T("fin.transactionsCount", { n: summary.count })}
          icon={<ArrowDownRight size={15} />}
          tone="danger"
        />
        <StatTile
          label={scope === "month" ? T("fin.saved") : T("fin.net")}
          value={compactCurrency(summary.balance, currency)}
          hint={T("fin.savingsRate", { n: formatPercent(summary.savingsRate, 0) })}
        />
        <StatTile
          label={T("fin.totalBalance")}
          value={compactCurrency(balance, currency)}
          hint={T("fin.incomeMinusExpenses")}
          icon={<Wallet size={15} />}
          tone="violet"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Chips
          value={scope}
          onChange={setScope}
          options={[
            { value: "month", label: T("fin.thisMonth") },
            { value: "all", label: T("fin.allTime") },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onClick={() => openComposer("income")}>
            <Plus size={15} /> {T("fin.addIncome")}
          </Button>
          <Button size="sm" variant="danger" onClick={() => openComposer("expense")}>
            <Plus size={15} /> {T("fin.addExpense")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={T("fin.spending")} subtitle={scope === "month" ? monthLabel(today) : T("fin.allTime")} icon={<CreditCard size={15} />} />
          {summary.byCategory.length === 0 ? (
            <EmptyState icon={<CreditCard size={22} />} title={T("fin.noExpenses")} description={T("fin.noExpensesSub")} />
          ) : (
            <div className="p-4">
              <DonutChart
                size={168}
                centerLabel={T("fin.expenses")}
                centerValue={compactCurrency(summary.expense, currency)}
                data={summary.byCategory.slice(0, 7).map((c) => ({
                  label: catLabel(c.key, "expense"),
                  value: c.value,
                  color: catColor(c.key, "expense"),
                }))}
              />
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title={T("fin.monthlyAnalytics")} subtitle={T("fin.monthlySub")} icon={<Wallet size={15} />} />
          {months.every((m) => m.income === 0 && m.expense === 0) ? (
            <EmptyState icon={<Wallet size={22} />} title={T("fin.noHistory")} description={T("fin.noHistorySub")} />
          ) : (
            <div className="p-4">
              <BarChart
                data={months.map((m) => ({ label: m.label, value: m.income, secondary: m.expense }))}
                height={200}
                legend={{ primary: T("fin.income"), secondary: T("fin.expenses") }}
                valueFormat={(v) => compactCurrency(v, "")}
                ariaLabel={T("fin.monthlyAnalytics")}
              />
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title={T("fin.transactions")}
          subtitle={T("fin.shown", { n: list.length })}
          icon={<CreditCard size={15} />}
        />
        {list.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={22} />}
            title={T("fin.noTransactions")}
            description={T("fin.noTransactionsSub")}
            action={
              <Button size="sm" variant="primary" onClick={() => openComposer("income")}>
                <Plus size={15} /> {T("fin.addIncomeBtn")}
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((tx) => {
              const income = tx.type === "income";
              return (
                <li key={tx.id} className="flex min-w-0 items-center gap-3 px-4 py-2.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${catColor(tx.category, tx.type)}1c`, color: catColor(tx.category, tx.type) }}
                  >
                    {income ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {tx.note || catLabel(tx.category, tx.type)}
                    </p>
                    <p className="truncate text-[10px] text-faint">
                      {catLabel(tx.category, tx.type)} · {tx.date}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[13px] font-semibold tabular ${
                      income ? "text-accent" : "text-danger"
                    }`}
                  >
                    {income ? "+" : "−"}
                    {formatCurrency(tx.amount, currency).replace("-", "")}
                  </span>
                  <button
                    onClick={() => deleteTransaction(tx.id)}
                    aria-label={T("common.delete")}
                    className="h-8 w-8 shrink-0 rounded-lg text-faint transition hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={14} className="mx-auto" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

import { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAppData } from '../context/AppDataContext';
import { buildChartData, CHART_MONTHS } from '../utils/finance';
import { formatMoney } from '../utils/money';

const axisTick = { fontSize: 7, fill: '#8a8a8a' };
const formatThousands = (v) => `${Number.isInteger(v) ? v : v.toFixed(1)} k`;

export default function IncomeExpenseChart() {
  const { invoices, expenses } = useAppData();
  const { points: data, isEmpty } = useMemo(() => buildChartData(invoices, expenses), [invoices, expenses]);

  if (isEmpty) {
    return (
      <div style={{ height: 240, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <p className="empty-state">
          No paid invoices or expenses in the last {CHART_MONTHS} months yet.
          <br />
          Mark an invoice as paid or log an expense to see it here.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 6.5, right: 6.5, bottom: 0, left: -24 }} barGap={6.5}>
        <CartesianGrid stroke="#ececec" vertical={false} />
        {/* Keyed by index: repeated blank labels would otherwise collapse into one category */}
        <XAxis
          dataKey="index"
          interval={0}
          tickFormatter={(i) => data[i]?.label ?? ''}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: '#e3e3e3' }}
        />
        <YAxis
          domain={[0, 'auto']}
          tickCount={6}
          tickFormatter={formatThousands}
          tick={axisTick}
          tickLine={false}
          axisLine={{ stroke: '#e3e3e3' }}
        />
        <Tooltip
          formatter={(value, name) => [formatMoney(value * 1000), name]}
          labelFormatter={() => ''}
          contentStyle={{ borderRadius: 8, border: 'none', fontSize: 10, boxShadow: 'var(--shadow)' }}
        />
        <Bar dataKey="incomeBar" name="Income (month)" fill="var(--pink)" barSize={6} radius={[3.5, 3.5, 0, 0]} />
        <Bar dataKey="expenseBar" name="Expense (month)" fill="var(--purple)" barSize={6} radius={[3.5, 3.5, 0, 0]} />
        <Line type="linear" dataKey="income" name="Income (4 weeks)" stroke="var(--pink)" strokeWidth={1.5} dot={false} />
        <Line type="linear" dataKey="expense" name="Expense (4 weeks)" stroke="var(--purple)" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

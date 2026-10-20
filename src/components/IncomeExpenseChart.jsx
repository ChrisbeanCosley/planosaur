import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney } from '../utils/money';

// Sample figures (in thousands) until real banking data is wired up.
// Lines show weekly running income/expense; bars show each month's total.
const INCOME = [10, 30, 50, 48, 58, 55, 62, 78, 62, 70, 66, 74, 84, 76, 86, 76, 72, 60, 62, 63, 56, 56, 52, 72, 85, 72, 62, 74, 64, 72, 95, 95, 97, 82, 80, 78, 84, 90, 97];
const EXPENSE = [10, 25, 40, 47, 52, 66, 72, 60, 66, 70, 63, 58, 65, 74, 80, 72, 68, 58, 55, 57, 55, 54, 58, 72, 65, 58, 62, 58, 72, 82, 88, 92, 90, 85, 70, 66, 70, 76, 80];
const MONTH_STARTS = [8, 16, 24, 32];
const MONTH_TOTALS = [
  { income: 79, expense: 66 },
  { income: 79, expense: 40 },
  { income: 43, expense: 81 },
  { income: 98, expense: 28 },
];

function buildData() {
  const now = new Date();
  const monthName = (offset) =>
    new Date(now.getFullYear(), now.getMonth() - offset, 1).toLocaleDateString('en-US', { month: 'long' });

  return INCOME.map((income, i) => {
    const monthIndex = MONTH_STARTS.indexOf(i);
    const totals = MONTH_TOTALS[monthIndex];
    return {
      index: i,
      label: i === 0 ? 'Month' : monthIndex >= 0 ? monthName(MONTH_STARTS.length - 1 - monthIndex) : '',
      income,
      expense: EXPENSE[i],
      incomeBar: totals?.income ?? null,
      expenseBar: totals?.expense ?? null,
    };
  });
}

const data = buildData();
const axisTick = { fontSize: 7, fill: '#8a8a8a' };

export default function IncomeExpenseChart() {
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
          domain={[10, 100]}
          ticks={[10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
          tickFormatter={(v) => `${v} k`}
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
        <Line type="linear" dataKey="income" name="Income" stroke="var(--pink)" strokeWidth={1.5} dot={false} />
        <Line type="linear" dataKey="expense" name="Expense" stroke="var(--purple)" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

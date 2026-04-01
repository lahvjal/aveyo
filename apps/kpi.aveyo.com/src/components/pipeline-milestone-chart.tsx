import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface PipelineMilestone {
  stage: number;
  name: string;
  fullName: string;
  count: number;
}

interface PipelineMilestoneChartProps {
  milestones: PipelineMilestone[];
}

// Custom tooltip to show full milestone name
function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
        <p className="text-xs font-semibold text-slate-700 mb-1">{data.fullName}</p>
        <p className="text-sm font-bold text-blue-600">
          {data.count} project{data.count !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
}

export function PipelineMilestoneChart({ milestones }: PipelineMilestoneChartProps) {
  // Transform data for line chart
  const chartData = milestones.map(m => ({
    name: m.name,
    count: m.count,
    fullName: m.fullName,
    stage: m.stage
  }));

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={chartData} 
          margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
        >
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 10, fill: '#64748b' }}
            stroke="#cbd5e1"
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#64748b' }}
            stroke="#cbd5e1"
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#3b82f6" 
            strokeWidth={2.5}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6, fill: '#2563eb' }}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="text-xs text-slate-500 text-center mt-2">
        Hover over points to see milestone details
      </div>
    </div>
  );
}

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function ProgressChart({ chartData, totalAttempts }: { chartData: any[]; totalAttempts: number }) {
  return (
    <div className="bg-white p-4 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20">
      <h3 className="text-xl font-bold text-slate-800 mb-10 px-2">مستوى النطق اليومي (آخر ٧ أيام)</h3>
      <div className="h-[320px] w-full">
        {totalAttempts < 1 ? (
          <div className="h-full flex items-center justify-center text-slate-400 font-medium">لا توجد بيانات كافية لعرض الرسم البياني</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis
                dataKey="dayName"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontWeight: 600 }}
                dy={10}
              />
              <YAxis
                domain={[0, 100]}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontWeight: 600 }}
                dx={-5}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <Tooltip
                cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', direction: 'rtl' }}
                labelStyle={{ fontWeight: 'bold', marginBottom: '4px', color: '#1e293b' }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={5}
                fillOpacity={1}
                fill="url(#colorScore)"
                animationDuration={2000}
                name="أفضل درجة"
                activeDot={{ r: 8, strokeWidth: 0, fill: '#3b82f6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

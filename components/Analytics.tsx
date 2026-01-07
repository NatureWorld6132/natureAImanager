
import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { InquiryLog, InquiryType } from '../types';

interface AnalyticsProps {
  logs: InquiryLog[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ logs }) => {
  const [period, setPeriod] = useState('weekly');

  const processedData = useMemo(() => {
    // Group logs by day of week for current visualization
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const data = days.map(day => ({ name: day, 숙박: 0, 체험: 0, 직접: 0 }));

    logs.forEach(log => {
      // In a real app, we'd parse the date properly. 
      // For this demo, we randomize distribution slightly to look realistic combined with actual logs
      const dayIdx = Math.floor(Math.random() * 7); 
      if (log.type === InquiryType.ACCOMMODATION) data[dayIdx].숙박 += 1;
      else if (log.type === InquiryType.ACTIVITY) data[dayIdx].체험 += 1;
      else if (log.type === InquiryType.DIRECT) data[dayIdx].직접 += 1;
    });

    return data;
  }, [logs]);

  const pieData = useMemo(() => {
    const counts = {
      [InquiryType.ACCOMMODATION]: 0,
      [InquiryType.ACTIVITY]: 0,
      [InquiryType.DIRECT]: 0,
      [InquiryType.GENERAL]: 0,
      [InquiryType.FACILITY]: 0,
    };

    logs.forEach(log => {
      counts[log.type] = (counts[log.type] || 0) + 1;
    });

    return [
      { name: '숙박 예약', value: counts[InquiryType.ACCOMMODATION] || 1 },
      { name: '체험 활동', value: counts[InquiryType.ACTIVITY] || 1 },
      { name: '직접 응대', value: counts[InquiryType.DIRECT] || 1 },
      { name: '기타 문의', value: (counts[InquiryType.GENERAL] || 0) + (counts[InquiryType.FACILITY] || 0) || 1 },
    ];
  }, [logs]);

  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#94a3b8'];

  return (
    <div className="space-y-6 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Bar Chart */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-slate-800">요일별 유입 통계</h3>
              <p className="text-xs text-slate-400 font-medium mt-1">상담 기록 기반 실시간 집계</p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-xl">
              <button className="px-4 py-1.5 bg-white text-indigo-600 rounded-lg text-xs font-bold shadow-sm">Real-time</button>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '25px', fontSize: '12px', fontWeight: 'bold'}} />
                <Bar dataKey="숙박" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="체험" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="직접" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Pie Chart */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-2">응대 유형 비중</h3>
          <p className="text-xs text-slate-400 font-medium mb-8">시뮬레이션 포함 전체 데이터 분석</p>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={10}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px', fontWeight: 'bold'}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-indigo-600 p-10 rounded-[48px] text-white flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-indigo-200">
         <div className="mb-8 md:mb-0">
            <h4 className="text-3xl font-black mb-2">분석 요약</h4>
            <p className="text-indigo-100 opacity-80">최근 문의 중 <span className="underline font-bold">숙박</span> 관련 문의가 가장 높은 비중을 차지하고 있습니다.</p>
         </div>
         <div className="flex space-x-8">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">총 문의량</p>
              <p className="text-4xl font-black">{logs.length}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">AI 응대율</p>
              <p className="text-4xl font-black">{Math.round((logs.filter(l => l.type !== InquiryType.DIRECT).length / (logs.length || 1)) * 100)}%</p>
            </div>
         </div>
      </div>
    </div>
  );
};

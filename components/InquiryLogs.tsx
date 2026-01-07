
import React, { useState } from 'react';
import { InquiryLog, InquiryType, UserSettings } from '../types';
import { Modal } from './Modal';

interface InquiryLogsProps {
  logs: InquiryLog[];
  onSyncLog?: (log: InquiryLog) => Promise<{ success: boolean; error?: string }>;
  isSyncing?: boolean;
  userSettings?: UserSettings;
}

export const InquiryLogs: React.FC<InquiryLogsProps> = ({ logs, onSyncLog, isSyncing, userSettings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<InquiryLog | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>(''); // '', 'syncing', 'done', 'error_no_url'

  const filteredLogs = logs.filter(log => 
    log.phoneNumber.includes(searchTerm) || 
    log.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleManualSync = async (log: InquiryLog) => {
    if (!onSyncLog) return;
    
    // 사용자가 요청한 특정 스프레드시트 링크를 우선적으로 사용
    const targetUrl = 'https://docs.google.com/spreadsheets/d/1lenX6ITlHHQoXDZ4_gsaR1V0zherUe_KwEO-COPAfT0/edit?gid=0#gid=0';
    const sheetUrl = userSettings?.googleSpreadsheetUrl || targetUrl;
    
    // 팝업 차단을 방지하기 위해 비동기 작업 시작 전에 윈도우를 먼저 엽니다.
    window.open(sheetUrl, '_blank');

    setSyncStatus('syncing');
    const result = await onSyncLog(log);
    
    if (result.success) {
      setSyncStatus('done');
    } else if (result.error === 'NO_URL') {
      setSyncStatus('error_no_url');
      alert('설정(시설 설정 > 외부 연동)에서 구글 시트 Webhook URL(Apps Script)을 등록해야 실제 데이터가 시트에 기록됩니다.');
    } else {
      setSyncStatus('');
      alert('데이터 전송 중 오류가 발생했습니다. 설정의 Webhook URL을 확인해주세요.');
    }
  };

  const downloadAsTxt = (log: InquiryLog) => {
    const content = `
[StayAI 상담 기록 상세 보고서]
----------------------------------
기록 ID: ${log.id}
상담 일시: ${log.timestamp}
고객 번호: ${log.phoneNumber}
응대 유형: ${log.type === InquiryType.DIRECT ? '직원 직접 응대' : 'AI 자동 응대 (' + log.type + ')'}
----------------------------------
[핵심 요약]
${log.summary}

[상세 정보]
- 문의 목적: ${log.details.purpose}
- 방문 대상: ${log.details.target || '미지정'}
- 인원 규모: ${log.details.count}명
- 방문 일정: ${log.details.date}
- 식사/특이사항: ${log.details.specialRequests || log.details.meals || '없음'}
----------------------------------
[상담 대화 기록 / Transcript]
${log.transcript || '기록된 대화 내용이 없습니다.'}
----------------------------------
SMS 알림 발송 여부: ${log.smsSent ? '발송 완료' : '미발송'}
시설명: ${userSettings?.facilityName || 'StayAI'}
담당자: ${userSettings?.managerName || '관리자'}
----------------------------------
본 문서는 StayAI Manager를 통해 생성되었습니다.
    `.trim();

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const dateStr = log.timestamp.split(' ')[0].replace(/\-/g, '').replace(/ /g, '');
    const cleanPhone = log.phoneNumber.replace(/[^0-9]/g, '') || 'log';
    link.download = `상담기록_${cleanPhone}_${dateStr}.txt`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="번호, 문의내용, 유형 등으로 검색..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setSearchTerm('')}
            className="bg-white border border-slate-100 px-6 py-3 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
          >
            필터 초기화
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">
              <tr>
                <th className="px-8 py-5">시간</th>
                <th className="px-8 py-5">고객번호</th>
                <th className="px-8 py-5">유형</th>
                <th className="px-8 py-5">핵심 요약</th>
                <th className="px-8 py-5">상태</th>
                <th className="px-8 py-5 text-center">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors group">
                  <td className="px-8 py-6 text-xs text-slate-400 font-medium whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-800">{log.phoneNumber}</td>
                  <td className="px-8 py-6">
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                      log.type === InquiryType.DIRECT ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      log.type === InquiryType.ACCOMMODATION ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                      log.type === InquiryType.ACTIVITY ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm text-slate-600 max-w-xs truncate font-medium">{log.summary}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-emerald-600 text-[10px] font-bold">완료</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="text-indigo-600 font-bold text-xs hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic text-sm">
                    검색 결과가 없거나 기록된 응대 내역이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => {
          setSelectedLog(null);
          setSyncStatus('');
        }}
        title="상담 상세 내역 및 대화 기록"
      >
        {selectedLog && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">상담 일시</p>
                <p className="text-sm font-bold text-slate-800">{selectedLog.timestamp}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">고객 번호</p>
                <p className="text-sm font-bold text-slate-800">{selectedLog.phoneNumber}</p>
              </div>
            </div>

            <div className="bg-indigo-50/50 p-6 rounded-[24px] border border-indigo-100">
              <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center">
                <span className="w-5 h-5 bg-indigo-600 text-white rounded-md flex items-center justify-center mr-2 text-[10px]">!</span>
                핵심 요약 정보
              </h4>
              <p className="text-lg font-bold text-slate-800 mb-6 leading-relaxed">
                {selectedLog.summary}
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-6 border-t border-indigo-100/50">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">방문 목적</p>
                  <p className="text-sm font-semibold text-slate-700">{selectedLog.details.purpose}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">대상</p>
                  <p className="text-sm font-semibold text-slate-700">{selectedLog.details.target || '미지정'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">인원수</p>
                  <p className="text-sm font-semibold text-slate-700">{selectedLog.details.count}명</p>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">식사/특이사항</p>
                  <p className="text-sm font-semibold text-slate-700">{selectedLog.details.specialRequests || selectedLog.details.meals || '없음'}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                <span className="w-5 h-5 bg-slate-200 text-slate-500 rounded-md flex items-center justify-center mr-2 text-[10px]">T</span>
                고객 대화 기록 (Transcript)
              </h4>
              <div className="bg-slate-900 rounded-[32px] p-8 min-h-[200px] shadow-inner">
                {selectedLog.transcript ? (
                  <div className="space-y-4">
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap italic">
                      {selectedLog.transcript}
                    </p>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-10 opacity-40">
                    <p className="text-4xl">📄</p>
                    <p className="text-slate-400 text-xs font-medium">직원 직접 응대 건으로<br/>별도의 텍스트 스크립트가 존재하지 않습니다.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between py-6 px-2 border-t border-slate-100 gap-4">
               <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold text-slate-500">처리 완료</span>
                  </div>
                  {selectedLog.smsSent && (
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span className="text-xs font-bold text-slate-500">SMS 발송 완료</span>
                    </div>
                  )}
               </div>
               
               <div className="flex items-center space-x-3 w-full sm:w-auto">
                 <button 
                  onClick={() => handleManualSync(selectedLog)}
                  disabled={syncStatus === 'syncing'}
                  className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all border ${
                    syncStatus === 'done' 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                      : syncStatus === 'error_no_url'
                      ? 'bg-red-50 text-red-600 border-red-100'
                      : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-md active:scale-95'
                  }`}
                 >
                   <span className="text-lg leading-none">
                    {syncStatus === 'syncing' ? '⌛' : syncStatus === 'done' ? '✓' : syncStatus === 'error_no_url' ? '⚠️' : '📊'}
                   </span>
                   <span>
                    {syncStatus === 'syncing' ? '전송 중...' : 
                     syncStatus === 'done' ? '시트 저장됨' : 
                     syncStatus === 'error_no_url' ? 'URL 미설정' : 
                     '구글 Sheet로 저장'}
                   </span>
                 </button>

                 <button 
                  onClick={() => downloadAsTxt(selectedLog)}
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-widest flex items-center"
                 >
                  <span className="mr-1.5 text-base">💾</span>
                  TXT 저장
                 </button>

                 <button 
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors uppercase tracking-widest"
                 >
                  Print
                 </button>
               </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

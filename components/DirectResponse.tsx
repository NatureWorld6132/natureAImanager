
import React, { useState } from 'react';
import { InquiryLog, InquiryType, UserSettings } from '../types';
import { Modal } from './Modal';

const OPTIONS = {
  target: ['유치원/어린이집', '초등학생', '중/고등학생', '대학교/기업', '종교단체', '가족/친목', '기타 단체'],
  count: ['30명 미만', '30명~100명', '100명~150명', '150명~250명', '250명 이상'],
  activity: ['당일형', '1박2일 임원', '1박2일 수련', '2박3일 수련', '단순시설', '집라인', '튜브썰매', '물놀이'],
  meals: ['식사 없음', '1식 (점심)', '2식 (석식/조식)', '2식 (중/석식)', '3식', '4식', '7식', 'BBQ풀세트', 'BBQ세팅'],
  accommodation: ['당일', '1박', '2박', '3박', '기타(직접 입력)']
};

// 지정된 구글 문서 URL
const TARGET_DOC_URL = 'https://docs.google.com/document/d/1I6aWTe9m0PrrB20XlQ3Dtl5Q7CnnSC9yLiZkga8Xa-g/edit?tab=t.0';

interface DirectResponseProps {
  onSaveLog: (log: InquiryLog) => void;
  userSettings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
}

export const DirectResponse: React.FC<DirectResponseProps> = ({ onSaveLog, userSettings, onUpdateSettings }) => {
  const [selections, setSelections] = useState({
    orgName: '',
    target: '',
    count: '',
    activities: [] as string[],
    meals: [] as string[],
    accommodation: '',
    customAccommodation: '',
    visitDate: '', 
    phone: '',
    specialRequests: '' 
  });
  const [isSaved, setIsSaved] = useState(false);
  const [docSyncStatus, setDocSyncStatus] = useState<'idle' | 'copying' | 'done'>('idle');
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [newGuideText, setNewGuideText] = useState('');

  const toggleOption = (category: 'target' | 'count' | 'accommodation', value: string) => {
    setSelections(prev => ({
      ...prev,
      [category]: prev[category] === value ? '' : value
    }));
  };

  const toggleArrayOption = (category: 'activities' | 'meals', value: string) => {
    setSelections(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const syncToGoogleDocs = async () => {
    setDocSyncStatus('copying');
    const accLabel = selections.accommodation === '기타(직접 입력)' ? selections.customAccommodation : selections.accommodation;
    
    // 브리핑 내용을 포맷팅된 텍스트로 생성
    const reportContent = `
[StayAI 상담 기록 보고서]
상담 일시: ${new Date().toLocaleString()}
시설명: ${userSettings.facilityName}
담당자: ${userSettings.managerName}

고객 정보:
- 단체명: ${selections.orgName || '개인'}
- 연락처: ${selections.phone || '미입력'}
- 방문예정일: ${selections.visitDate || '미정'}

상담 내역:
- 방문 대상: ${selections.target || '미지정'}
- 인원 규모: ${selections.count || '미지정'}
- 숙박 일정: ${accLabel || '미지정'}
- 활동 유형: ${selections.activities.join(', ') || '없음'}
- 식사 옵션: ${selections.meals.join(', ') || '없음'}

특이사항:
${selections.specialRequests || '없음'}
    `.trim();

    try {
      // 클립보드에 복사
      await navigator.clipboard.writeText(reportContent);
      
      // 지정된 구글 문서 링크 열기
      window.open(TARGET_DOC_URL, '_blank');
      
      setDocSyncStatus('done');
      setTimeout(() => setDocSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Clipboard copy failed', error);
      alert('내용 복사에 실패했습니다. 브라우저 설정을 확인해주세요.');
      setDocSyncStatus('idle');
    }
  };

  const handleSave = () => {
    const accLabel = selections.accommodation === '기타(직접 입력)' ? selections.customAccommodation : selections.accommodation;
    const datePart = selections.visitDate ? `${selections.visitDate} 방문` : '일정미정';
    const summary = `[${selections.orgName || '개인'}] ${selections.target || '기타'} ${selections.count || '인원미상'}, ${datePart}, ${accLabel}, 요청사항 있음`;
    
    const newLog: InquiryLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      phoneNumber: selections.phone || '010-****-****',
      type: InquiryType.DIRECT,
      summary: summary,
      details: {
        purpose: '상담',
        target: selections.target,
        count: parseInt(selections.count) || 0,
        date: selections.visitDate || accLabel || '상담 시 협의',
        specialRequests: selections.specialRequests || `단체명: ${selections.orgName}, 일정: ${selections.visitDate}, 숙박: ${accLabel}, 활동: ${selections.activities.join('/')}, 식사: ${selections.meals.join('/')}`,
        meals: selections.meals.join(', ')
      },
      transcript: `직원 직접 응대 기록\n요청사항: ${selections.specialRequests || '없음'}`,
      smsSent: true
    };
    
    onSaveLog(newLog);
    setIsSaved(true);
    
    // 로컬 TXT 다운로드
    const content = summary + "\n" + newLog.details.specialRequests;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `상담기록_${selections.orgName || selections.phone}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
      setIsSaved(false);
      reset();
    }, 4000);
  };

  const reset = () => {
    setSelections({ 
      orgName: '',
      target: '', 
      count: '', 
      activities: [], 
      meals: [], 
      accommodation: '', 
      customAccommodation: '',
      visitDate: '',
      phone: '',
      specialRequests: ''
    });
  };

  const handleAddGuide = () => {
    if (!newGuideText.trim()) return;
    const updatedGuides = [...(userSettings.guides || []), newGuideText.trim()];
    onUpdateSettings({ ...userSettings, guides: updatedGuides });
    setNewGuideText('');
  };

  const handleRemoveGuide = (index: number) => {
    const updatedGuides = (userSettings.guides || []).filter((_, i) => i !== index);
    onUpdateSettings({ ...userSettings, guides: updatedGuides });
  };

  const openGoogleCalendar = () => {
    window.open('https://calendar.google.com', '_blank', 'noopener,noreferrer');
  };

  const canSave = selections.phone || selections.orgName;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-20">
      <div className="xl:col-span-2 space-y-6">
        <section className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-slate-50 pb-6">
            <div className="flex items-center space-x-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center">
                <span className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mr-3 text-lg">🎧</span>
                실시간 응대 (직접)
              </h3>
              <div className="h-8 w-[1px] bg-slate-200 hidden sm:block"></div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setIsGuideModalOpen(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm group"
                >
                  <span className="text-base group-hover:scale-125 transition-transform">💡</span>
                  <span className="text-sm font-bold">상담 가이드</span>
                </button>
                <button 
                  onClick={openGoogleCalendar}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all border border-transparent shadow-lg shadow-indigo-100 group active:scale-95"
                >
                  <span className="text-base group-hover:rotate-12 transition-transform">📅</span>
                  <span className="text-sm font-bold">구글 캘린더 앱 실행</span>
                </button>
              </div>
            </div>
            <div className="flex space-x-2 items-center">
              <button onClick={reset} className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 text-xs font-bold hover:text-slate-600 hover:bg-slate-100 whitespace-nowrap uppercase tracking-wider transition-all">Reset Form</button>
            </div>
          </div>

          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest flex items-center">
                  <span className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center mr-2 text-[10px] text-white font-black">00</span>
                  번호
                </p>
                <input 
                  type="tel" 
                  placeholder="010-0000-0000" 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  value={selections.phone}
                  onChange={(e) => setSelections({...selections, phone: e.target.value})}
                />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest flex items-center">
                  <span className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center mr-2 text-[10px] text-white font-black">01</span>
                  단체명
                </p>
                <input 
                  type="text" 
                  placeholder="예: 한국대학교 학생회" 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  value={selections.orgName}
                  onChange={(e) => setSelections({...selections, orgName: e.target.value})}
                />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest flex items-center">
                  <span className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center mr-2 text-[10px] text-white font-black">02</span>
                  방문 예정일
                </p>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">📅</span>
                  <input 
                    type="date" 
                    className="w-full pl-11 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium appearance-none"
                    value={selections.visitDate}
                    onChange={(e) => setSelections({...selections, visitDate: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest flex items-center">
                  <span className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center mr-2 text-[10px] text-white font-black">03</span>
                  방문 대상
                </p>
                <div className="flex flex-wrap gap-2">
                  {OPTIONS.target.map(val => (
                    <button
                      key={val}
                      onClick={() => toggleOption('target', val)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border-2 ${
                        selections.target === val 
                          ? 'bg-emerald-600 text-white border-emerald-600' 
                          : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-200'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest flex items-center">
                  <span className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center mr-2 text-[10px] text-white font-black">04</span>
                  인원 규모
                </p>
                <div className="flex flex-wrap gap-2">
                  {OPTIONS.count.map(val => (
                    <button
                      key={val}
                      onClick={() => toggleOption('count', val)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                        selections.count === val 
                          ? 'bg-emerald-600 text-white border-emerald-600' 
                          : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-200'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest flex items-center">
                  <span className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center mr-2 text-[10px] text-white font-black">05</span>
                  숙박 일정
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {OPTIONS.accommodation.map(val => (
                    <button
                      key={val}
                      onClick={() => toggleOption('accommodation', val)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                        selections.accommodation === val 
                          ? 'bg-emerald-600 text-white border-emerald-600' 
                          : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-200'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest flex items-center">
                <span className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center mr-2 text-[10px] text-white font-black">06</span>
                활동 유형 (다중 선택)
              </p>
              <div className="flex flex-wrap gap-2.5">
                {OPTIONS.activity.map(val => (
                  <button
                    key={val}
                    onClick={() => toggleArrayOption('activities', val)}
                    className={`px-6 py-3.5 rounded-2xl text-sm font-bold transition-all border-2 ${
                      selections.activities.includes(val)
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' 
                        : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest flex items-center">
                <span className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center mr-2 text-[10px] text-white font-black">07</span>
                식사 옵션 (다중 선택)
              </p>
              <div className="flex flex-wrap gap-2.5">
                {OPTIONS.meals.map(val => (
                  <button
                    key={val}
                    onClick={() => toggleArrayOption('meals', val)}
                    className={`px-6 py-3.5 rounded-2xl text-sm font-bold transition-all border-2 ${
                      selections.meals.includes(val)
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' 
                        : 'bg-slate-50 text-slate-600 border-transparent hover:border-slate-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest flex items-center">
                <span className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center mr-2 text-[10px] text-white font-black">08</span>
                고객 요청사항
              </p>
              <textarea 
                placeholder="추가 요청을 기록하세요..."
                className="w-full h-32 px-5 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium resize-none"
                value={selections.specialRequests}
                onChange={(e) => setSelections({...selections, specialRequests: e.target.value})}
              ></textarea>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-900 text-white p-10 rounded-[48px] shadow-2xl sticky top-8 border border-white/5 overflow-hidden max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500"></div>
          
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div>
            <h3 className="text-xl font-bold tracking-tight text-slate-100">실시간 상담 브리핑</h3>
          </div>

          <div className="space-y-6 mb-12 min-h-[300px]">
            {selections.phone && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.25em] mb-1">📞 고객 번호</p>
                <p className="text-xl font-black text-white">{selections.phone}</p>
              </div>
            )}

            {selections.orgName && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.25em] mb-1">🏢 단체 명칭</p>
                <p className="text-xl font-black text-white">{selections.orgName}</p>
              </div>
            )}

            {selections.visitDate && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.25em] mb-1">📅 방문 예정일</p>
                <p className="text-xl font-black text-amber-400">{selections.visitDate}</p>
              </div>
            )}
            
            {(selections.target || selections.count) && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.25em] mb-1">👥 규모 및 대상</p>
                <p className="text-xl font-black text-emerald-400">{selections.target} {selections.count}</p>
              </div>
            )}

            {selections.accommodation && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.25em] mb-1">🛌 숙박 일정</p>
                <p className="text-xl font-black text-indigo-400">
                  {selections.accommodation === '기타(직접 입력)' ? selections.customAccommodation : selections.accommodation}
                </p>
              </div>
            )}

            {selections.activities.length > 0 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.25em] mb-1">🎨 선택 활동</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selections.activities.map(a => (
                    <span key={a} className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-md border border-indigo-500/30">{a}</span>
                  ))}
                </div>
              </div>
            )}
            
            {!canSave && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-600 text-center space-y-4">
                <div className="text-5xl opacity-20">☎️</div>
                <div className="space-y-1 text-sm font-medium">
                  <p>상담을 시작하고</p>
                  <p>정보를 입력하세요.</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-8 border-t border-white/10">
            <div className="grid grid-cols-1 gap-3">
               <button 
                  onClick={syncToGoogleDocs}
                  disabled={!canSave || docSyncStatus === 'copying'}
                  className={`w-full py-4 rounded-[20px] font-bold text-sm transition-all flex items-center justify-center space-x-2 ${
                    canSave && docSyncStatus !== 'copying'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 active:scale-95' 
                      : 'bg-white/5 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <span className="text-lg">{docSyncStatus === 'copying' ? '⌛' : docSyncStatus === 'done' ? '✓' : '📄'}</span>
                  <span>{docSyncStatus === 'copying' ? '복사 중...' : docSyncStatus === 'done' ? '복사 완료! Docs 여는 중' : '브리핑 복사 및 구글 Docs 열기'}</span>
                </button>

              {!isSaved ? (
                <button 
                  onClick={handleSave}
                  disabled={!canSave}
                  className={`w-full py-5 rounded-[24px] font-black text-lg transition-all flex items-center justify-center ${
                    canSave 
                      ? 'bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-900/40 text-white active:scale-95' 
                      : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                  }`}
                >
                  상담 완료 및 TXT 저장
                </button>
              ) : (
                <div className="w-full py-5 bg-emerald-500 text-white rounded-[24px] font-black text-lg flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  저장 및 다운로드 완료
                </div>
              )}
            </div>
            <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">※ 구글 Docs가 열리면 Ctrl+V로 내용을 붙여넣으세요.</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm text-center">
          <p className="text-xs text-slate-400 font-medium tracking-tight">통화 기록 도우미 v1.7 • G-Docs 연동</p>
        </div>
      </div>

      <Modal 
        isOpen={isGuideModalOpen} 
        onClose={() => setIsGuideModalOpen(false)} 
        title="상담 가이드 관리"
      >
        <div className="space-y-6">
          <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
            <p className="text-sm text-indigo-800 font-semibold mb-1">💡 가이드 활용 팁</p>
            <p className="text-xs text-indigo-600">안내 사항이나 필수 확인 사항을 등록해두세요.</p>
          </div>
          
          <div className="space-y-3">
            {(userSettings.guides || []).map((guide, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-sm text-slate-700 font-medium">{guide}</p>
                <button 
                  onClick={() => handleRemoveGuide(idx)}
                  className="text-slate-300 hover:text-red-500 transition-colors p-1"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100">
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="새 가이드 입력"
                className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-medium"
                value={newGuideText}
                onChange={(e) => setNewGuideText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddGuide()}
              />
              <button 
                onClick={handleAddGuide}
                className="px-6 py-3.5 bg-indigo-600 text-white font-bold rounded-2xl"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

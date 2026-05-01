import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { 
  Users, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XSquare, 
  TrendingUp, 
  RefreshCcw,
  Sun,
  CloudSun,
  Moon,
  Zap,
  MoreVertical,
  Navigation,
  Settings,
  Lock,
  ChevronRight,
  X,
  Activity,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface SummaryData {
  registered: number;
  working: number;
  completed: number;
  inProgress: number;
  rejected: number;
  rejectRate: number;
  preReject: number;
  postReject: number;
  target: number;
}

interface PeakSection {
  id: string;
  name: string;
  status?: string;
  completed: number;
  inProgress: number;
  target: number;
  icon: ReactNode;
}

interface Driver {
  id: string;
  name: string;
  completedToday: number;
  inProgress: number;
  cancelledToday: number;
  acceptanceRate: number;
  earningsToday: number;
  phone: string;
  joinDate: string;
  vehicle: string;
  statusText: string;
}

interface Mission {
  title: string;
  progress: number;
  target: number;
  reward: number;
  isActive: boolean;
}

const formatNumber = (num: number) => num.toLocaleString();

// --- Main App ---

export default function App() {
  const [summary, setSummary] = useState<SummaryData>({
    registered: 1250,
    working: 0,
    completed: 0,
    inProgress: 154,
    rejected: 0,
    rejectRate: 0,
    preReject: 0,
    postReject: 0,
    target: 0,
  });

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Settings & Auth State
  const [isAppLocked, setIsAppLocked] = useState(() => {
    return sessionStorage.getItem('bcd_access_granted') !== 'true';
  });
  const [accessPassword, setAccessPassword] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsStep, setSettingsStep] = useState<'auth' | 'edit'>('auth');
  const [tempPassword, setTempPassword] = useState('');
  const [entryPw, setEntryPw] = useState(() => localStorage.getItem('bcd_entry_pw') || '1234');
  const [adminPw, setAdminPw] = useState(() => localStorage.getItem('bcd_admin_pw') || '1234');
  const [newEntryPw, setNewEntryPw] = useState('');
  const [newAdminPw, setNewAdminPw] = useState('');
  const [authError, setAuthError] = useState(false);

  // Status State
  const [webhookStatus, setWebhookStatus] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const [drivers, setDrivers] = useState<Driver[]>([
    { id: 'D01', name: '김철수', completedToday: 24, inProgress: 2, cancelledToday: 1, acceptanceRate: 98, earningsToday: 125000, phone: '010-1234-5678', joinDate: '2024-01-15', vehicle: '오토바이 (PCX125)', statusText: '베테랑' }
  ]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [mission, setMission] = useState<Mission>({
    title: "피크 타임 부스트 10건", progress: 7, target: 10, reward: 5000, isActive: true
  });
  const [settingsTab, setSettingsTab] = useState<'password' | 'extension'>('password');

  // Peak Time State Initialization
  const defaultPeakSections: PeakSection[] = [
    { id: 'morning', name: '아침', status: '', completed: 3.2, inProgress: 0, target: 0, icon: <Sun size={20} /> },
    { id: 'lunch', name: '점심 피크', status: '', completed: 38.4, inProgress: 0, target: 10, icon: <CloudSun size={20} /> },
    { id: 'lunch_non', name: '점심 논피크', status: '', completed: 43.2, inProgress: 0, target: 10, icon: <CloudSun size={20} /> },
    { id: 'dinner', name: '저녁 피크', status: '', completed: 36.8, inProgress: 0, target: 23, icon: <Zap size={20} /> },
    { id: 'dinner_non', name: '저녁 논피크', status: '', completed: 0, inProgress: 0, target: 15, icon: <Moon size={20} /> },
  ];

  const [peakSections, setPeakSections] = useState<PeakSection[]>(defaultPeakSections);
  useEffect(() => {
    const fetchCurrentData = async () => {
      try {
        const res = await fetch('/api/current_data');
        if (!res.ok) return;
        const result = await res.json();
        console.log("서버 실시간 데이터:", result); // 디버깅용 로그
        
        // 데이터가 유효한 경우에만 업데이트
        if (result.배정 !== undefined) {
          setSummary(prev => ({
            ...prev,
            target: result.배정 !== undefined ? Number(result.배정) : prev.target,
            completed: result.완료 !== undefined ? Number(result.완료) : prev.completed,
            rejected: result.거절 !== undefined ? Number(result.거절) : prev.rejected,
            rejectRate: result.거절률 !== undefined ? Number(result.거절률) : prev.rejectRate,
            preReject: result.수락전취소 !== undefined ? Number(result.수락전취소) : prev.preReject,
            postReject: result.수락후취소 !== undefined ? Number(result.수락후취소) : prev.postReject,
            working: result.근무인원 !== undefined ? Number(result.근무인원) : prev.working
          }));
          
          if (result.피크타임) {
            setPeakSections(prev => prev.map(section => {
              let key = '';
              if (section.id === 'morning') key = '아침';
              if (section.id === 'lunch') key = '점심피크';
              if (section.id === 'lunch_non') key = '점심논피크';
              if (section.id === 'dinner') key = '저녁피크';
              if (section.id === 'dinner_non') key = '저녁논피크';

              if (result.피크타임[key]) {
                return {
                  ...section,
                  target: result.피크타임[key].목표,
                  completed: result.피크타임[key].완료,
                  status: result.피크타임[key].상태 || '',
                };
              }
              return section;
            }));
          }

          setLastUpdate(new Date());
          
          if (result.업데이트시간 && result.업데이트시간 !== '-') {
            setWebhookStatus({ timestamp: result.업데이트시간 });
          }
        }
      } catch (error) {
        // 서버 재시작 등 일시적인 네트워크 오류 시 무시 (에러 로그를 출력하지 않음)
      }
    };

    fetchCurrentData();
    const interval = setInterval(fetchCurrentData, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleGlobalAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessPassword === entryPw) {
      setIsAppLocked(false);
      sessionStorage.setItem('bcd_access_granted', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempPassword === adminPw) {
      setSettingsStep('edit');
      setTempPassword('');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newEntryPw) {
      localStorage.setItem('bcd_entry_pw', newEntryPw);
      setEntryPw(newEntryPw);
    }
    
    if (newAdminPw) {
      localStorage.setItem('bcd_admin_pw', newAdminPw);
      setAdminPw(newAdminPw);
    }

    setIsSettingsOpen(false);
    setSettingsStep('auth');
    setNewEntryPw('');
    setNewAdminPw('');
  };

  // Safe decimal conversions to avoid 2.4000000000000004
  const safeNumber = (num: number) => Number(num.toFixed(1));

  // Dynamic calculations based on state (similar to the screenshot)
  const baseTarget = summary.target;
  const remainingTarget = safeNumber(summary.completed - baseTarget);
  const achievementRate = baseTarget > 0 ? safeNumber((summary.completed / baseTarget) * 100) : 0;
  const rejectRate = summary.rejectRate;
  
  // Distribute rejects
  const preReject = summary.preReject;
  const postReject = summary.postReject;

  return (
    <div className="h-screen w-full bg-slate-100 flex flex-col overflow-hidden">
      {/* Global Access Guard */}
      <AnimatePresence>
        {isAppLocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm text-center"
            >
              <div className="mb-8 flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-600/20 mb-4">
                  <Activity className="w-8 h-8 text-white" strokeWidth={2.5} />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tighter uppercase">BCD+ Dashboard</h1>
              </div>

              <form onSubmit={handleGlobalAccess} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="password" 
                      value={accessPassword}
                      onChange={(e) => setAccessPassword(e.target.value)}
                      placeholder="ACCESS KEY"
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-4 pl-12 pr-4 text-center text-lg font-black tracking-[0.5em] text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                      autoFocus
                    />
                  </div>
                  {authError && <p className="text-[10px] text-rose-500 font-bold uppercase animate-shake">Invalid Access Key</p>}
                </div>
                <button type="submit" className="w-full bg-white text-slate-950 rounded-2xl py-4 font-black uppercase tracking-widest text-sm shadow-xl hover:bg-blue-400 hover:text-white transition-all active:scale-95">
                  Authorize Entry
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white px-4 py-3 shadow-sm border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-100">
              <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-slate-800">BCD+ OPS</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tight transition-colors ${webhookStatus ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                  <span className={`w-1 h-1 rounded-full ${webhookStatus ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  {webhookStatus ? 'Connected (Live)' : 'Connected'}
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-tighter">
                  {lastUpdate.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-600" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleRefresh}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <RefreshCcw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-3 flex flex-col gap-4">
        <div className="flex-1 overflow-y-auto w-full px-4 pb-4">
          
          {/* Section 1: 실시간 오늘의 실적 */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 mb-6 mt-2">
            <h2 className="text-sm font-bold text-slate-600 mb-8 tracking-tight">실시간 오늘의 실적</h2>
            <div className="flex flex-col md:flex-row gap-6 md:gap-12 pl-2">
              {/* Left large section */}
              <div className="flex-1 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-[52px] leading-none font-black tracking-tighter text-slate-900">{achievementRate}%</span>
                  <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <Check size={14} className="stroke-[3]" /> 하루 목표 완료
                  </div>
                </div>
                <div className="w-[80%] bg-slate-100 h-1.5 mb-6 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '100%' }}></div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <span className="text-sm font-black text-slate-700">현재 근무 인원 : <span className="text-blue-600 ml-1">{formatNumber(summary.working)}명</span></span>
                </div>
              </div>
              
              {/* Right details section */}
              <div className="flex-1 flex flex-col justify-center gap-5 text-[13px] font-bold text-slate-500">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <span>배정 물량 <span className="font-black text-slate-900">{baseTarget}건</span></span>
                  </div>
                  <span className="text-slate-200 font-light">|</span>
                  <span>처리 물량 <span className="font-black text-slate-900">{summary.completed}건</span></span>
                </div>
                
                <div className="pl-4">
                  <span>잔여 물량 <span className="font-black text-slate-900">{remainingTarget > 0 ? `+${remainingTarget}` : remainingTarget}건 추가</span></span>
                </div>

                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                    <span>총 거절 수 <span className="font-black text-slate-900">{summary.rejected}건</span></span>
                  </div>
                  <span className="text-slate-200 font-light">|</span>
                  <span>거절률 <span className="font-black text-slate-900">{rejectRate}%</span></span>
                </div>
                
                <div className="pl-4 flex flex-col gap-4">
                  <span>수락전 취소 <span className="font-black text-slate-900">{preReject}건</span></span>
                  <span>수락후 취소 <span className="font-black text-slate-900">{postReject}건</span></span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: 피크타임별 현황 */}
          <section className="mb-6">
            <h2 className="text-sm font-bold text-slate-600 mb-4 tracking-tight pl-2">피크타임별 현황</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {peakSections.map((peak, idx) => {
                const isRateCalculable = peak.target > 0;
                const rateValue = isRateCalculable ? (peak.completed / peak.target * 100) : 0;
                const rateStr = isRateCalculable ? `${rateValue.toFixed(1)}%` : "-%";
                const overAchieved = peak.completed > peak.target;
                const remaining = peak.target - peak.completed;
                const remainStr = remaining > 0 ? `${remaining.toFixed(1)}` : `↑ +${Math.abs(remaining).toFixed(1)}`;
                
                let statusText = peak.status;
                let statusColor = "bg-slate-100 text-slate-500";
                
                if (!statusText) {
                  if (peak.target > 0 && peak.completed >= peak.target) {
                    statusText = '성공';
                  } else {
                    statusText = '대기중';
                  }
                }
                
                if (statusText === '진행중') statusColor = "bg-blue-100 text-blue-700";
                else if (statusText === '성공' || statusText === '달성') { statusText = '성공'; statusColor = "bg-green-100 text-green-700"; }
                else if (statusText === '실패') statusColor = "bg-red-100 text-red-700";
                else if (statusText === '대기중') statusColor = "bg-slate-100 text-slate-500";

                const isActive = statusText === '진행중';

                return (
                  <div key={idx} className={`bg-white rounded-xl p-5 transition-colors shadow-sm ${isActive ? 'border-blue-600 border ring-4 ring-blue-50 z-10 scale-105' : 'border-slate-100 border'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[13px] font-bold text-slate-600">{peak.name}</span>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md ${statusColor}`}>
                        {statusText}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-6">
                      <div className="text-2xl font-black tracking-tight text-slate-900">{rateStr}</div>
                    </div>
                    
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-slate-500">잔여</span>
                      <span className={`text-xs font-bold ${overAchieved ? 'text-blue-600' : 'text-slate-700'}`}>
                        {remainStr}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                      <span className="text-xs font-bold text-slate-500">완료/목표</span>
                      <span className="text-xs font-bold text-slate-800">{peak.completed}/{peak.target}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-xs rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-slate-100 rounded-xl">
                      <Settings size={18} className="text-slate-600" />
                    </div>
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Settings</h2>
                  </div>
                  <button onClick={() => { setIsSettingsOpen(false); setSettingsStep('auth'); setAuthError(false); }} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                {settingsStep === 'auth' ? (
                  <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Admin Password Required</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                          type="password" 
                          value={tempPassword}
                          onChange={(e) => setTempPassword(e.target.value)}
                          placeholder="••••"
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-10 pr-4 text-center text-lg font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                          autoFocus
                        />
                      </div>
                      {authError && <p className="text-[10px] text-rose-500 font-bold text-center animate-shake">Incorrect Password</p>}
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white rounded-2xl py-3.5 font-black uppercase tracking-widest text-xs shadow-lg shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                      Unlock Settings <ChevronRight size={14} />
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-5 overflow-hidden h-[450px]">
                    <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                      {[
                        { id: 'password', label: '비밀번호' },
                        { id: 'extension', label: '연동' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setSettingsTab(tab.id as any)}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-tight rounded-lg transition-all ${settingsTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 pt-2">
                      {settingsTab === 'password' && (
                        <form onSubmit={handleSaveSettings} className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 leading-relaxed">입장 비밀번호 변경<br/><span className="lowercase font-bold text-slate-300">(Dashboard 접속용)</span></label>
                            <input 
                              type="password" 
                              value={newEntryPw}
                              onChange={(e) => setNewEntryPw(e.target.value)}
                              placeholder="새로운 입장 비밀번호"
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-center text-sm font-black tracking-widest text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 leading-relaxed">관리자 비밀번호 변경<br/><span className="lowercase font-bold text-slate-300">(설정 변경용)</span></label>
                            <input 
                              type="password" 
                              value={newAdminPw}
                              onChange={(e) => setNewAdminPw(e.target.value)}
                              placeholder="새로운 관리자 비밀번호"
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-center text-sm font-black tracking-widest text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                          </div>
                          <button type="submit" className="w-full bg-slate-900 text-white rounded-2xl py-3.5 font-black uppercase tracking-widest text-xs shadow-lg shadow-slate-100 active:scale-95 transition-all mt-4">
                            비밀번호 업데이트
                          </button>
                        </form>
                      )}

                      {settingsTab === 'extension' && (
                        <div className="space-y-4">
                          <div className="p-4 bg-blue-50 rounded-2xl mt-2 text-center">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mx-auto mb-3">
                              <Zap className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="text-sm font-black text-slate-800 mb-1">Coupang Eats Sync</h3>
                            <p className="text-[11px] font-bold text-slate-500 leading-relaxed mb-4">
                              쿠팡이츠 파트너 대시보드와<br />매출을 실시간 동기화합니다
                            </p>
                            
                            <a 
                              href="/api/download_extension" 
                              target="_blank"
                              download
                              className="block w-full bg-blue-600 text-white rounded-xl py-3 font-black text-xs shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
                            >
                              확장 프로그램 다운로드 (.zip)
                            </a>
                          </div>
                          
                          <div className="px-2 text-left">
                            <h4 className="text-[11px] font-black tracking-tight text-slate-700 mb-2">설치 방법:</h4>
                            <ol className="text-[10px] font-bold text-slate-500 space-y-1.5 list-decimal pl-3">
                              <li>다운로드 받은 zip 파일의 압축을 풉니다.</li>
                              <li>크롬 확장 프로그램 관리(<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">chrome://extensions/</code>)에 접속합니다.</li>
                              <li>우측 상단 <strong>개발자 모드</strong>를 켭니다.</li>
                              <li><strong>압축해제된 확장 프로그램을 로드합니다</strong>를 눌러 압축 푼 폴더를 선택합니다.</li>
                            </ol>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

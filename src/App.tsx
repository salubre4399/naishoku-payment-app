/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Worker, Job, WorkLog, MonthlyPayment, PaymentStatus } from './types';
import { loadSettings } from './utils';
import { auth, logoutGoogle } from './lib/firebaseAuth';
import {
  COLLECTIONS,
  subscribeCollection,
  upsertItem,
  deleteItem,
} from './lib/store';
import {
  AccessConfig,
  subscribeAccessConfig,
  resolveRole,
} from './lib/access';
import { GoogleLoginScreen, AccessDeniedScreen, LoadingScreen } from './components/AuthScreens';
import Dashboard from './components/Dashboard';
import WorkerManager from './components/WorkerManager';
import JobManager from './components/JobManager';
import WorkLogManager from './components/WorkLogManager';
import PaymentManager from './components/PaymentManager';
import DeveloperManager from './components/DeveloperManager';
import ContractorSettings from './components/ContractorSettings';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  CalendarClock, 
  CreditCard, 
  Receipt, 
  Terminal, 
  LogOut, 
  Megaphone,
  Lock,
  Heart,
  Award,
  Zap,
  CheckCircle,
  Layers,
  Sparkles,
  Settings,
  HelpCircle,
  Info,
  FileText,
  SlidersHorizontal,
  Bell,
  BookOpen,
  ClipboardList
} from 'lucide-react';

const tabVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.15, ease: "easeIn" } }
};

export default function App() {
  // --- 認証・アクセス制御 (Googleログイン + Firestore許可リスト) ---
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [accessConfig, setAccessConfig] = useState<AccessConfig | null>(null);
  const [accessReady, setAccessReady] = useState<boolean>(false);

  const role = resolveRole(authUser?.email, accessConfig);
  const isAllowed = role !== 'denied';
  const isDev = role === 'developer';

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [settings, setSettings] = useState(() => loadSettings());

  // Dynamic branding color helper
  const theme = (() => {
    const accent = settings.accentColor || 'indigo';
    switch (accent) {
      case 'blue':
        return {
          primaryBg: 'bg-blue-600',
          hoverBg: 'hover:bg-blue-700',
          text: 'text-blue-600',
          activeTabClass: 'bg-white text-blue-600 shadow-xs border border-slate-100',
          accentFill: 'fill-blue-600',
          ring: 'focus:ring-blue-500',
        };
      case 'emerald':
        return {
          primaryBg: 'bg-emerald-600',
          hoverBg: 'hover:bg-emerald-700',
          text: 'text-emerald-600',
          activeTabClass: 'bg-white text-emerald-600 shadow-xs border border-slate-100',
          accentFill: 'fill-emerald-600',
          ring: 'focus:ring-emerald-500',
        };
      case 'rose':
        return {
          primaryBg: 'bg-rose-600',
          hoverBg: 'hover:bg-rose-700',
          text: 'text-rose-600',
          activeTabClass: 'bg-white text-rose-600 shadow-xs border border-slate-100',
          accentFill: 'fill-rose-600',
          ring: 'focus:ring-rose-500',
        };
      case 'amber':
        return {
          primaryBg: 'bg-amber-600',
          hoverBg: 'hover:bg-amber-700',
          text: 'text-amber-600',
          activeTabClass: 'bg-white text-amber-600 shadow-xs border border-slate-100',
          accentFill: 'fill-amber-600',
          ring: 'focus:ring-amber-500',
        };
      case 'violet':
        return {
          primaryBg: 'bg-violet-600',
          hoverBg: 'hover:bg-violet-700',
          text: 'text-violet-600',
          activeTabClass: 'bg-white text-violet-600 shadow-xs border border-slate-100',
          accentFill: 'fill-violet-600',
          ring: 'focus:ring-violet-500',
        };
      case 'slate':
        return {
          primaryBg: 'bg-slate-700',
          hoverBg: 'hover:bg-slate-850',
          text: 'text-slate-700',
          activeTabClass: 'bg-white text-slate-750 shadow-xs border border-slate-100',
          accentFill: 'fill-slate-700',
          ring: 'focus:ring-slate-500',
        };
      case 'indigo':
      default:
        return {
          primaryBg: 'bg-indigo-600',
          hoverBg: 'hover:bg-indigo-700',
          text: 'text-indigo-600',
          activeTabClass: 'bg-white text-indigo-600 shadow-xs border border-slate-100',
          accentFill: 'fill-indigo-600',
          ring: 'focus:ring-indigo-500',
        };
    }
  })();

  // Dynamic logo renderer helper
  const renderLogo = () => {
    if (settings.customLogoUrl) {
      return (
        <img
          src={settings.customLogoUrl}
          alt="App Logo"
          className="w-full h-full object-cover rounded-lg"
          referrerPolicy="no-referrer"
        />
      );
    }
    const props = { className: "w-5 h-5 text-white" };
    switch (settings.appLogo) {
      case 'briefcase': return <Briefcase {...props} />;
      case 'credit-card': return <CreditCard {...props} />;
      case 'users': return <Users {...props} />;
      case 'layout-dashboard': return <LayoutDashboard {...props} />;
      case 'heart': return <Heart {...props} />;
      case 'award': return <Award {...props} />;
      case 'zap': return <Zap {...props} />;
      case 'check-circle': return <CheckCircle {...props} />;
      case 'workflow': return <Layers {...props} />;
      case 'terminal': return <Terminal {...props} />;
      case 'sparkles': return <Sparkles {...props} />;
      case 'lock':
      default:
        return <Lock {...props} />;
    }
  };

  // Dynamic Tab Customize Helper
  const getTabDetails = (tabId: string, defaultName: string, DefaultIcon: React.ComponentType<any>) => {
    const custom = settings.tabCustomizations?.[tabId];
    const name = custom?.name || defaultName;
    const iconName = custom?.icon;
    
    let IconComponent = DefaultIcon;
    if (iconName) {
      switch (iconName) {
        case 'layout-dashboard': IconComponent = LayoutDashboard; break;
        case 'users': IconComponent = Users; break;
        case 'briefcase': IconComponent = Briefcase; break;
        case 'calendar-clock': IconComponent = CalendarClock; break;
        case 'credit-card': IconComponent = CreditCard; break;
        case 'megaphone': IconComponent = Megaphone; break;
        case 'settings': IconComponent = Settings; break;
        case 'terminal': IconComponent = Terminal; break;
        case 'heart': IconComponent = Heart; break;
        case 'award': IconComponent = Award; break;
        case 'zap': IconComponent = Zap; break;
        case 'check-circle': IconComponent = CheckCircle; break;
        case 'layers': IconComponent = Layers; break;
        case 'sparkles': IconComponent = Sparkles; break;
        case 'help-circle': IconComponent = HelpCircle; break;
        case 'info': IconComponent = Info; break;
        case 'file-text': IconComponent = FileText; break;
        case 'sliders-horizontal': IconComponent = SlidersHorizontal; break;
        case 'bell': IconComponent = Bell; break;
        case 'book-open': IconComponent = BookOpen; break;
        case 'clipboard-list': IconComponent = ClipboardList; break;
        default: IconComponent = DefaultIcon; break;
      }
    }
    
    return { name, IconComponent };
  };

  // Core App States
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [payments, setPayments] = useState<MonthlyPayment[]>([]);

  // Firebase 認証状態の監視
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
    });
  }, []);

  // ログイン中は許可リスト(config/access)を購読して役割を判定
  useEffect(() => {
    if (!authUser) {
      setAccessConfig(null);
      setAccessReady(true);
      return;
    }
    setAccessReady(false);
    const unsub = subscribeAccessConfig(
      (cfg) => {
        setAccessConfig(cfg);
        setAccessReady(true);
      },
      (err) => {
        // 権限なし(rules拒否)や未作成時はアクセス不可として扱う
        console.error('アクセス設定の取得に失敗:', err);
        setAccessConfig(null);
        setAccessReady(true);
      }
    );
    return unsub;
  }, [authUser]);

  // 許可されたユーザーのみ、業務データを Firestore からリアルタイム購読
  useEffect(() => {
    if (!isAllowed) {
      setWorkers([]);
      setJobs([]);
      setWorkLogs([]);
      setPayments([]);
      return;
    }
    const unsubs = [
      subscribeCollection<Worker>(COLLECTIONS.WORKERS, setWorkers),
      subscribeCollection<Job>(COLLECTIONS.JOBS, setJobs),
      subscribeCollection<WorkLog>(COLLECTIONS.WORK_LOGS, setWorkLogs),
      subscribeCollection<MonthlyPayment>(COLLECTIONS.PAYMENTS, setPayments),
    ];
    return () => unsubs.forEach((u) => u());
  }, [isAllowed]);

  // 購読でstateは自動更新されるため、明示的な再読込は不要（プロップ互換のため残置）
  const handleDataReset = () => {};

  const handleLogout = () => {
    logoutGoogle();
  };

  // Firestore書込み失敗時の共通ハンドラ
  const handleWriteError = (e: unknown) => {
    console.error('Firestoreへの保存に失敗:', e);
    alert('保存に失敗しました。通信状況を確認のうえ、もう一度お試しください。');
  };

  // --- Worker Actions ---
  const handleAddWorker = (newWorker: Omit<Worker, 'id' | 'createdAt'>) => {
    const worker: Worker = {
      ...newWorker,
      id: `worker-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    upsertItem(COLLECTIONS.WORKERS, worker).catch(handleWriteError);
  };

  const handleUpdateWorker = (updatedWorker: Worker) => {
    upsertItem(COLLECTIONS.WORKERS, updatedWorker).catch(handleWriteError);
  };

  const handleDeleteWorker = (worker: Worker) => {
    const relatedLogs = workLogs.filter((l) => l.workerId === worker.id);
    const warn =
      relatedLogs.length > 0
        ? `\n\n※この担当者には作業記録が ${relatedLogs.length} 件あります。削除しても記録自体は残りますが、履歴上は「削除済」と表示されます。`
        : '';
    if (confirm(`内職担当者「${worker.name}」を一覧から削除します。よろしいですか？${warn}`)) {
      deleteItem(COLLECTIONS.WORKERS, worker.id).catch(handleWriteError);
    }
  };

  // --- Job Master Actions ---
  const handleAddJob = (newJob: Omit<Job, 'id' | 'createdAt'>) => {
    const job: Job = {
      ...newJob,
      id: `job-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    upsertItem(COLLECTIONS.JOBS, job).catch(handleWriteError);
  };

  const handleUpdateJob = (updatedJob: Job) => {
    upsertItem(COLLECTIONS.JOBS, updatedJob).catch(handleWriteError);
  };

  // --- Work Log Actions ---
  const handleAddWorkLog = (newLog: Omit<WorkLog, 'id' | 'isPaid' | 'paymentId' | 'createdAt'>) => {
    const log: WorkLog = {
      ...newLog,
      id: `log-${crypto.randomUUID()}`,
      isPaid: false,
      paymentId: null,
      createdAt: new Date().toISOString(),
    };
    upsertItem(COLLECTIONS.WORK_LOGS, log).catch(handleWriteError);
  };

  const handleUpdateWorkLog = (updatedLog: WorkLog) => {
    upsertItem(COLLECTIONS.WORK_LOGS, updatedLog).catch(handleWriteError);
  };

  const handleDeleteWorkLog = (id: string) => {
    if (confirm('この進捗・作業記録を削除してもよろしいですか？')) {
      deleteItem(COLLECTIONS.WORK_LOGS, id).catch(handleWriteError);
    }
  };

  // --- Monthly Payment & Settlement Core Actions ---
  const handleSetPaidStatus = (
    workerId: string,
    month: string,
    status: PaymentStatus,
    paymentDate?: string
  ) => {
    const paymentId = `${workerId}-${month}`;
    
    // Find associated completed or inspected work logs for this worker & month
    const associatedLogs = workLogs.filter(
      log => log.workerId === workerId && log.date.startsWith(month) && (log.status === 'completed' || log.status === 'inspected')
    );

    const associatedLogIds = associatedLogs.map(log => log.id);

    // Calculate total payout amount (Deducting NG items)
    // 月集計の支払額は小数点以下を切り捨て（整数円）にする
    const totalAmount = Math.floor(associatedLogs.reduce((sum, log) => {
      const job = jobs.find(j => j.id === log.jobId);
      const okQty = log.quantity - (log.ngQuantity || 0);
      return sum + (job ? okQty * job.unitPrice : 0);
    }, 0));

    // Update or Create Payment entry
    const existingPaymentIdx = payments.findIndex(p => p.id === paymentId);

    const paymentData: MonthlyPayment = {
      id: paymentId,
      workerId,
      month,
      totalAmount,
      paymentStatus: status,
      paymentDate: paymentDate || null,
      workLogIds: associatedLogIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingPaymentIdx > -1) {
      paymentData.createdAt = payments[existingPaymentIdx].createdAt;
    }

    // Propagate "Paid" status to associated work logs to lock them from edits
    const changedLogs = associatedLogs.map((log) => ({
      ...log,
      isPaid: status === 'paid',
      paymentId: status === 'paid' ? paymentId : null,
    }));

    // 支払いドキュメントと関連作業記録をFirestoreへ保存
    Promise.all([
      upsertItem(COLLECTIONS.PAYMENTS, paymentData),
      ...changedLogs.map((log) => upsertItem(COLLECTIONS.WORK_LOGS, log)),
    ]).catch(handleWriteError);
  };

  const handleUpdatePayment = (updatedPayment: MonthlyPayment) => {
    upsertItem(COLLECTIONS.PAYMENTS, updatedPayment).catch(handleWriteError);
  };

  // --- Copy Protection & Security ---
  const [bypassLock, setBypassLock] = useState<boolean>(false);
  const [bypassPassword, setBypassPassword] = useState<string>('');
  const [bypassError, setBypassError] = useState<string>('');

  // Domain Lock Verification
  const isDomainLocked = (() => {
    if (!settings.securityDomainLock) return false;
    const allowedDomains = settings.securityDomainLock
      .split(',')
      .map(d => d.trim().toLowerCase())
      .filter(Boolean);
    if (allowedDomains.length === 0) return false;
    
    const currentHost = window.location.hostname.toLowerCase();
    const isAllowed = allowedDomains.some(domain => {
      return currentHost === domain || currentHost.endsWith('.' + domain);
    });
    return !isAllowed;
  })();

  // Copy Protection Effect
  useEffect(() => {
    if (settings.securityBlockRightClick) {
      const handleContextMenu = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        alert('セキュリティ保護：このシステムでは右クリック及びコピー行為は禁止されています。');
      };
      const handleSelectStart = (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
      };
      
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('selectstart', handleSelectStart);
      document.body.classList.add('select-none');
      
      return () => {
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('selectstart', handleSelectStart);
        document.body.classList.remove('select-none');
      };
    }
  }, [settings.securityBlockRightClick]);

  // DevTools Key Blocks
  useEffect(() => {
    if (settings.securityBlockDevTools) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
          (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'j' || e.key === 'c')) ||
          (e.ctrlKey && e.key === 'u') ||
          (e.metaKey && e.key === 'u')
        ) {
          e.preventDefault();
          alert('セキュリティ保護：開発者ツール（デバッグ）の起動は制限されています。');
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [settings.securityBlockDevTools]);

  // Redirect activeTab if it becomes hidden or restricted
  useEffect(() => {
    if (settings.hiddenTabs.includes(activeTab)) {
      const allTabsOrder = ['dashboard', 'workers', 'jobs', 'logs', 'payments', 'bulletin'];
      const firstVisible = allTabsOrder.find(t => !settings.hiddenTabs.includes(t)) || 'dashboard';
      setActiveTab(firstVisible);
    }
  }, [settings, activeTab]);

  // License Domain Lock Render
  if (isDomainLocked && !bypassLock) {
    const handleBypassSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const adminPass = localStorage.getItem('homeworkers_credentials_dev') || 'admin';
      const backupPass = settings.securityBackupPassword || 'homeworkers-secure';
      if (bypassPassword === adminPass || bypassPassword === backupPass) {
        setBypassLock(true);
      } else {
        setBypassError('管理者パスコード、またはセキュリティ復元パスワードが正しくありません。');
      }
    };

    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-6 text-slate-100 font-sans">
        <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-md rounded-3xl p-8 border border-slate-700 shadow-2xl space-y-6 text-center">
          <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-400 mx-auto animate-pulse">
            <Lock className="w-7 h-7" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-black tracking-tight text-white">システム保護・ライセンスエラー</h2>
            <p className="text-[10px] text-rose-350 font-black font-mono bg-rose-500/10 px-2.5 py-1 rounded-lg inline-block">
              UNAUTHORIZED ENVIRONMENT: {window.location.hostname}
            </p>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            このソフトウェアは、コピー流出・改変を防ぐためのライセンス保護が有効化されています。現在の稼働環境は、許可されたドメインリストに登録されていません。
          </p>

          <div className="p-4 bg-slate-850 rounded-2xl border border-slate-750 text-left space-y-1.5 text-[10px] text-slate-400 leading-relaxed">
            <p className="font-bold text-slate-300">🛡️ 対策と解除方法：</p>
            <p>1. 許可されたドメイン（ホスト）からアクセスしてください。</p>
            <p>2. または、開発者パスワードまたは「セキュリティ復元用パスワード」を入力して一時的にロックをバイパスできます。</p>
          </div>

          <form onSubmit={handleBypassSubmit} className="space-y-3 text-left">
            <div>
              <label className="block text-[9px] font-bold text-slate-400 mb-1 pl-1">バイパスパスコード</label>
              <input
                type="password"
                placeholder="パスワードを入力"
                value={bypassPassword}
                onChange={(e) => {
                  setBypassPassword(e.target.value);
                  setBypassError('');
                }}
                className="w-full px-4 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-mono tracking-widest text-center focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              {bypassError && (
                <p className="text-[10px] text-rose-400 font-bold mt-1.5 text-center">{bypassError}</p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 transition-all text-xs font-bold text-white rounded-xl shadow-md cursor-pointer"
            >
              保護をバイパスしてログイン
            </button>
          </form>

          <p className="text-[9px] text-slate-500 font-medium font-mono">
            Homeworkers Copy-Guard Engine v2.5
          </p>
        </div>
      </div>
    );
  }

  // --- 認証ゲート (Googleログイン + 許可リスト) ---
  if (!authReady) {
    return <LoadingScreen message="認証を確認しています..." />;
  }
  if (!authUser) {
    return <GoogleLoginScreen />;
  }
  if (!accessReady) {
    return <LoadingScreen message="アクセス権を確認しています..." />;
  }
  if (!isAllowed) {
    return <AccessDeniedScreen email={authUser.email} />;
  }

  // Bulletin Notice text
  const bulletinText = localStorage.getItem('homeworkers_bulletin_text') || '【お知らせ】\nこちらにスタッフ・操作員向けのお知らせ、作業ルール、連絡事項などのカスタム表示ができます。開発者タブより自由に編集・更新が可能です。';

  return (
    <div className="min-h-screen bg-white flex flex-col text-slate-800">
      {/* Top Banner / Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Dynamic Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${settings.customLogoUrl ? '' : theme.primaryBg} rounded-lg flex items-center justify-center text-white shadow-xs transition-colors duration-350 overflow-hidden`}>
                {renderLogo()}
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5">
                  {settings.appName || '内職報酬管理システム'} 
                  <span className={`font-bold text-[10px] ${theme.text} bg-slate-50 px-1.5 py-0.5 rounded-md`}>v2.5</span>
                </h1>
                <p className="text-[9px] text-slate-400 font-bold mt-1 tracking-wider uppercase">Customizable Homeworkers Portal Engine</p>
              </div>
            </div>

            {/* Responsive Settings-Aware Tabs Navigation */}
            <div className="flex items-center gap-3.5">
              <nav className="flex gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                
                {/* Dashboard Tab */}
                {!settings.hiddenTabs.includes('dashboard') && (() => {
                  const { name, IconComponent } = getTabDetails('dashboard', 'ダッシュボード', LayoutDashboard);
                  return (
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'dashboard'
                          ? theme.activeTabClass
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      id="tab-dashboard"
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      {name}
                    </button>
                  );
                })()}
                
                {/* Workers Tab */}
                {!settings.hiddenTabs.includes('workers') && (() => {
                  const { name, IconComponent } = getTabDetails('workers', '内職担当者', Users);
                  return (
                    <button
                      onClick={() => setActiveTab('workers')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'workers'
                          ? theme.activeTabClass
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      id="tab-workers"
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      {name}
                    </button>
                  );
                })()}

                {/* Jobs Tab */}
                {!settings.hiddenTabs.includes('jobs') && (() => {
                  const { name, IconComponent } = getTabDetails('jobs', '作業マスタ', Briefcase);
                  return (
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'jobs'
                          ? theme.activeTabClass
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      id="tab-jobs"
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      {name}
                    </button>
                  );
                })()}

                {/* Work Progress Tab */}
                {!settings.hiddenTabs.includes('logs') && (() => {
                  const { name, IconComponent } = getTabDetails('logs', '作業・進捗管理', CalendarClock);
                  return (
                    <button
                      onClick={() => setActiveTab('logs')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'logs'
                          ? theme.activeTabClass
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      id="tab-logs"
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      {name}
                    </button>
                  );
                })()}

                {/* Payment Tab */}
                {!settings.hiddenTabs.includes('payments') && (() => {
                  const { name, IconComponent } = getTabDetails('payments', '支払い・明細発行', CreditCard);
                  return (
                    <button
                      onClick={() => setActiveTab('payments')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'payments'
                          ? theme.activeTabClass
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      id="tab-payments"
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      {name}
                    </button>
                  );
                })()}

                {/* Bulletin Notice Tab */}
                {!settings.hiddenTabs.includes('bulletin') && (() => {
                  const { name, IconComponent } = getTabDetails('bulletin', 'お知らせ・連絡事項', Megaphone);
                  return (
                    <button
                      onClick={() => setActiveTab('bulletin')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'bulletin'
                          ? theme.activeTabClass
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      id="tab-bulletin"
                    >
                      <IconComponent className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      {name}
                    </button>
                  );
                })()}

                {/* Software Contractor Settings Tab */}
                {(() => {
                  const { name, IconComponent } = getTabDetails('contractor-settings', '設定', Settings);
                  return (
                    <button
                      onClick={() => setActiveTab('contractor-settings')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'contractor-settings'
                          ? theme.activeTabClass
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      id="tab-contractor-settings"
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      {name}
                    </button>
                  );
                })()}

                {/* Developer Tab (開発者ロールのみ表示) */}
                {isDev && (() => {
                  const { name, IconComponent } = getTabDetails('developer', 'developer', Terminal);
                  return (
                    <button
                      onClick={() => setActiveTab('developer')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === 'developer'
                          ? theme.activeTabClass
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      id="tab-developer"
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      {name}
                    </button>
                  );
                })()}
              </nav>

              <button
                onClick={handleLogout}
                className="p-2 bg-slate-50 border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-xl transition-all cursor-pointer"
                title="システムからログアウトします"
                id="btn-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Viewport Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full"
          >
            {/* Render Tab Views */}
            {activeTab === 'dashboard' && !settings.hiddenTabs.includes('dashboard') && (
              <Dashboard
                workers={workers}
                jobs={jobs}
                workLogs={workLogs}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'workers' && !settings.hiddenTabs.includes('workers') && (
              <WorkerManager
                workers={workers}
                jobs={jobs}
                onAddWorker={handleAddWorker}
                onUpdateWorker={handleUpdateWorker}
                onDeleteWorker={handleDeleteWorker}
                workerLimit={settings.workerLimit}
              />
            )}

            {activeTab === 'jobs' && !settings.hiddenTabs.includes('jobs') && (
              <JobManager
                jobs={jobs}
                onAddJob={handleAddJob}
                onUpdateJob={handleUpdateJob}
              />
            )}

            {activeTab === 'logs' && !settings.hiddenTabs.includes('logs') && (
              <WorkLogManager
                workLogs={workLogs}
                workers={workers}
                jobs={jobs}
                onAddWorkLog={handleAddWorkLog}
                onUpdateWorkLog={handleUpdateWorkLog}
                onDeleteWorkLog={handleDeleteWorkLog}
              />
            )}

            {activeTab === 'payments' && !settings.hiddenTabs.includes('payments') && (
              <PaymentManager
                payments={payments}
                workers={workers}
                jobs={jobs}
                workLogs={workLogs}
                onUpdatePayment={handleUpdatePayment}
                onSetPaidStatus={handleSetPaidStatus}
              />
            )}

            {/* Custom Bulletin view */}
            {activeTab === 'bulletin' && !settings.hiddenTabs.includes('bulletin') && (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                  <div className={`w-10 h-10 ${theme.primaryBg} rounded-xl flex items-center justify-center text-white shadow-xs`}>
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-850">お仕事のお知らせ・作業マニュアル</h2>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">管理者から内職スタッフの皆様への伝達事項です</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed font-semibold whitespace-pre-wrap font-sans min-h-[300px]">
                  {bulletinText}
                </div>

                <div className="text-center pt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  最終更新: リアルタイム同期中
                </div>
              </div>
            )}

             {activeTab === 'contractor-settings' && (
              <ContractorSettings
                onSettingsChange={() => setSettings(loadSettings())}
                onDataReset={handleDataReset}
              />
            )}

            {activeTab === 'developer' && isDev && (
              <DeveloperManager
                onSettingsChange={() => setSettings(loadSettings())}
                currentEmail={authUser.email}
                accessConfig={accessConfig}
                workers={workers}
                jobs={jobs}
                workLogs={workLogs}
                payments={payments}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Humble Elegant Footer */}
      <footer className="bg-white border-t border-slate-100 py-4 text-center text-[10px] text-slate-400 font-medium print:hidden">
        {settings.appName || '内職報酬計算・管理システム'} © 2026 | 全データはブラウザのLocalStorageに安全に保存されています。
      </footer>
    </div>
  );
}

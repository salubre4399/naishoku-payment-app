/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Worker, Job, WorkLog, WorkStatus } from '../types';
import { formatYen, exportToCSV } from '../utils';
import { 
  Plus, Edit2, Trash2, Search, Filter, X, Calendar, 
  User, FileText, CheckCircle2, ChevronRight, FileDown, 
  Percent, AlertTriangle, CheckCircle, Mail, Phone, Landmark,
  Clock, Activity, ArrowUpRight, CheckSquare, Sparkles
} from 'lucide-react';

interface WorkLogManagerProps {
  workLogs: WorkLog[];
  workers: Worker[];
  jobs: Job[];
  onAddWorkLog: (log: Omit<WorkLog, 'id' | 'isPaid' | 'paymentId' | 'createdAt'>) => void;
  onUpdateWorkLog: (log: WorkLog) => void;
  onDeleteWorkLog: (id: string) => void;
  workerLimit?: number;
}

export default function WorkLogManager({
  workLogs,
  workers,
  jobs,
  onAddWorkLog,
  onUpdateWorkLog,
  onDeleteWorkLog,
}: WorkLogManagerProps) {
  // Tabs: Find first active worker to set as default, or fallback to 'all'
  const activeWorkersList = workers.filter(w => w.isActive);
  const [activeWorkerId, setActiveWorkerId] = useState<string>(
    activeWorkersList.length > 0 ? activeWorkersList[0].id : 'all'
  );

  // New assignment modal form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<WorkLog | null>(null);

  // Status Change Popup state for ongoing work items
  const [statusUpdateLog, setStatusUpdateLog] = useState<WorkLog | null>(null);
  const [updateNgQuantity, setUpdateNgQuantity] = useState<number>(0);
  const [updateNotes, setUpdateNotes] = useState<string>('');
  const [updateHandedOverDate, setUpdateHandedOverDate] = useState<string>('');
  const [updateDueDate, setUpdateDueDate] = useState<string>('');
  const [updateDeliveredDate, setUpdateDeliveredDate] = useState<string>('');

  // Filters for bottom completed logs list
  const [filterWorker, setFilterWorker] = useState<string>('all');
  const [filterJob, setFilterJob] = useState<string>('all');
  const [searchNotes, setSearchNotes] = useState<string>('');

  // New Request Form input states
  const [workerId, setWorkerId] = useState('');
  const [jobId, setJobId] = useState('');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().substring(0, 10)); // Default today
  const [dueDate, setDueDate] = useState('');
  const [handedOverDate, setHandedOverDate] = useState('');
  const [autoHandover, setAutoHandover] = useState(false); // If true, registers pickup/handover immediately
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const [filterCompatibleOnly, setFilterCompatibleOnly] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>(''); // 大カテゴリー（依頼先の部署）

  // Dropdowns lists (only active ones for new logging, but keep inactive if editing an old log)
  const activeWorkers = workers.filter(w => w.isActive || (editingLog && editingLog.workerId === w.id));
  const activeJobs = jobs.filter(j => j.isActive || (editingLog && editingLog.jobId === j.id));

  // Determine displayed jobs for selected worker
  const selectedWorkerObj = workers.find(w => w.id === workerId);
  const workerHasCompatibility = !!(selectedWorkerObj && selectedWorkerObj.allowedJobIds && selectedWorkerObj.allowedJobIds.length > 0);
  
  const displayedJobs = activeJobs.filter(j => {
    if (filterCompatibleOnly && workerHasCompatibility) {
      return selectedWorkerObj!.allowedJobIds!.includes(j.id);
    }
    return true;
  });

  // 大カテゴリー（依頼先の部署）で絞り込む
  const deptOf = (j?: Job | null) => (j?.department?.trim()) || '部署未設定';
  const departments = Array.from(new Set(displayedJobs.map((j) => deptOf(j))));
  const selectedJobObj = jobs.find((j) => j.id === jobId);
  const effectiveDept = departments.includes(selectedDept)
    ? selectedDept
    : (departments.includes(deptOf(selectedJobObj)) ? deptOf(selectedJobObj) : (departments[0] || ''));
  const deptJobs = displayedJobs.filter((j) => deptOf(j) === effectiveDept);

  // Group department-filtered jobs by category for optgroup rendering
  const jobsByCategory = deptJobs.reduce((acc, job) => {
    const catName = job.category?.trim() || '未分類';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(job);
    return acc;
  }, {} as Record<string, Job[]>);

  // Reset new request form
  const resetForm = () => {
    const firstActiveWorkerId = workers.find(w => w.isActive)?.id || workers[0]?.id || '';
    setWorkerId(firstActiveWorkerId);

    const firstActiveWorker = workers.find(w => w.id === firstActiveWorkerId);
    const hasAllowed = !!(firstActiveWorker && firstActiveWorker.allowedJobIds && firstActiveWorker.allowedJobIds.length > 0);
    
    let defaultJobId = jobs.find(j => j.isActive)?.id || jobs[0]?.id || '';
    if (hasAllowed) {
      setFilterCompatibleOnly(true);
      const matched = jobs.find(j => j.isActive && firstActiveWorker!.allowedJobIds!.includes(j.id));
      if (matched) defaultJobId = matched.id;
    } else {
      setFilterCompatibleOnly(false);
    }

    setJobId(defaultJobId);
    setRequestDate(new Date().toISOString().substring(0, 10));
    setDueDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)); // Default today + 3 days
    setHandedOverDate(new Date().toISOString().substring(0, 10));
    setAutoHandover(false);
    setQuantity(0);
    setNotes('');
    setSelectedDept('');
    setEditingLog(null);
    setIsFormOpen(false);
  };

  const handleOpenAddForWorker = (wId: string) => {
    resetForm();
    setWorkerId(wId);
    const w = workers.find(x => x.id === wId);
    const hasAllowed = !!(w && w.allowedJobIds && w.allowedJobIds.length > 0);
    
    let defaultJobId = activeJobs[0]?.id || '';
    if (hasAllowed) {
      setFilterCompatibleOnly(true);
      const matched = activeJobs.find(j => w!.allowedJobIds!.includes(j.id));
      if (matched) defaultJobId = matched.id;
    } else {
      setFilterCompatibleOnly(false);
    }
    setJobId(defaultJobId);
    setIsFormOpen(true);
  };

  const handleOpenAddGlobal = () => {
    resetForm();
    let targetWorkerId = '';
    if (activeWorkerId !== 'all') {
      targetWorkerId = activeWorkerId;
    } else if (activeWorkers.length > 0) {
      targetWorkerId = activeWorkers[0].id;
    }
    setWorkerId(targetWorkerId);

    const w = workers.find(x => x.id === targetWorkerId);
    const hasAllowed = !!(w && w.allowedJobIds && w.allowedJobIds.length > 0);
    
    let defaultJobId = activeJobs[0]?.id || '';
    if (hasAllowed) {
      setFilterCompatibleOnly(true);
      const matched = activeJobs.find(j => w!.allowedJobIds!.includes(j.id));
      if (matched) defaultJobId = matched.id;
    } else {
      setFilterCompatibleOnly(false);
    }
    setJobId(defaultJobId);
    setIsFormOpen(true);
  };

  // 依頼済みの作業内容を修正するためにフォームを編集モードで開く
  const handleOpenEditRequest = (log: WorkLog) => {
    resetForm();
    setEditingLog(log);
    setWorkerId(log.workerId);
    setJobId(log.jobId);
    setRequestDate(log.requestDate || log.date);
    setDueDate(log.dueDate || log.date);
    setQuantity(log.quantity);
    setNotes(log.notes || '');
    setAutoHandover(!!log.handedOverDate);
    setHandedOverDate(log.handedOverDate || new Date().toISOString().substring(0, 10));
    const w = workers.find((x) => x.id === log.workerId);
    setFilterCompatibleOnly(!!(w && w.allowedJobIds && w.allowedJobIds.length > 0));
    setIsFormOpen(true);
  };

  // Submission for new request (Quantity + Delivery Date only!)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId || !jobId || quantity <= 0 || !requestDate) return;

    const logData = {
      workerId,
      jobId,
      date: autoHandover ? dueDate : requestDate, // For completed logs, date will group under delivery, initially under request/due
      requestDate,
      handedOverDate: autoHandover ? handedOverDate : undefined,
      dueDate, // 入力された納品予定日は常に保持する（未受取でも破棄しない）
      quantity,
      ngQuantity: 0, // No NG during initial creation request
      status: (autoHandover ? 'ongoing' : 'unstarted') as WorkStatus,
      notes,
    };

    if (editingLog) {
      onUpdateWorkLog({
        ...editingLog,
        ...logData,
        ngQuantity: editingLog.ngQuantity || 0,
        status: editingLog.status, // preserve status unless explicitly changed in status popup
      });
    } else {
      onAddWorkLog(logData);
    }
    resetForm();
  };

  // Open status update modal for work logs
  const handleOpenStatusUpdate = (log: WorkLog) => {
    setStatusUpdateLog(log);
    setUpdateNgQuantity(log.ngQuantity || 0);
    setUpdateNotes(log.notes || '');
    setUpdateHandedOverDate(log.handedOverDate || new Date().toISOString().substring(0, 10));
    setUpdateDueDate(log.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
    setUpdateDeliveredDate(log.deliveredDate || new Date().toISOString().substring(0, 10));
  };

  // Submit status update & NG registration
  const handleStatusUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusUpdateLog) return;

    // Determine target status
    let targetStatus = statusUpdateLog.status;
    let finalHandedOverDate = statusUpdateLog.handedOverDate;
    let finalDueDate = statusUpdateLog.dueDate;
    let finalDeliveredDate = statusUpdateLog.deliveredDate;
    let finalDate = statusUpdateLog.date;
    let finalNgQuantity = statusUpdateLog.ngQuantity || 0;

    if (statusUpdateLog.status === 'unstarted') {
      // Transition 1: unstarted -> ongoing (Pick up)
      targetStatus = 'ongoing';
      finalHandedOverDate = updateHandedOverDate;
      finalDueDate = updateDueDate;
    } else if (statusUpdateLog.status === 'ongoing') {
      // Transition 2: ongoing -> completed (Deliver + Inspect)
      if (updateNgQuantity > statusUpdateLog.quantity) {
        alert("NG数は依頼数量を超えることはできません。");
        return;
      }
      targetStatus = 'completed';
      finalDeliveredDate = updateDeliveredDate;
      finalDate = updateDeliveredDate; // Stored in date for archive/payment compatibility
      finalNgQuantity = updateNgQuantity;
    } else if (statusUpdateLog.status === 'completed') {
      // Edit mode for already completed
      if (updateNgQuantity > statusUpdateLog.quantity) {
        alert("NG数は依頼数量を超えることはできません。");
        return;
      }
      finalDeliveredDate = updateDeliveredDate;
      finalDate = updateDeliveredDate;
      finalNgQuantity = updateNgQuantity;
    }

    onUpdateWorkLog({
      ...statusUpdateLog,
      status: targetStatus,
      handedOverDate: finalHandedOverDate,
      dueDate: finalDueDate,
      deliveredDate: finalDeliveredDate,
      date: finalDate,
      ngQuantity: finalNgQuantity,
      notes: updateNotes,
    });

    setStatusUpdateLog(null);
  };

  // Filter logs for selected tab view
  const allLogsFiltered = workLogs.filter(log => {
    if (activeWorkerId !== 'all') {
      return log.workerId === activeWorkerId;
    }
    return true;
  });

  // Split into active (ongoing) vs completed logs
  // Ongoing: everything not completed
  const ongoingLogs = allLogsFiltered.filter(log => log.status !== 'completed')
    .sort((a, b) => a.date.localeCompare(b.date)); // Sort by due date (earlier first)

  // Completed: everything completed
  const completedLogs = allLogsFiltered.filter(log => log.status === 'completed' && !log.isPaid)
    .filter(log => {
      if (activeWorkerId === 'all') {
        if (filterWorker !== 'all' && log.workerId !== filterWorker) return false;
      }
      if (filterJob !== 'all' && log.jobId !== filterJob) return false;
      if (searchNotes.trim() && !log.notes.toLowerCase().includes(searchNotes.toLowerCase())) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));

  // Paid/Archived logs: everything paid
  const paidLogs = allLogsFiltered.filter(log => log.status === 'completed' && log.isPaid)
    .filter(log => {
      if (activeWorkerId === 'all') {
        if (filterWorker !== 'all' && log.workerId !== filterWorker) return false;
      }
      if (filterJob !== 'all' && log.jobId !== filterJob) return false;
      if (searchNotes.trim() && !log.notes.toLowerCase().includes(searchNotes.toLowerCase())) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));

  // Worker stats calculation
  const getWorkerStats = (wId: string) => {
    const logs = workLogs.filter(log => log.workerId === wId);
    const completed = logs.filter(l => l.status === 'completed');
    const totalQty = completed.reduce((sum, l) => sum + l.quantity, 0);
    const totalNg = completed.reduce((sum, l) => sum + (l.ngQuantity || 0), 0);
    const totalOk = totalQty - totalNg;
    const successRate = totalQty > 0 ? Math.round((totalOk / totalQty) * 100) : 100;

    const totalCalculatedPay = logs.reduce((sum, log) => {
      if (log.status === 'completed') {
        const job = jobs.find(j => j.id === log.jobId);
        const ok = log.quantity - (log.ngQuantity || 0);
        return sum + (job ? ok * job.unitPrice : 0);
      }
      return sum;
    }, 0);

    return {
      totalJobsAssigned: logs.length,
      ongoingJobs: logs.filter(l => l.status !== 'completed').length,
      completedJobs: completed.length,
      totalOk,
      totalNg,
      successRate,
      totalCalculatedPay
    };
  };

  // Export Filtered logs to CSV
  const handleCSVExport = () => {
    const headers = ['日付', '担当者名', '作業内容', '単価', '総完成数', '良品数', 'NG数', '成果報酬額', 'ステータス', '精算状況', 'メモ'];
    const rows = completedLogs.map(log => {
      const worker = workers.find(w => w.id === log.workerId);
      const job = jobs.find(j => j.id === log.jobId);
      const unitPrice = job ? job.unitPrice : 0;
      const ng = log.ngQuantity || 0;
      const ok = log.quantity - ng;
      const payStatus = log.isPaid ? '精算済' : '未精算';

      return [
        log.date,
        worker ? worker.name : '不明',
        job ? job.name : '不明',
        `${unitPrice}円`,
        String(log.quantity),
        String(ok),
        String(ng),
        `${Math.round(ok * unitPrice * 100) / 100}円`,
        '完了',
        payStatus,
        log.notes
      ];
    });

    const exportName = activeWorkerId === 'all' 
      ? '全員分' 
      : (workers.find(w => w.id === activeWorkerId)?.name || '担当者');

    exportToCSV(`内職実績履歴_${exportName}_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
  };

  const activeWorker = workers.find(w => w.id === activeWorkerId);
  const activeWorkerStats = activeWorker ? getWorkerStats(activeWorker.id) : null;

  return (
    <div className="space-y-6">
      
      {/* 1. Worker Tabs Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">
          担当者ごとの進捗・作業依頼管理
        </p>
        <div className="flex flex-wrap gap-1.5" id="worker-tab-list">
          {workers.map(w => (
            <button
              key={w.id}
              onClick={() => setActiveWorkerId(w.id)}
              className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                activeWorkerId === w.id
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
              id={`tab-worker-${w.id}`}
            >
              <User className="w-3.5 h-3.5" />
              {w.name}
              {!w.isActive && <span className="text-[9px] opacity-70">(休止中)</span>}
            </button>
          ))}
          <button
            onClick={() => setActiveWorkerId('all')}
            className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              activeWorkerId === 'all'
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            id="tab-worker-all"
          >
            <Filter className="w-3.5 h-3.5" />
            全員分の履歴一覧
          </button>
        </div>
      </div>

      {/* 2. Worker Profile & Stats Card (Show only if worker tab is selected) */}
      {activeWorker && activeWorkerStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
          
          {/* Left: Contact Profile */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-700 text-sm">
                {activeWorker.name[0]}
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                  {activeWorker.name}
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                    activeWorker.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {activeWorker.isActive ? '稼働中' : '休止中'}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">内職登録者情報</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 font-semibold">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{activeWorker.phone || '連絡先なし'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="truncate">{activeWorker.email || 'メール未登録'}</span>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t border-slate-50">
                <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-700">【振込先口座】</p>
                  {activeWorker.bankName ? (
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {activeWorker.bankName} {activeWorker.bankBranch}<br />
                      {activeWorker.bankAccountType} {activeWorker.bankAccountNumber}<br />
                      名義: {activeWorker.bankAccountHolder}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic font-medium">振込口座未登録</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => handleOpenAddForWorker(activeWorker.id)}
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
                id={`btn-add-for-worker-${activeWorker.id}`}
              >
                <Plus className="w-3.5 h-3.5" />
                この担当者に作業依頼を行う
              </button>
            </div>
          </div>

          {/* Right: Detailed Performance Stats Grid */}
          <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">品質・成果パフォーマンス実績</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">検品が「完了」した全期間の実績値より算出しています</p>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-black font-mono">
                累計案件数: {activeWorkerStats.totalJobsAssigned}件
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-5">
              
              <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100/50">
                <span className="text-[10px] font-bold text-slate-400 block">精算済累計報酬</span>
                <span className="text-base font-extrabold text-indigo-700 font-mono mt-1 block">
                  {formatYen(activeWorkerStats.totalCalculatedPay)}
                </span>
              </div>

              <div className="p-3.5 bg-emerald-50/40 rounded-xl border border-emerald-100/50">
                <span className="text-[10px] font-bold text-slate-400 block">合格品数 (OK品)</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono mt-1 block">
                  {activeWorkerStats.totalOk.toLocaleString()} <span className="text-[10px] font-bold">個</span>
                </span>
              </div>

              <div className="p-3.5 bg-rose-50/40 rounded-xl border border-rose-100/50">
                <span className="text-[10px] font-bold text-slate-400 block">不合格品数 (NG品)</span>
                <span className="text-base font-extrabold text-rose-700 font-mono mt-1 block">
                  {activeWorkerStats.totalNg.toLocaleString()} <span className="text-[10px] font-bold">個</span>
                </span>
              </div>

              <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-100/50">
                <span className="text-[10px] font-bold text-slate-400 block">良品率実績</span>
                <span className="text-base font-extrabold text-amber-700 font-mono mt-1 block flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5" />
                  {activeWorkerStats.successRate}%
                </span>
              </div>

            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                完全成果報酬型のため、不良品(NG品)の個数は検品完了時に差し引かれて報酬計算がされます。
              </span>
            </div>
          </div>

        </div>
      )}

      {/* 3. PROMINENT ACTIVE/ONGOING ASSIGNMENTS GRID (現在進行中の案件の大きくポップアップ/カード表示) */}
      <div className="bg-slate-100/60 p-6 rounded-3xl border border-slate-200/80 space-y-4">
        <div className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
            <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-1.5">
              【現在依頼中・進行中の作業案件】
              <span className="bg-indigo-100 text-indigo-700 font-mono text-[10px] font-black px-2 py-0.5 rounded-md">
                {ongoingLogs.length}件 進行中
              </span>
            </h3>
          </div>
        </div>

        {ongoingLogs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" id="ongoing-jobs-grid">
            {ongoingLogs.map((log) => {
              const worker = workers.find(w => w.id === log.workerId);
              const job = jobs.find(j => j.id === log.jobId);
              const unitPrice = job ? job.unitPrice : 0;
              const expectedPayout = log.quantity * unitPrice;

              let progressBadgeColor = 'bg-slate-100 text-slate-600 border-slate-200';
              let progressLabel = '① 依頼中';
              if (log.status === 'ongoing') {
                progressBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
                progressLabel = '② 作業中';
              }

              return (
                <div 
                  key={log.id} 
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4 relative overflow-hidden group"
                >
                  {/* Subtle top indicator band */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
                  
                  {/* Worker & Due Date Row */}
                  <div className="flex justify-between items-start">
                    <div>
                      {activeWorkerId === 'all' && (
                        <div className="text-xs font-black text-slate-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {worker ? worker.name : '削除済'}
                        </div>
                      )}
                      <div className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5">ASSIGNMENT ORDER</div>
                    </div>
                    
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${progressBadgeColor}`}>
                      {progressLabel}
                    </span>
                  </div>

                  {/* Job Details Row */}
                  <div className="space-y-1 pt-1">
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {job ? job.name : '削除済'}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-semibold">単価: {formatYen(unitPrice)}</p>
                  </div>

                  {/* Quantity & Due Date Widget */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs font-semibold text-slate-650 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 font-bold">依頼数量:</span>
                      <span className="text-slate-800 font-black font-mono">{log.quantity.toLocaleString()} 個</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[10px] text-slate-400 font-bold">依頼日:</span>
                      <span className="text-slate-700 font-mono font-bold">{log.requestDate || log.date}</span>
                    </div>
                    {log.status === 'ongoing' ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[10px] text-slate-400 font-bold">商品受取日:</span>
                          <span className="text-amber-700 font-mono font-bold">{log.handedOverDate || '-'}</span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 mt-1.5">
                          <span className="text-[10px] text-slate-400 font-bold">納品予定日:</span>
                          <span className="text-indigo-600 font-black font-mono inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {log.dueDate || log.date}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 mt-1.5">
                        <span className="text-[10px] text-slate-400 font-bold">納品予定日:</span>
                        <span className="text-slate-500 font-mono font-bold">{log.dueDate || log.date}</span>
                      </div>
                    )}
                  </div>

                  {/* Estimated payout */}
                  <div className="flex justify-between items-center text-xs border-t border-slate-150 pt-3">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block">満額合格時報酬</span>
                      <span className="text-slate-900 font-extrabold font-mono text-xs">{formatYen(expectedPayout)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {/* 依頼内容の修正 */}
                      <button
                        onClick={() => handleOpenEditRequest(log)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="依頼内容を修正する"
                        id={`btn-edit-ongoing-${log.id}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {/* 依頼の削除（間違えたとき用） */}
                      <button
                        onClick={() => onDeleteWorkLog(log.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                        title="この依頼を削除する"
                        id={`btn-delete-ongoing-${log.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {/* Primary Popup Trigger Button */}
                      <button
                        onClick={() => handleOpenStatusUpdate(log)}
                        className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-xl shadow-xs transition-all cursor-pointer"
                        id={`btn-update-ongoing-${log.id}`}
                      >
                        <Activity className="w-3.5 h-3.5 text-indigo-100" />
                        {log.status === 'unstarted' ? '商品を渡す (受取登録)' : '納品・検品を登録する'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-indigo-400 mx-auto animate-bounce" />
            <p className="text-xs font-black text-slate-700">現在進行中、または検品前の作業依頼はありません。</p>
            <p className="text-[10px] text-slate-400 font-medium">
              作業依頼は、各内職スタッフのプロフィール欄にある「この担当者に作業依頼を行う」ボタンより新規作成できます。
            </p>
          </div>
        )}
      </div>

      {/* 4. Filter block for Completed Logs list below */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-slate-800 tracking-tight uppercase">【過去の検品完了・履歴一覧】</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              すでに検品が「完了」となり、お支払い算出対象となっている作業の履歴です。
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCSVExport}
              disabled={completedLogs.length === 0}
              className="inline-flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-xl cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-500" />
              実績CSV出力
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {activeWorkerId === 'all' && (
            <div className="flex items-center gap-1.5 text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-500">担当者:</span>
              <select
                value={filterWorker}
                onChange={(e) => setFilterWorker(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-1 px-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer"
                id="filter-worker-select"
              >
                <option value="all">全員</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-500">作業種別:</span>
            <select
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1 px-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer"
              id="filter-job-select"
            >
              <option value="all">すべて</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-48 sm:ml-auto">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="メモの検索..."
              value={searchNotes}
              onChange={(e) => setSearchNotes(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              id="filter-search-notes"
            />
          </div>
        </div>
      </div>

      {/* 5. Completed Logs Table (Unpaid Completed Logs) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 text-[10px] font-black text-slate-400 tracking-wider">
          未精算の検品完了ログ ({completedLogs.length}件)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-black bg-slate-50/70 uppercase text-[10px]">
                <th className="py-3 px-4">納品日(検品完了日)</th>
                {activeWorkerId === 'all' && <th className="py-3 px-4">担当者</th>}
                <th className="py-3 px-4">作業内容</th>
                <th className="py-3 px-4 text-right">単価</th>
                <th className="py-3 px-4 text-right">依頼数量</th>
                <th className="py-3 px-4 text-right">合格数 (良品)</th>
                <th className="py-3 px-4 text-right">不良数 (NG)</th>
                <th className="py-3 px-4 text-right">決定報酬額</th>
                <th className="py-3 px-4 text-center">ステータス</th>
                <th className="py-3 px-4">メモ</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {completedLogs.map((log) => {
                const worker = workers.find(w => w.id === log.workerId);
                const job = jobs.find(j => j.id === log.jobId);
                const unitPrice = job ? job.unitPrice : 0;
                const ng = log.ngQuantity || 0;
                const ok = log.quantity - ng;
                const finalPay = ok * unitPrice;

                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-semibold whitespace-nowrap">{log.date}</td>
                    {activeWorkerId === 'all' && (
                      <td className="py-3 px-4 text-slate-850 font-black whitespace-nowrap">{worker ? worker.name : '削除済'}</td>
                    )}
                    <td className="py-3 px-4 text-slate-600 font-bold truncate max-w-[150px]">{job ? job.name : '削除済'}</td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono font-bold">{formatYen(unitPrice)}</td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono font-semibold">{log.quantity.toLocaleString()} 個</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-mono font-black bg-emerald-50/10">{ok.toLocaleString()} 個</td>
                    <td className="py-3 px-4 text-right text-rose-600 font-mono font-black bg-rose-50/5">{ng > 0 ? `${ng.toLocaleString()} 個` : '0'}</td>
                    <td className="py-3 px-4 text-right text-slate-900 font-black font-mono text-[13px]">{formatYen(finalPay)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        検品合格 (未精算)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{log.notes || <span className="text-slate-300">-</span>}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenStatusUpdate(log)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
                          title="ステータス・NG数を編集"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteWorkLog(log.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {completedLogs.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                    該当する未精算の検品完了記録はありません。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Archived/Paid Logs Table (Paid Logs lower list) */}
      {paidLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden opacity-75">
          <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-400 tracking-wider flex justify-between items-center">
            <span>過去のお支払い精算完了分（アーカイブ済）</span>
            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black">{paidLogs.length}件</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-black bg-slate-50/70 uppercase text-[9px]">
                  <th className="py-2.5 px-4">完了日</th>
                  {activeWorkerId === 'all' && <th className="py-2.5 px-4">担当者</th>}
                  <th className="py-2.5 px-4">作業内容</th>
                  <th className="py-2.5 px-4 text-right">単価</th>
                  <th className="py-2.5 px-4 text-right">依頼総数</th>
                  <th className="py-2.5 px-4 text-right">良品合格数</th>
                  <th className="py-2.5 px-4 text-right">不良数(NG)</th>
                  <th className="py-2.5 px-4 text-right">支給済額</th>
                  <th className="py-2.5 px-4 text-center">支払精算</th>
                  <th className="py-2.5 px-4">メモ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paidLogs.map((log) => {
                  const worker = workers.find(w => w.id === log.workerId);
                  const job = jobs.find(j => j.id === log.jobId);
                  const unitPrice = job ? job.unitPrice : 0;
                  const ng = log.ngQuantity || 0;
                  const ok = log.quantity - ng;

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 text-slate-500">
                      <td className="py-2.5 px-4 font-semibold">{log.date}</td>
                      {activeWorkerId === 'all' && (
                        <td className="py-2.5 px-4 font-black">{worker ? worker.name : '削除済'}</td>
                      )}
                      <td className="py-2.5 px-4 font-bold">{job ? job.name : '削除済'}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-medium">{formatYen(unitPrice)}</td>
                      <td className="py-2.5 px-4 text-right font-mono">{log.quantity.toLocaleString()} 個</td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-black">{ok.toLocaleString()} 個</td>
                      <td className="py-2.5 px-4 text-right font-mono text-rose-600">{ng > 0 ? `${ng.toLocaleString()} 個` : '0'}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700">{formatYen(ok * unitPrice)}</td>
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          精算・振込済
                        </span>
                      </td>
                      <td className="py-2.5 px-4 truncate max-w-[150px]">{log.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* 7. NEW REQUEST MODAL (依頼数 ＋ 納品予定日の入力) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  {editingLog ? '作業依頼の内容を修正' : '新規の作業依頼（ステップ①）'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
                  id="btn-close-log-form"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {activeWorkers.length === 0 || activeJobs.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-100 text-amber-800 text-xs rounded-xl font-bold">
                  お仕事の依頼を行う前に、有効な「内職担当者」および「作業マスタ」をそれぞれ登録してください。
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Worker Select */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">作業を依頼する担当者 <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={workerId}
                      onChange={(e) => {
                        const nextWorkerId = e.target.value;
                        setWorkerId(nextWorkerId);
                        const w = workers.find(x => x.id === nextWorkerId);
                        const hasAllowed = !!(w && w.allowedJobIds && w.allowedJobIds.length > 0);
                        let defaultJobId = jobId;
                        if (hasAllowed) {
                          setFilterCompatibleOnly(true);
                          const matched = activeJobs.find(j => w!.allowedJobIds!.includes(j.id));
                          if (matched) defaultJobId = matched.id;
                        } else {
                          setFilterCompatibleOnly(false);
                        }
                        setJobId(defaultJobId);
                        setSelectedDept('');
                      }}
                      disabled={activeWorkerId !== 'all'}
                      className="disabled:opacity-75 disabled:bg-slate-100 w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer"
                      id="form-worker-select"
                    >
                      {activeWorkers.map(w => (
                        <option key={w.id} value={w.id}>{w.name} {!w.isActive && '(休止中)'}</option>
                      ))}
                    </select>
                  </div>

                  {/* 大カテゴリー（依頼先の部署）Select */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">大カテゴリー（依頼先の部署・場所） <span className="text-red-500">*</span></label>
                    <select
                      value={effectiveDept}
                      onChange={(e) => {
                        const dept = e.target.value;
                        setSelectedDept(dept);
                        const firstJob = displayedJobs.find((j) => deptOf(j) === dept);
                        if (firstJob) setJobId(firstJob.id);
                      }}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer"
                      id="form-dept-select"
                    >
                      {departments.length === 0 ? (
                        <option value="">(作業マスタがありません)</option>
                      ) : (
                        departments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Job Select */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">作業内容（作業項目） <span className="text-red-500">*</span></label>
                    <select
                      required
                      value={jobId}
                      onChange={(e) => setJobId(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold cursor-pointer mb-2"
                      id="form-job-select"
                    >
                      {Object.keys(jobsByCategory).length === 0 ? (
                        <option value="">(表示可能な作業がありません)</option>
                      ) : (
                        Object.entries(jobsByCategory).map(([catName, catJobs]) => (
                          <optgroup key={catName} label={`📁 ${catName}`}>
                            {catJobs.map(j => (
                              <option key={j.id} value={j.id}>{j.name} ({j.unitPrice}円/個)</option>
                            ))}
                          </optgroup>
                        ))
                      )}
                    </select>

                    {/* Compatibility Toggle option */}
                    {workerHasCompatibility && (
                      <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                        <input
                          type="checkbox"
                          checked={filterCompatibleOnly}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            setFilterCompatibleOnly(isChecked);
                            if (isChecked && selectedWorkerObj && selectedWorkerObj.allowedJobIds) {
                              const isCurrentCompatible = selectedWorkerObj.allowedJobIds.includes(jobId);
                              if (!isCurrentCompatible) {
                                const matched = activeJobs.find(j => selectedWorkerObj.allowedJobIds!.includes(j.id));
                                if (matched) setJobId(matched.id);
                              }
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                        <span>この担当者の対応可能な作業に絞り込む (未設定も含めすべて対応可能な場合を除く)</span>
                      </label>
                    )}
                  </div>

                  {/* Request Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      作業依頼日 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                      id="form-request-date"
                    />
                  </div>

                  {/* Scheduled Delivery Date / 納品予定日 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      納品予定日 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                      id="form-date-input"
                    />
                  </div>

                  {/* Quantity / 依頼数量 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      依頼数量 (完成予定数) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="例) 1000"
                      value={quantity || ''}
                      onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                      id="form-quantity-input"
                    />
                  </div>

                  {/* Expected Reward Live Display */}
                  {quantity > 0 && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500">
                        <span>見込み総良品数:</span>
                        <span className="text-slate-800">{quantity.toLocaleString()} 個</span>
                      </div>
                      <div className="flex justify-between text-xs font-black text-indigo-600 pt-1 border-t border-slate-100">
                        <span>満額検品時見込み報酬:</span>
                        <span>
                          {formatYen(quantity * (jobs.find(j => j.id === jobId)?.unitPrice || 0))}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Checkbox for auto handover */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoHandover}
                        onChange={(e) => setAutoHandover(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-700">すでに受け取り完了（スタッフが引き取り済）</span>
                    </label>
                    
                    {autoHandover && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-200 animate-in fade-in duration-200">
                        <label className="block text-[10px] font-bold text-slate-500">
                          実際に引き渡した日
                        </label>
                        <input
                          type="date"
                          required
                          value={handedOverDate}
                          onChange={(e) => setHandedOverDate(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">作業に関する指示・メモ</label>
                    <textarea
                      rows={3}
                      placeholder="「〇日に納品、合格」「一部シワ注意」など"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                      id="form-notes-textarea"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-6 border-t border-slate-100 font-bold text-xs">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer text-center"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer text-center"
                    >
                      {editingLog ? '依頼内容を保存する' : '依頼を送信する'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. STATUS UPDATE & NG REGISTRATION DEDICATED POPUP (進捗ステータス・NG検品入力の大きくポップアップ表示) */}
      {statusUpdateLog && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <div>
                <span className="text-[9px] bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                  3-STEP WORKFLOW MANAGER
                </span>
                <h3 className="text-base font-black text-slate-800 mt-1">
                  {statusUpdateLog.status === 'unstarted' && '【ステップ②：内職者への引き渡し（作業開始登録）】'}
                  {statusUpdateLog.status === 'ongoing' && '【ステップ③：納品および検品（NG数の登録・清算確定）】'}
                  {statusUpdateLog.status === 'completed' && '【検品・完了データの修正・編集】'}
                </h3>
              </div>
              <button
                onClick={() => setStatusUpdateLog(null)}
                className="p-1.5 hover:bg-slate-200/50 rounded-xl text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleStatusUpdateSubmit} className="p-6 space-y-5">
              
              {/* Overview Details in Modal */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 text-xs font-semibold text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">依頼担当者</span>
                  <span className="text-slate-800 font-bold text-[13px]">
                    {workers.find(w => w.id === statusUpdateLog.workerId)?.name || '不明'} 様
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">内職の作業項目</span>
                  <span className="text-slate-800 font-bold text-[13px] block truncate">
                    {jobs.find(j => j.id === statusUpdateLog.jobId)?.name || '不明'}
                  </span>
                </div>
                <div className="border-t border-slate-200/50 pt-2">
                  <span className="text-[10px] text-slate-400 block mb-0.5">予定（依頼）数量</span>
                  <span className="text-slate-800 font-bold font-mono text-[13px]">
                    {statusUpdateLog.quantity.toLocaleString()} 個
                  </span>
                </div>
                <div className="border-t border-slate-200/50 pt-2">
                  <span className="text-[10px] text-slate-400 block mb-0.5">依頼日</span>
                  <span className="text-slate-800 font-bold font-mono text-[13px]">
                    {statusUpdateLog.requestDate || statusUpdateLog.date}
                  </span>
                </div>
              </div>

              {/* DYNAMIC FORM DEPENDING ON LOG STATUS */}
              {statusUpdateLog.status === 'unstarted' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 text-[11px] rounded-xl font-bold flex gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      内職者が部材の受け取りに来たことを登録します。
                      登録すると自動的にステータスが「作業中」に移行します。
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        実際に商品を渡した日 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={updateHandedOverDate}
                        onChange={(e) => setUpdateHandedOverDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        納品予定日 (期限) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={updateDueDate}
                        onChange={(e) => setUpdateDueDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {(statusUpdateLog.status === 'ongoing' || statusUpdateLog.status === 'completed') && (
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>【納品物の検査・検品結果の記録（不合格NG品を登録）】</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-1">
                        実際に納品された日 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={updateDeliveredDate}
                        onChange={(e) => setUpdateDeliveredDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-sm font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-rose-500 mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        うち不合格・不良数 (NG) <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={statusUpdateLog.quantity}
                        required
                        value={updateNgQuantity}
                        onChange={(e) => setUpdateNgQuantity(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-white border border-rose-200 focus:ring-rose-500 rounded-xl py-1.5 px-3 text-sm font-mono font-bold text-rose-600 focus:outline-hidden focus:ring-2"
                        id="popup-ng-input"
                      />
                    </div>
                  </div>

                  {/* Calculated summary results */}
                  <div className="pt-3 border-t border-emerald-100 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">純良品合格数:</span>
                      <span className="text-emerald-700 font-black font-mono text-[14px]">
                        {(statusUpdateLog.quantity - updateNgQuantity).toLocaleString()} 個
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">成果対象支払い報酬金額:</span>
                      <span className="text-slate-900 font-black font-mono text-[14px]">
                        {formatYen((statusUpdateLog.quantity - updateNgQuantity) * (jobs.find(j => j.id === statusUpdateLog.jobId)?.unitPrice || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">作業指示・連絡メモ</label>
                <textarea
                  rows={2}
                  placeholder="「受領したため検品を行います」「検品時に不良を一部検知したためNG登録」など"
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  id="popup-notes-textarea"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 font-bold text-xs">
                <button
                  type="button"
                  onClick={() => setStatusUpdateLog(null)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl cursor-pointer text-center"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs cursor-pointer text-center font-black"
                >
                  {statusUpdateLog.status === 'unstarted' && '受け渡しを登録して作業中にする'}
                  {statusUpdateLog.status === 'ongoing' && '検品を完了して合格報酬を確定する'}
                  {statusUpdateLog.status === 'completed' && '検品データを保存する'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

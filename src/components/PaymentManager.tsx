/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Worker, Job, WorkLog, MonthlyPayment, PaymentStatus, PaymentConfig } from '../types';
import { formatYen, formatMonthJP, exportToCSV } from '../utils';
import { 
  Calendar, CheckCircle2, AlertCircle, FileText, 
  FileSpreadsheet, Check, Send, Award, Landmark, 
  TrendingUp, HelpCircle, ArrowRight, Printer, AlertTriangle, User,
  Settings, SlidersHorizontal, Info
} from 'lucide-react';
import StatementModal from './StatementModal';



const getScheduledPaymentDate = (monthStr: string, config: PaymentConfig): string => {
  if (!monthStr) return '';
  const [yearStr, monthStrPart] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStrPart, 10);

  let targetYear = year;
  let targetMonth = month;

  if (config.transferDayType === 'current-end') {
    const lastDay = new Date(year, month, 0).getDate();
    return `${yearStr}-${monthStrPart}-${String(lastDay).padStart(2, '0')}`;
  }

  if (config.transferDayType !== 'custom') {
    targetMonth = month + 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear = year + 1;
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  switch (config.transferDayType) {
    case 'next-10':
      return `${targetYear}-${pad(targetMonth)}-10`;
    case 'next-15':
      return `${targetYear}-${pad(targetMonth)}-15`;
    case 'next-20':
      return `${targetYear}-${pad(targetMonth)}-20`;
    case 'next-25':
      return `${targetYear}-${pad(targetMonth)}-25`;
    case 'next-end': {
      const lastDay = new Date(targetYear, targetMonth, 0).getDate();
      return `${targetYear}-${pad(targetMonth)}-${pad(lastDay)}`;
    }
    case 'custom':
      return config.customTransferDayText || '翌月20日';
    default:
      return `${targetYear}-${pad(targetMonth)}-20`;
  }
};

interface PaymentManagerProps {
  payments: MonthlyPayment[];
  workers: Worker[];
  jobs: Job[];
  workLogs: WorkLog[];
  onUpdatePayment: (payment: MonthlyPayment) => void;
  onSetPaidStatus: (workerId: string, month: string, status: PaymentStatus, paymentDate?: string) => void;
}

export default function PaymentManager({
  payments,
  workers,
  jobs,
  workLogs,
  onSetPaidStatus,
}: PaymentManagerProps) {
  // Get unique months from work logs to select
  const availableMonths = Array.from(
    new Set([
      '2026-07',
      '2026-06',
      ...workLogs.map(log => log.date.substring(0, 7))
    ])
  ).sort().reverse();

  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || '2026-07');
  
  // Tabs: Find first active worker to set as default, or fallback to 'all'
  const activeWorkersList = workers.filter(w => w.isActive);
  const [activeWorkerId, setActiveWorkerId] = useState<string>(
    activeWorkersList.length > 0 ? activeWorkersList[0].id : 'all'
  );

  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState<PaymentConfig>(() => {
    const saved = localStorage.getItem('naishoku_payment_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      cutoffDay: '末日',
      transferDayType: 'next-20',
      customTransferDayText: '翌月20日',
      feeBurden: 'company',
      senderBankName: 'みずほ銀行　本店営業部',
      autoPaymentDateType: 'today',
      customAutoPaymentDate: new Date().toISOString().substring(0, 10),
    };
  });
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState(false);

  const handleSaveConfig = (newConfig: PaymentConfig) => {
    setConfig(newConfig);
    localStorage.setItem('naishoku_payment_config', JSON.stringify(newConfig));
    setIsSavedSuccessfully(true);
    setTimeout(() => {
      setIsSavedSuccessfully(false);
    }, 3000);
  };

  // Statement Modal state
  const [statementWorker, setStatementWorker] = useState<Worker | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  // Group work logs of selected month for ALL workers
  const payrollDetails = workers.map(worker => {
    // We calculate payout from completed & inspected logs for that month
    const workerLogsInMonth = workLogs.filter(
      log => log.workerId === worker.id && log.date.startsWith(selectedMonth)
    );

    const completedLogs = workerLogsInMonth.filter(
      log => log.status === 'completed'
    );

    const totalQuantity = completedLogs.reduce((sum, log) => sum + log.quantity, 0);
    const totalNgQuantity = completedLogs.reduce((sum, log) => sum + (log.ngQuantity || 0), 0);
    const totalOkQuantity = totalQuantity - totalNgQuantity;

    // 月集計（担当者ごとの当月報酬合計）は小数点以下を切り捨て
    const calculatedPay = Math.floor(completedLogs.reduce((sum, log) => {
      const job = jobs.find(j => j.id === log.jobId);
      const ok = log.quantity - (log.ngQuantity || 0);
      return sum + (job ? ok * job.unitPrice : 0);
    }, 0));

    // Calculate feeAmount and netPay
    let feeAmount = 0;
    if (calculatedPay > 0) {
      if (config.feeBurden === 'worker-110') feeAmount = 110;
      else if (config.feeBurden === 'worker-220') feeAmount = 220;
      else if (config.feeBurden === 'worker-actual') feeAmount = 330;
    }
    const netPay = Math.max(0, calculatedPay - feeAmount);

    // Find if we have a persisted Payment status
    const existingPayment = payments.find(
      p => p.workerId === worker.id && p.month === selectedMonth
    );

    return {
      worker,
      logsCount: workerLogsInMonth.length,
      completedLogs,
      totalQuantity,
      totalNgQuantity,
      totalOkQuantity,
      calculatedPay,
      feeAmount,
      netPay,
      payment: existingPayment || null,
      status: existingPayment ? existingPayment.paymentStatus : 'unpaid' as PaymentStatus,
      paymentDate: existingPayment ? existingPayment.paymentDate : null,
    };
  });

  // Only show workers who have any logs in this month
  const workersWithLogs = payrollDetails.filter(item => item.logsCount > 0);

  // Totals for summary banner
  const totalAmountForMonth = workersWithLogs.reduce((sum, item) => sum + item.calculatedPay, 0);
  const totalNetPayoutForMonth = workersWithLogs.reduce((sum, item) => sum + item.netPay, 0);
  const paidWorkersCount = workersWithLogs.filter(item => item.status === 'paid').length;
  const approvedWorkersCount = workersWithLogs.filter(item => item.status === 'approved').length;
  const unpaidWorkersCount = workersWithLogs.filter(item => item.status === 'unpaid').length;

  const handleStatusChange = (workerId: string, status: PaymentStatus) => {
    let paymentDateStr = undefined;
    if (status === 'paid') {
      if (config.autoPaymentDateType === 'today') {
        paymentDateStr = new Date().toISOString().substring(0, 10);
      } else if (config.autoPaymentDateType === 'scheduled') {
        const sched = getScheduledPaymentDate(selectedMonth, config);
        paymentDateStr = sched.match(/^\d{4}-\d{2}-\d{2}$/) ? sched : new Date().toISOString().substring(0, 10);
      } else {
        paymentDateStr = config.customAutoPaymentDate || new Date().toISOString().substring(0, 10);
      }
    }
    onSetPaidStatus(workerId, selectedMonth, status, paymentDateStr);
  };

  const handleOpenStatement = (worker: Worker) => {
    setStatementWorker(worker);
    setIsStatementOpen(true);
  };

  // Export current month payroll to CSV
  const handleCSVExport = () => {
    const headers = [
      '対象年月',
      '担当者ID',
      '担当者氏名',
      '総検品完了数',
      '良品数',
      'NG数',
      '支給総額',
      '支払状況',
      'お支払日',
      '振込銀行名',
      '支店名',
      '預金種別',
      '口座番号',
      '口座名義'
    ];

    const rows = workersWithLogs.map(item => {
      const statusLabel = {
        unpaid: '未精算',
        approved: '承認済',
        paid: '精算済',
      }[item.status];

      return [
        selectedMonth,
        item.worker.id,
        item.worker.name,
        String(item.totalQuantity),
        String(item.totalOkQuantity),
        String(item.totalNgQuantity),
        String(item.calculatedPay),
        statusLabel,
        item.paymentDate || '-',
        item.worker.bankName || '-',
        item.worker.bankBranch || '-',
        item.worker.bankAccountType || '-',
        item.worker.bankAccountNumber || '-',
        item.worker.bankAccountHolder || '-'
      ];
    });

    exportToCSV(`内職報酬お支払い一覧_${selectedMonth}.csv`, headers, rows);
  };

  // Active worker's specific payment data if tab selected
  const activeWorkerPayroll = workersWithLogs.find(item => item.worker.id === activeWorkerId);

  return (
    <div className="space-y-6">
      
      {/* 1. Global Monthly Filter & Metrics Summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 tracking-tight">支払い精算 & 明細書自動発行</h2>
              <p className="text-xs text-slate-500 font-medium">
                当月の検品完了データから、不良(NG)品を自動差し引きした純支給額を集計・精算管理します。
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              id="payment-month-select"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{formatMonthJP(m)}分 報酬</option>
              ))}
            </select>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`inline-flex items-center justify-center gap-1.5 border disabled:opacity-50 font-bold text-xs py-1.5 px-4 rounded-xl cursor-pointer transition-colors ${
                isSettingsOpen 
                  ? 'bg-slate-800 border-slate-800 text-white hover:bg-slate-900' 
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
              id="btn-toggle-payment-settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              振込・締め設定
            </button>
            <button
              onClick={handleCSVExport}
              disabled={workersWithLogs.length === 0}
              className="inline-flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-bold text-xs py-1.5 px-4 rounded-xl cursor-pointer"
              id="btn-export-payout"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              精算一覧CSV出力
            </button>
          </div>
        </div>

        {/* Collapsible Settings Panel */}
        {isSettingsOpen && (
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200" id="payment-settings-panel">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-indigo-500 animate-spin-slow" />
                振込精算・締め支払いの設定
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                ※設定値はブラウザのローカルストレージに自動保存されます
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Cutoff Day */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  締め日 (集計締日の設定)
                </label>
                <select
                  value={config.cutoffDay}
                  onChange={(e) => handleSaveConfig({ ...config, cutoffDay: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="末日">毎月末日締め</option>
                  <option value="20日">毎月20日締め</option>
                  <option value="15日">毎月15日締め</option>
                  <option value="10日">毎月10日締め</option>
                </select>
              </div>

              {/* Scheduled Transfer Day */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  標準の振込予定日 (支払期日)
                </label>
                <select
                  value={config.transferDayType}
                  onChange={(e) => handleSaveConfig({ ...config, transferDayType: e.target.value as any })}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="next-10">翌月10日払い</option>
                  <option value="next-15">翌月15日払い</option>
                  <option value="next-20">翌月20日払い (標準)</option>
                  <option value="next-25">翌月25日払い</option>
                  <option value="next-end">翌月末日払い</option>
                  <option value="current-end">当月末日払い</option>
                  <option value="custom">カスタムテキスト指定</option>
                </select>
              </div>

              {/* Custom Transfer Day Text (Only shown if 'custom' is selected) */}
              {config.transferDayType === 'custom' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    カスタム振込予定日 (テキスト自由入力)
                  </label>
                  <input
                    type="text"
                    value={config.customTransferDayText}
                    placeholder="例: 翌月第3金曜日"
                    onChange={(e) => handleSaveConfig({ ...config, customTransferDayText: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
              ) : (
                <div className="opacity-80">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    算出された実際の振込期日 ({formatMonthJP(selectedMonth)}分)
                  </label>
                  <div className="bg-slate-100 border border-slate-200 rounded-xl py-2 px-3 font-mono font-bold text-slate-700">
                    {getScheduledPaymentDate(selectedMonth, config)}
                  </div>
                </div>
              )}

              {/* Fee Burden */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  振込手数料の負担ルール
                </label>
                <select
                  value={config.feeBurden}
                  onChange={(e) => handleSaveConfig({ ...config, feeBurden: e.target.value as any })}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="company">自社負担 (振込手数料無料)</option>
                  <option value="worker-110">作業者負担 (一律 110円差し引き)</option>
                  <option value="worker-220">作業者負担 (一律 220円差し引き)</option>
                  <option value="worker-actual">作業者負担 (一律 330円差し引き)</option>
                </select>
              </div>

              {/* Auto Payment Date Type (autofill when clicking Complete Transfer) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  「精算済」登録時の実際の精算日
                </label>
                <select
                  value={config.autoPaymentDateType}
                  onChange={(e) => handleSaveConfig({ ...config, autoPaymentDateType: e.target.value as any })}
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="today">処理を完了した当日 (自動適用)</option>
                  <option value="scheduled">標準の振込予定日 (自動適用)</option>
                  <option value="custom">指定日を自動適用 (下で日付入力)</option>
                </select>
              </div>

              {/* Custom Auto Payment Date */}
              {config.autoPaymentDateType === 'custom' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    自動適用する精算完了日指定
                  </label>
                  <input
                    type="date"
                    value={config.customAutoPaymentDate}
                    onChange={(e) => handleSaveConfig({ ...config, customAutoPaymentDate: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    自社 振込元銀行名（明細等に印字）
                  </label>
                  <input
                    type="text"
                    value={config.senderBankName}
                    placeholder="例: みずほ銀行 渋谷中央支店"
                    onChange={(e) => handleSaveConfig({ ...config, senderBankName: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
              )}
            </div>

            {/* Save notice */}
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200/50">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>
                  設定を変更すると、現在表示中および新規発行されるすべての内職者の報酬明細・振込支払期日に自動的に適用されます。
                </span>
              </div>
              {isSavedSuccessfully && (
                <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg font-bold flex items-center gap-1 animate-pulse">
                  <Check className="w-3 h-3 text-emerald-500" />
                  設定を自動保存しました
                </span>
              )}
            </div>
          </div>
        )}

        {/* Aggregate Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
              当月差引振込支給総額 (手取り)
            </span>
            <span className="text-xl font-black text-indigo-600 font-mono mt-1 block">
              {formatYen(totalNetPayoutForMonth)}
            </span>
            {config.feeBurden !== 'company' && (
              <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">
                (差し引き前報酬総額: {formatYen(totalAmountForMonth)})
              </span>
            )}
          </div>
          <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100">
            <span className="block text-[10px] font-black text-rose-500 uppercase tracking-wider">未精算件数</span>
            <span className="text-xl font-black text-rose-700 font-mono mt-1 block">{unpaidWorkersCount} 名</span>
          </div>
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <span className="block text-[10px] font-black text-indigo-600 uppercase tracking-wider">承認済件数</span>
            <span className="text-xl font-black text-indigo-700 font-mono mt-1 block">{approvedWorkersCount} 名</span>
          </div>
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
            <span className="block text-[10px] font-black text-emerald-500 uppercase tracking-wider">精算完了件数</span>
            <span className="text-xl font-black text-emerald-700 font-mono mt-1 block">{paidWorkersCount} 名</span>
          </div>
        </div>
      </div>

      {/* 2. Worker Selection Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5">
          担当者ごとの精算＆明細管理
        </p>
        <div className="flex flex-wrap gap-1.5" id="payout-worker-tab-list">
          {workers.map(w => {
            const hasLogs = workersWithLogs.some(item => item.worker.id === w.id);
            const payoutItem = workersWithLogs.find(item => item.worker.id === w.id);

            return (
              <button
                key={w.id}
                onClick={() => setActiveWorkerId(w.id)}
                className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  activeWorkerId === w.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
                id={`tab-pay-worker-${w.id}`}
              >
                <User className="w-3.5 h-3.5" />
                {w.name}
                {hasLogs && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold ${
                    payoutItem?.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                    payoutItem?.status === 'approved' ? 'bg-indigo-100 text-indigo-800 animate-pulse' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {payoutItem?.status === 'paid' ? '済' : payoutItem?.status === 'approved' ? '承認' : '未'}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => setActiveWorkerId('all')}
            className={`px-4 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              activeWorkerId === 'all'
                ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            id="tab-pay-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            全員分の精算一覧表
          </button>
        </div>
      </div>

      {/* 3. Tab Views Content */}
      
      {/* VIEW A: Single Worker Dashboard (When activeWorkerId !== 'all') */}
      {activeWorkerId !== 'all' && (
        <div className="space-y-6">
          {activeWorkerPayroll ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-250">
              
              {/* Profile Card & Action Box */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6 relative overflow-hidden">
                
                {/* Traditional Japanese Style Stamp Box Placeholder at top-right */}
                <div className="absolute right-6 top-6 select-none">
                  {activeWorkerPayroll.status === 'paid' ? (
                    <div className="w-16 h-16 border-2 border-double border-emerald-500 rounded-full flex flex-col items-center justify-center text-emerald-500 text-xs font-black rotate-[-12deg] p-1 scale-110">
                      <span>精算済</span>
                      <span className="text-[8px] mt-0.5">{activeWorkerPayroll.paymentDate}</span>
                    </div>
                  ) : activeWorkerPayroll.status === 'approved' ? (
                    <div className="w-16 h-16 border-2 border-double border-indigo-500 rounded-full flex items-center justify-center text-indigo-500 text-xs font-black rotate-[-12deg] scale-110">
                      <span>承認済</span>
                    </div>
                  ) : (
                    <div className="w-16 h-16 border-2 border-dashed border-rose-400 rounded-full flex items-center justify-center text-rose-400 text-xs font-bold rotate-[12deg]">
                      <span>未精算</span>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] bg-slate-100 text-slate-500 py-0.5 px-2.5 rounded-md font-bold">
                    {formatMonthJP(selectedMonth)}度 精算
                  </span>
                  <h3 className="text-xl font-black text-slate-800 mt-2.5 flex items-center gap-1.5">
                    {activeWorkerPayroll.worker.name}
                    <span className="text-xs font-medium text-slate-500">様</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                    作業者別お支払い明細ボード
                  </p>
                </div>

                {/* Bank Account verification widget */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600 font-semibold">
                  <div className="flex items-center gap-1.5 text-slate-700 font-black border-b border-slate-200 pb-1.5 mb-1.5">
                    <Landmark className="w-4 h-4 text-indigo-500" />
                    <span>【お振込先指定口座】</span>
                  </div>
                  {activeWorkerPayroll.worker.bankName ? (
                    <div className="space-y-1">
                      <p><span className="text-slate-400">銀行:</span> {activeWorkerPayroll.worker.bankName} ({activeWorkerPayroll.worker.bankBranch})</p>
                      <p><span className="text-slate-400">口座:</span> {activeWorkerPayroll.worker.bankAccountType} {activeWorkerPayroll.worker.bankAccountNumber}</p>
                      <p><span className="text-slate-400">名義:</span> {activeWorkerPayroll.worker.bankAccountHolder}</p>
                    </div>
                  ) : (
                    <div className="text-rose-500 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>口座情報が未登録です！設定が必要です。</span>
                    </div>
                  )}
                </div>

                {/* State Control Action Buttons */}
                <div className="pt-4 border-t border-slate-100 space-y-2.5">
                  <button
                    onClick={() => handleOpenStatement(activeWorkerPayroll.worker)}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    支払明細書のプレビュー・印刷
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    {activeWorkerPayroll.status === 'unpaid' && (
                      <button
                        onClick={() => handleStatusChange(activeWorkerPayroll.worker.id, 'approved')}
                        className="col-span-2 inline-flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        この月の報酬を承認する
                      </button>
                    )}

                    {activeWorkerPayroll.status === 'approved' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(activeWorkerPayroll.worker.id, 'unpaid')}
                          className="py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl cursor-pointer"
                        >
                          未精算に戻す
                        </button>
                        <button
                          onClick={() => handleStatusChange(activeWorkerPayroll.worker.id, 'paid')}
                          className="inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          振込完了にする
                        </button>
                      </>
                    )}

                    {activeWorkerPayroll.status === 'paid' && (
                      <button
                        onClick={() => handleStatusChange(activeWorkerPayroll.worker.id, 'approved')}
                        className="col-span-2 py-2 text-center text-slate-400 hover:text-rose-600 text-xs font-bold border border-slate-200 hover:border-rose-200 rounded-xl cursor-pointer transition-colors"
                      >
                        振込・精算完了の取消
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Visual Performance Metrics Cards */}
              <div className="col-span-1 lg:col-span-2 space-y-6">
                
                {/* Scorecards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">検品良品数（成果対象）</span>
                    <span className="text-xl font-extrabold text-slate-800 font-mono mt-1.5 block">
                      {activeWorkerPayroll.totalOkQuantity.toLocaleString()} <span className="text-xs font-bold">個</span>
                    </span>
                    {activeWorkerPayroll.totalNgQuantity > 0 && (
                      <span className="text-[9px] text-rose-500 font-bold mt-1 block">
                        (総数: {activeWorkerPayroll.totalQuantity.toLocaleString()} / NG: -{activeWorkerPayroll.totalNgQuantity})
                      </span>
                    )}
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {activeWorkerPayroll.feeAmount > 0 ? '差引振込支給額 (手取り)' : '支給総報酬額'}
                    </span>
                    <span className="text-xl font-extrabold text-indigo-600 font-mono mt-1.5 block">
                      {formatYen(activeWorkerPayroll.netPay)}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold mt-1 block">
                      {activeWorkerPayroll.feeAmount > 0 
                        ? `総報酬 ${formatYen(activeWorkerPayroll.calculatedPay)} / 手数料 -${activeWorkerPayroll.feeAmount}円` 
                        : '100% 完全成果報酬にて算出'}
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">精算ステータス</span>
                    <span className={`inline-flex items-center gap-1 mt-2.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      activeWorkerPayroll.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      activeWorkerPayroll.status === 'approved' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                      'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {activeWorkerPayroll.status === 'paid' ? '支払処理済' :
                       activeWorkerPayroll.status === 'approved' ? '承認（振込待ち）' : '未精算'}
                    </span>
                  </div>
                </div>

                {/* Table of logs included */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">当月算出対象の作業ログ一覧</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">「完了」となっている進捗です</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-black bg-slate-50/70 uppercase text-[9px]">
                          <th className="py-2.5 px-4">日付</th>
                          <th className="py-2.5 px-4">作業内容</th>
                          <th className="py-2.5 px-4 text-right">単価</th>
                          <th className="py-2.5 px-4 text-right">総完成数</th>
                          <th className="py-2.5 px-4 text-right">不良(NG)</th>
                          <th className="py-2.5 px-4 text-right">良品合格</th>
                          <th className="py-2.5 px-4 text-right">金額</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeWorkerPayroll.completedLogs.map(log => {
                          const job = jobs.find(j => j.id === log.jobId);
                          const unitPrice = job ? job.unitPrice : 0;
                          const ng = log.ngQuantity || 0;
                          const ok = log.quantity - ng;

                          return (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-2.5 px-4 font-semibold text-slate-600">{log.date}</td>
                              <td className="py-2.5 px-4 font-bold text-slate-700">{job?.name || '削除済'}</td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">{formatYen(unitPrice)}</td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-500">{log.quantity.toLocaleString()} 個</td>
                              <td className="py-2.5 px-4 text-right font-mono text-rose-500 font-bold">{ng > 0 ? `${ng.toLocaleString()} 個` : '0'}</td>
                              <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-black">{ok.toLocaleString()} 個</td>
                              <td className="py-2.5 px-4 text-right font-mono font-black text-slate-850">{formatYen(ok * unitPrice)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-black text-slate-700">対象月の作業実績データがありません</h3>
              <p className="text-xs text-slate-400 font-medium">
                {workers.find(w => w.id === activeWorkerId)?.name}様は、選択された月（{formatMonthJP(selectedMonth)}）に検品完了または検品中の作業ログが記録されていません。
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW B: Monthly Unified Spreadsheet (When activeWorkerId === 'all') */}
      {activeWorkerId === 'all' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-250">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-black bg-slate-50/70 tracking-wider uppercase text-[10px]">
                  <th className="py-3.5 px-4">担当者</th>
                  <th className="py-3.5 px-4">当月作業内訳</th>
                  <th className="py-3.5 px-4 text-right">検品総数量</th>
                  <th className="py-3.5 px-4 text-right">うち良品総数</th>
                  <th className="py-3.5 px-4 text-right">うちNG総数</th>
                  <th className="py-3.5 px-4 text-right">差引手取支給額 (円)</th>
                  <th className="py-3.5 px-4 text-center">精算状況</th>
                  <th className="py-3.5 px-4 text-center">支払処理日</th>
                  <th className="py-3.5 px-4 text-right">精算アクション</th>
                  <th className="py-3.5 px-4 text-center">明細書</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workersWithLogs.map((item) => {
                  // Generate short string summary of jobs they did
                  const jobSummary: { [name: string]: { total: number; ng: number; ok: number } } = {};
                  item.completedLogs.forEach(log => {
                    const job = jobs.find(j => j.id === log.jobId);
                    if (job) {
                      if (!jobSummary[job.name]) {
                        jobSummary[job.name] = { total: 0, ng: 0, ok: 0 };
                      }
                      jobSummary[job.name].total += log.quantity;
                      jobSummary[job.name].ng += (log.ngQuantity || 0);
                      jobSummary[job.name].ok += (log.quantity - (log.ngQuantity || 0));
                    }
                  });
                  const jobSummaryText = Object.entries(jobSummary)
                    .map(([name, counts]) => `${name}(良品 ${counts.ok.toLocaleString()} / NG ${counts.ng.toLocaleString()} 個)`)
                    .join(' / ');

                  return (
                    <tr key={item.worker.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Worker Profile */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-800">{item.worker.name}</div>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono font-medium">{item.worker.phone || '連絡先未登録'}</div>
                      </td>

                      {/* Breakdown */}
                      <td className="py-3.5 px-4 max-w-xs text-slate-500 font-medium truncate" title={jobSummaryText}>
                        {jobSummaryText || <span className="text-slate-300 italic">検品済の作業がありません</span>}
                      </td>

                      {/* Total completed Qty */}
                      <td className="py-3.5 px-4 text-right text-slate-500 font-mono font-medium">
                        {item.totalQuantity.toLocaleString()} 個
                      </td>

                      {/* Total OK Qty */}
                      <td className="py-3.5 px-4 text-right text-slate-700 font-black font-mono">
                        {item.totalOkQuantity.toLocaleString()} 個
                      </td>

                      {/* Total NG Qty */}
                      <td className="py-3.5 px-4 text-right text-rose-600 font-black font-mono">
                        {item.totalNgQuantity > 0 ? `${item.totalNgQuantity.toLocaleString()} 個` : '0'}
                      </td>

                      {/* Total Net Pay */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="text-slate-900 font-black font-mono text-sm">
                          {formatYen(item.netPay)}
                        </div>
                        {item.feeAmount > 0 && (
                          <div className="text-[9px] text-slate-400 font-bold whitespace-nowrap">
                            (報酬: {formatYen(item.calculatedPay)} / 手数料: -{item.feeAmount})
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : item.status === 'approved'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {item.status === 'paid' ? '支払済' : item.status === 'approved' ? '承認済' : '未精算'}
                        </span>
                      </td>

                      {/* Payment Date */}
                      <td className="py-3.5 px-4 text-center text-slate-500 font-mono font-bold whitespace-nowrap">
                        {item.paymentDate || <span className="text-slate-300 font-light">-</span>}
                      </td>

                      {/* Pay/Approve Inline Controls */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5 font-bold">
                          {item.status === 'unpaid' && (
                            <button
                              onClick={() => handleStatusChange(item.worker.id, 'approved')}
                              className="inline-flex items-center gap-1 border border-indigo-200 hover:bg-indigo-50 text-indigo-600 font-bold text-[10px] py-1 px-3 rounded-xl transition-colors cursor-pointer"
                              id={`btn-approve-payment-${item.worker.id}`}
                            >
                              <Check className="w-3 h-3" />
                              承認する
                            </button>
                          )}
                          {item.status === 'approved' && (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleStatusChange(item.worker.id, 'unpaid')}
                                className="text-slate-400 hover:text-slate-600 text-[10px] py-1 px-2.5 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer border border-slate-200"
                                title="未精算に戻す"
                              >
                                戻す
                              </button>
                              <button
                                onClick={() => handleStatusChange(item.worker.id, 'paid')}
                                className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1 px-3 rounded-xl transition-colors shadow-xs cursor-pointer"
                                id={`btn-pay-worker-${item.worker.id}`}
                              >
                                <Send className="w-3 h-3" />
                                振込完了
                              </button>
                            </div>
                          )}
                          {item.status === 'paid' && (
                            <button
                              onClick={() => handleStatusChange(item.worker.id, 'approved')}
                              className="text-slate-400 hover:text-indigo-600 text-[10px] py-1 px-2.5 hover:bg-slate-50 rounded-xl transition-all cursor-pointer border border-slate-200"
                              title="承認済ステータスに戻す"
                            >
                              精算の取消
                            </button>
                          )}
                        </div>
                      </td>

                      {/* View/Print Invoice */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenStatement(item.worker)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors inline-flex items-center gap-1 border border-slate-200 cursor-pointer"
                          title="明細書のプレビューと印刷"
                          id={`btn-preview-statement-${item.worker.id}`}
                        >
                          <FileText className="w-4 h-4 text-indigo-500" />
                          <span className="text-[10px] font-bold">明細</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {workersWithLogs.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                      選択された月に「検品完了」となった作業記録がありません。<br />
                      <span className="text-[10px] font-normal text-slate-400/80 mt-1 block">「作業・進捗管理」タブより、進捗を「完了」に変更してください。</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Render Payslip Statement Modal Overlay */}
      {statementWorker && (
        <StatementModal
          isOpen={isStatementOpen}
          onClose={() => {
            setIsStatementOpen(false);
            setStatementWorker(null);
          }}
          worker={statementWorker}
          month={selectedMonth}
          workLogs={workLogs}
          jobs={jobs}
          payment={payments.find(p => p.workerId === statementWorker.id && p.month === selectedMonth) || null}
        />
      )}
    </div>
  );
}

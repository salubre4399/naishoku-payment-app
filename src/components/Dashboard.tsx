/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Worker, Job, WorkLog } from '../types';
import { formatYen, formatMonthJP, formatDateJP } from '../utils';
import { Users, Briefcase, TrendingUp, DollarSign, Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface DashboardProps {
  workers: Worker[];
  jobs: Job[];
  workLogs: WorkLog[];
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ workers, jobs, workLogs, onNavigate }: DashboardProps) {
  // Get unique months from work logs to allow filtering the dashboard
  const availableMonths = Array.from(
    new Set([
      '2026-07',
      '2026-06',
      ...workLogs.map(log => log.date.substring(0, 7))
    ])
  ).sort().reverse();

  const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || '2026-07');

  // Filter logs for selected month
  const monthlyLogs = workLogs.filter(log => log.date.startsWith(selectedMonth));

  // Calculations
  const activeWorkersCount = workers.filter(w => w.isActive).length;
  const activeJobsCount = jobs.filter(j => j.isActive).length;

  // Total completed quantity in selected month (OK pieces only)
  const totalQuantity = monthlyLogs.reduce((sum, log) => sum + (log.quantity - (log.ngQuantity || 0)), 0);

  // Total earnings / payout in selected month (unpaid, approved, or paid)
  // 月集計は小数点以下を切り捨て（支払管理・明細と一致させる）
  const totalPayout = Math.floor(monthlyLogs.reduce((sum, log) => {
    const job = jobs.find(j => j.id === log.jobId);
    if (!job) return sum;
    // Only calculate amount for work actually progressed (completed)
    if (log.status === 'completed') {
      const okQty = log.quantity - (log.ngQuantity || 0);
      return sum + (okQty * job.unitPrice);
    }
    return sum;
  }, 0));

  // Status breakdown
  const statusCounts = {
    unstarted: monthlyLogs.filter(l => l.status === 'unstarted').length,
    ongoing: monthlyLogs.filter(l => l.status === 'ongoing').length,
    completed: monthlyLogs.filter(l => l.status === 'completed').length,
  };

  const totalLogsCount = monthlyLogs.length || 1; // Avoid divide by zero
  const statusPercentages = {
    unstarted: Math.round((statusCounts.unstarted / totalLogsCount) * 100),
    ongoing: Math.round((statusCounts.ongoing / totalLogsCount) * 100),
    completed: Math.round((statusCounts.completed / totalLogsCount) * 100),
  };

  // Worker performance breakdown (Earnings for this month)
  const workerStats = workers.map(worker => {
    const workerLogs = monthlyLogs.filter(l => l.workerId === worker.id);
    const completedPieces = workerLogs
      .filter(l => l.status === 'completed')
      .reduce((sum, l) => sum + (l.quantity - (l.ngQuantity || 0)), 0);
    const earnings = Math.floor(workerLogs.reduce((sum, log) => {
      if (log.status === 'completed') {
        const job = jobs.find(j => j.id === log.jobId);
        const okQty = log.quantity - (log.ngQuantity || 0);
        return sum + (job ? okQty * job.unitPrice : 0);
      }
      return sum;
    }, 0));

    return {
      name: worker.name,
      completedPieces,
      earnings,
    };
  }).filter(stat => stat.earnings > 0 || stat.completedPieces > 0)
    .sort((a, b) => b.earnings - a.earnings);

  // Max earning for SVG chart scaling
  const maxEarning = Math.max(...workerStats.map(w => w.earnings), 5000);

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-black text-slate-800 tracking-tight">ダッシュボード概要</h2>
          <p className="text-xs text-slate-500">内職の全体進捗、稼働状況、および報酬計算の概略です。</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-xl">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-500">対象月:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-black text-slate-700 bg-transparent border-none focus:outline-hidden cursor-pointer"
            id="dashboard-month-select"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>{formatMonthJP(m)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Bento Card 1: Monthly Summary (Indigo Card, col-span-4) */}
        <div className="col-span-1 md:col-span-4 bg-indigo-600 rounded-2xl shadow-sm p-6 text-white flex flex-col justify-between min-h-[220px]">
          <div>
            <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider mb-1.5">
              今月の支払い総額 ({formatMonthJP(selectedMonth)}分)
            </p>
            <h2 className="text-3xl font-black font-mono tracking-tight">{formatYen(totalPayout)}</h2>
          </div>
          <div className="flex items-center justify-between mt-4 bg-indigo-500/30 p-3.5 rounded-xl border border-white/5">
            <div className="text-xs">
              <p className="opacity-80 font-bold">担当者稼働</p>
              <p className="text-lg font-black">{activeWorkersCount} 名</p>
            </div>
            <div className="text-xs text-right">
              <p className="opacity-80 font-bold">作業マスター</p>
              <p className="text-lg font-black">{activeJobsCount} 件</p>
            </div>
          </div>
        </div>

        {/* Bento Card 2: Progress Monitor (White Card, col-span-8) */}
        <div className="col-span-1 md:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between min-h-[220px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">進捗状況・納期モニター</h3>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">当月案件のステータス内訳</p>
            </div>
            <span className="text-[10px] px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg uppercase tracking-wider whitespace-nowrap">
              総作業：{totalQuantity.toLocaleString()} 個 / 件
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-5">
            {/* Custom Horizontal Stacked Bar */}
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex">
              {statusPercentages.completed > 0 && (
                <div
                  style={{ width: `${statusPercentages.completed}%` }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title={`完了: ${statusCounts.completed}件 (${statusPercentages.completed}%)`}
                />
              )}
              {statusPercentages.ongoing > 0 && (
                <div
                  style={{ width: `${statusPercentages.ongoing}%` }}
                  className="bg-amber-400 h-full transition-all duration-500"
                  title={`作業中: ${statusCounts.ongoing}件 (${statusPercentages.ongoing}%)`}
                />
              )}
              {statusPercentages.unstarted > 0 && (
                <div
                  style={{ width: `${statusPercentages.unstarted}%` }}
                  className="bg-slate-200 h-full transition-all duration-500"
                  title={`未着手: ${statusCounts.unstarted}件 (${statusPercentages.unstarted}%)`}
                />
              )}
            </div>

            {/* Status indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">検品完了</span>
                </div>
                <p className="text-sm font-black text-slate-800">
                  {statusCounts.completed} 件 <span className="text-[10px] text-slate-400 font-bold">({statusPercentages.completed}%)</span>
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">作業中</span>
                </div>
                <p className="text-sm font-black text-slate-800">
                  {statusCounts.ongoing} 件 <span className="text-[10px] text-slate-400 font-bold">({statusPercentages.ongoing}%)</span>
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">未着手</span>
                </div>
                <p className="text-sm font-black text-slate-800">
                  {statusCounts.unstarted} 件 <span className="text-[10px] text-slate-400 font-bold">({statusPercentages.unstarted}%)</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bento Card 3: Recent Statements/Payment status (White Card, col-span-4) */}
        <div className="col-span-1 md:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between overflow-hidden min-h-[300px]">
          <div>
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">直近の算出・明細状況</h3>
              <button
                onClick={() => onNavigate('payments')}
                className="text-[10px] text-indigo-600 font-black cursor-pointer hover:underline"
              >
                全表示
              </button>
            </div>
            <div className="overflow-y-auto max-h-[200px] divide-y divide-slate-100">
              {workerStats.slice(0, 4).map((stat, idx) => (
                <div key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{stat.name}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">完了: {stat.completedPieces.toLocaleString()} 個</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900 font-mono">{formatYen(stat.earnings)}</p>
                    <span className="inline-block mt-1 text-[8px] font-black px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                      算出済
                    </span>
                  </div>
                </div>
              ))}
              {workerStats.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  今月の算出データはありません
                </div>
              )}
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigate('payments')}
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              明細自動発行へ
            </button>
          </div>
        </div>

        {/* Bento Card 4: Quick Actions / Export Data (White Card, col-span-5) */}
        <div className="col-span-1 md:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">データ出力・管理</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onNavigate('logs')}
                className="flex flex-col items-center justify-center gap-2 py-4 border-2 border-indigo-600 text-indigo-600 bg-white rounded-xl font-bold hover:bg-indigo-50 transition-all cursor-pointer text-xs shadow-xs"
              >
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                </svg>
                進捗データ更新
              </button>
              <button
                onClick={() => onNavigate('payments')}
                className="flex flex-col items-center justify-center gap-2 py-4 border-2 border-indigo-600 text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all cursor-pointer text-xs"
              >
                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                支払い一覧・CSV
              </button>
            </div>
          </div>
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 2v-6m-8 13h11a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">最終バックアップ</p>
              <p className="text-xs font-extrabold text-slate-700">ブラウザ自動保存済み</p>
            </div>
          </div>
        </div>

        {/* Bento Card 5: Staff Productivity Ranking (White Card, col-span-3) */}
        <div className="col-span-1 md:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-slate-800 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">今月の生産性ランキング</h3>
            <div className="space-y-4">
              {workerStats.slice(0, 3).map((stat, index) => {
                const ranks = ['text-amber-500', 'text-slate-400', 'text-amber-600'];
                return (
                  <div key={index} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-black text-xs ${ranks[index] || 'text-slate-400'}`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{stat.name}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-indigo-600">
                      {stat.completedPieces.toLocaleString()} 個
                    </span>
                  </div>
                );
              })}
              {workerStats.length === 0 && (
                <p className="text-xs text-slate-500 italic py-6 text-center">稼働データがありません</p>
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigate('workers')}
              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              担当者マスター管理 →
            </button>
          </div>
        </div>

      </div>

      {/* Recent Work Logs Table/List */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">最近の作業・進捗履歴</h3>
            <p className="text-xs text-slate-500">直近に記録された作業進捗情報です。</p>
          </div>
          <button
            onClick={() => onNavigate('logs')}
            className="text-xs font-black text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            すべての記録を表示
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold bg-slate-50/50">
                <th className="py-3.5 px-3">日付</th>
                <th className="py-3.5 px-3">担当者</th>
                <th className="py-3.5 px-3">作業内容</th>
                <th className="py-3.5 px-3 text-right">数量</th>
                <th className="py-3.5 px-3 text-right">単価</th>
                <th className="py-3.5 px-3 text-right">見積金額</th>
                <th className="py-3.5 px-3 text-center">進捗ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workLogs.slice(-5).reverse().map((log) => {
                const worker = workers.find(w => w.id === log.workerId);
                const job = jobs.find(j => j.id === log.jobId);
                const unitPrice = job ? job.unitPrice : 0;
                const okQty = log.quantity - (log.ngQuantity || 0);
                const totalVal = okQty * unitPrice;

                let statusBadge = '';
                if (log.status === 'completed') {
                  statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                } else if (log.status === 'ongoing') {
                  statusBadge = 'bg-amber-50 text-amber-700 border-amber-100';
                } else {
                  statusBadge = 'bg-slate-50 text-slate-600 border-slate-200';
                }

                const statusLabel = {
                  unstarted: '未着手',
                  ongoing: '作業中',
                  completed: '完了',
                }[log.status];

                return (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 text-slate-600 font-medium">{log.date}</td>
                    <td className="py-3 px-3 text-slate-800 font-bold">{worker ? worker.name : '不明'}</td>
                    <td className="py-3 px-3 text-slate-600">{job ? job.name : '不明'}</td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="font-bold text-slate-700 font-mono">
                        {okQty.toLocaleString()} 個
                      </div>
                      {(log.ngQuantity || 0) > 0 && (
                        <div className="text-[10px] text-rose-500 font-bold font-mono">
                          NG: -{log.ngQuantity?.toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500 font-mono">{formatYen(unitPrice)}</td>
                    <td className="py-3 px-3 text-right text-slate-900 font-black font-mono">{formatYen(totalVal)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {workLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">作業データが登録されていません。</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

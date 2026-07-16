/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Worker, Job } from '../types';
import { UserPlus, Edit2, Search, Check, X, Phone, Mail, Landmark, AlertTriangle, Hammer, Tag } from 'lucide-react';

interface WorkerManagerProps {
  workers: Worker[];
  jobs: Job[];
  onAddWorker: (worker: Omit<Worker, 'id' | 'createdAt'>) => void;
  onUpdateWorker: (worker: Worker) => void;
  workerLimit: number;
}

export default function WorkerManager({ workers, jobs, onAddWorker, onUpdateWorker, workerLimit }: WorkerManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccountType, setBankAccountType] = useState<'普通' | '当座'>('普通');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [allowedJobIds, setAllowedJobIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Handle Search filtering
  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worker.phone.includes(searchTerm) ||
    worker.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setBankName('');
    setBankBranch('');
    setBankAccountType('普通');
    setBankAccountNumber('');
    setBankAccountHolder('');
    setAllowedJobIds([]);
    setIsActive(true);
    setEditingWorker(null);
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (worker: Worker) => {
    setEditingWorker(worker);
    setName(worker.name);
    setPhone(worker.phone);
    setEmail(worker.email);
    setBankName(worker.bankName);
    setBankBranch(worker.bankBranch);
    setBankAccountType(worker.bankAccountType);
    setBankAccountNumber(worker.bankAccountNumber);
    setBankAccountHolder(worker.bankAccountHolder);
    setAllowedJobIds(worker.allowedJobIds || []);
    setIsActive(worker.isActive);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const workerData = {
      name,
      phone,
      email,
      bankName,
      bankBranch,
      bankAccountType,
      bankAccountNumber,
      bankAccountHolder,
      allowedJobIds,
      isActive,
    };

    if (editingWorker) {
      onUpdateWorker({
        ...editingWorker,
        ...workerData,
      });
    } else {
      onAddWorker(workerData);
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="担当者名、電話、メールで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            id="worker-search-input"
          />
        </div>
        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2 px-5 rounded-xl shadow-xs transition-all cursor-pointer"
          id="btn-add-worker"
        >
          <UserPlus className="w-4 h-4" />
          内職担当者を追加
        </button>
      </div>

      {/* Workers Grid/List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkers.map((worker) => (
          <div
            key={worker.id}
            className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition-all duration-200 shadow-xs ${
              worker.isActive ? 'border-slate-200' : 'border-slate-200/60 opacity-75'
            }`}
            id={`worker-card-${worker.id}`}
          >
            <div>
              {/* Card Header */}
              <div className="flex justify-between items-start gap-2 mb-4">
                <div>
                  <h3 className="text-base font-black text-slate-850 tracking-tight">{worker.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 mt-2 rounded-full text-[10px] font-bold border ${
                    worker.isActive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {worker.isActive ? '稼働中' : '休止中'}
                  </span>
                </div>
                <button
                  onClick={() => handleOpenEdit(worker)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  title="編集する"
                  id={`btn-edit-worker-${worker.id}`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Details List */}
              <div className="space-y-2.5 text-xs text-slate-600 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-700">{worker.phone || '未登録'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 truncate" />
                  <span className="truncate font-medium text-slate-700">{worker.email || '未登録'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <Landmark className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="font-medium text-[11px] leading-relaxed">
                    {worker.bankName ? (
                      <>
                        <div className="text-slate-800 font-bold">{worker.bankName} {worker.bankBranch}</div>
                        <div className="text-slate-500 font-mono">{worker.bankAccountType} {worker.bankAccountNumber}</div>
                        <div className="text-slate-400 font-normal">名義: {worker.bankAccountHolder}</div>
                      </>
                    ) : (
                      <span className="text-slate-400 font-normal">振込口座未登録</span>
                    )}
                  </div>
                </div>

                {/* Compatible Jobs list */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1.5">
                    <Hammer className="w-3 h-3 text-indigo-500" />
                    <span>対応可能な内職作業:</span>
                  </div>
                  {worker.allowedJobIds && worker.allowedJobIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {worker.allowedJobIds.map((jobId) => {
                        const targetJob = jobs.find((j) => j.id === jobId);
                        if (!targetJob) return null;
                        return (
                          <span
                            key={jobId}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-sm text-[10px] font-bold border border-indigo-100/40"
                          >
                            {targetJob.name}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium italic">未設定（すべての作業に対応可能）</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-medium">
              <span>登録日: {new Date(worker.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}

        {filteredWorkers.length === 0 && (
          <div className="col-span-full bg-white p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
            検索条件に一致する担当者が見つかりません。
          </div>
        )}
      </div>

      {/* Slide-over / Modal Form Sheet */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                <h3 className="text-base font-black text-slate-800">
                  {editingWorker ? '担当者情報の編集' : '新規担当者の登録'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  id="btn-close-worker-form"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!editingWorker && workers.length >= workerLimit ? (
                  <div className="p-4 bg-rose-50 border border-rose-150 text-rose-800 rounded-2xl space-y-3.5 animate-in fade-in duration-200">
                    <div className="flex gap-2 items-start font-black text-xs">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-rose-650 mt-0.5" />
                      <div>内職担当者の新規追加が制限されています</div>
                    </div>
                    <p className="text-[11px] leading-relaxed font-semibold text-slate-700">
                      現在設定されているプランの上限数（最大 <strong>{workerLimit} 名</strong>）に達しています（現在の登録者: <strong>{workers.length} 名</strong>）。
                    </p>
                    <p className="text-[11px] leading-relaxed font-medium text-slate-500">
                      新しく担当者を追加して作業を依頼するには、プラン契約のアップグレードが必要です。開発者タブ（デベロッパー設定）にて契約上限数を拡大するよう管理者にご依頼ください。
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Section 1: Basic Info */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">基本情報</h4>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">氏名 <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          placeholder="例) 山田 花子"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          id="worker-name-input"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">電話番号</label>
                          <input
                            type="tel"
                            placeholder="例) 090-0000-0000"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            id="worker-phone-input"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">メールアドレス</label>
                          <input
                            type="email"
                            placeholder="例) hanako@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            id="worker-email-input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Financial Account Info */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">振込口座情報 (明細自動記載用)</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">金融機関名</label>
                          <input
                            type="text"
                            placeholder="例) みずほ銀行"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            id="worker-bank-input"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">支店名</label>
                          <input
                            type="text"
                            placeholder="例) 渋谷中央支店"
                            value={bankBranch}
                            onChange={(e) => setBankBranch(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            id="worker-branch-input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">口座種別</label>
                          <select
                            value={bankAccountType}
                            onChange={(e) => setBankAccountType(e.target.value as '普通' | '当座')}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer"
                            id="worker-accounttype-select"
                          >
                            <option value="普通">普通</option>
                            <option value="当座">当座</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-600 mb-1">口座番号</label>
                          <input
                            type="text"
                            pattern="\d*"
                            maxLength={7}
                            placeholder="7桁の半角数字"
                            value={bankAccountNumber}
                            onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                            id="worker-accountnumber-input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">口座名義 (カナ)</label>
                        <input
                          type="text"
                          placeholder="例) サトウ ミキ (全角または半角カナ)"
                          value={bankAccountHolder}
                          onChange={(e) => setBankAccountHolder(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          id="worker-holder-input"
                        />
                      </div>
                    </div>

                    {/* Section 3: Compatible Jobs */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">対応可能な内職作業</h4>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setAllowedJobIds(jobs.filter(j => j.isActive).map(j => j.id))}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                          >
                            すべて選択
                          </button>
                          <span className="text-slate-300 text-[10px]">|</span>
                          <button
                            type="button"
                            onClick={() => setAllowedJobIds([])}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            クリア
                          </button>
                        </div>
                      </div>

                      {jobs.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">作業マスタが登録されていません。先に「作業マスタ」タブから作業を追加してください。</p>
                      ) : (
                        <div className="space-y-3 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                          {/* Group active jobs by category */}
                          {Array.from(new Set(jobs.map(j => j.category?.trim() || '未分類'))).map((catName) => {
                            const catJobs = jobs.filter(j => (j.category?.trim() || '未分類') === catName && j.isActive);
                            if (catJobs.length === 0) return null;
                            return (
                              <div key={catName} className="space-y-1.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                  <Tag className="w-2.5 h-2.5 text-indigo-500" />
                                  {catName}
                                </span>
                                <div className="grid grid-cols-1 gap-1.5 pl-1">
                                  {catJobs.map((job) => {
                                    const isChecked = allowedJobIds.includes(job.id);
                                    return (
                                      <label key={job.id} className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 hover:text-slate-900 bg-white p-2 rounded-lg border border-slate-150 transition-all">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            if (isChecked) {
                                              setAllowedJobIds(allowedJobIds.filter(id => id !== job.id));
                                            } else {
                                              setAllowedJobIds([...allowedJobIds, job.id]);
                                            }
                                          }}
                                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="font-bold truncate">{job.name}</div>
                                          <div className="text-[9px] text-slate-400 font-medium font-mono">{job.unitPrice}円 / 個</div>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Section 4: Status */}
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">状態</h4>
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                          id="worker-active-checkbox"
                        />
                        <span className="text-sm font-bold text-slate-700">稼働状態（チェックありで稼働中）</span>
                      </label>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-2 text-sm font-bold border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer text-center"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={!editingWorker && workers.length >= workerLimit}
                    className={`flex-1 py-2 text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer text-center ${
                      !editingWorker && workers.length >= workerLimit
                        ? 'bg-slate-200 text-slate-450 border border-slate-300 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                    id="btn-worker-submit"
                  >
                    {editingWorker ? '保存する' : '登録する'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

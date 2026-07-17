/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Job } from '../types';
import { formatYen } from '../utils';
import { Plus, Edit2, Search, X, Hammer, Tag } from 'lucide-react';

interface JobManagerProps {
  jobs: Job[];
  onAddJob: (job: Omit<Job, 'id' | 'createdAt'>) => void;
  onUpdateJob: (job: Job) => void;
}

export default function JobManager({ jobs, onAddJob, onUpdateJob }: JobManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [priceInput, setPriceInput] = useState<string>('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('');
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Extract unique categories for filtering and quick-select
  const existingCategories = Array.from(
    new Set(jobs.map((job) => job.category?.trim()).filter(Boolean))
  ) as string[];

  // 大カテゴリー（部署）の既存一覧（クイック選択用）
  const existingDepartments = Array.from(
    new Set(jobs.map((job) => job.department?.trim()).filter(Boolean))
  ) as string[];

  // Filter jobs based on search term and category
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.category && job.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'All' || job.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const resetForm = () => {
    setName('');
    setPriceInput('');
    setDescription('');
    setDepartment('');
    setCategory('');
    setIsActive(true);
    setEditingJob(null);
    setIsFormOpen(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEdit = (job: Job) => {
    setEditingJob(job);
    setName(job.name);
    setPriceInput(String(job.unitPrice));
    setDescription(job.description);
    setDepartment(job.department || '');
    setCategory(job.category || '');
    setIsActive(job.isActive);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 単価は小数第2位まで許容（例: 1.25円）。入力を数値化し2桁に丸める。
    const parsedPrice = Math.round((parseFloat(priceInput) || 0) * 100) / 100;
    if (!name.trim() || parsedPrice < 0) return;

    const jobData = {
      name,
      unitPrice: parsedPrice,
      description,
      department: department.trim() || undefined,
      category: category.trim() || undefined,
      isActive,
    };

    if (editingJob) {
      onUpdateJob({
        ...editingJob,
        ...jobData,
      });
    } else {
      onAddJob(jobData);
    }
    resetForm();
  };

  return (
    <div className="space-y-6">
      {/* Search and Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="作業名、グループ、説明文で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            id="job-search-input"
          />
        </div>
        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2 px-5 rounded-xl shadow-xs transition-all cursor-pointer"
          id="btn-add-job"
        >
          <Plus className="w-4 h-4" />
          作業マスタを追加
        </button>
      </div>

      {/* Categories Filter Pills */}
      {existingCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-400 mr-1 shrink-0">グループ一覧:</span>
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              selectedCategory === 'All'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            すべて ({jobs.length})
          </button>
          {existingCategories.map((cat) => {
            const count = jobs.filter(j => j.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Tag className="w-2.5 h-2.5" />
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition-all duration-200 shadow-xs ${
              job.isActive ? 'border-slate-200' : 'border-slate-200/60 opacity-75'
            }`}
            id={`job-card-${job.id}`}
          >
            <div>
              {/* Header */}
              <div className="flex justify-between items-start gap-2 mb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl shrink-0 mt-0.5 border border-slate-100">
                    <Hammer className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    {job.department && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-white rounded-lg text-[9px] font-black mb-1.5 mr-1">
                        {job.department}
                      </span>
                    )}
                    {job.category && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-[9px] font-bold mb-1.5">
                        <Tag className="w-2.5 h-2.5 shrink-0" />
                        {job.category}
                      </span>
                    )}
                    <h3 className="text-sm font-black text-slate-800 leading-snug tracking-tight">{job.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 mt-2 rounded-full text-[10px] font-bold border ${
                      job.isActive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {job.isActive ? '有効' : '無効'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenEdit(job)}
                  className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  title="作業情報の編集"
                  id={`btn-edit-job-${job.id}`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Price Display */}
              <div className="my-4 p-4 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">基本単価 (1個あたり)</span>
                <span className="text-lg font-black text-indigo-600 font-mono">{formatYen(job.unitPrice)}</span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-3 font-medium">
                {job.description || '説明文はありません。'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex justify-between items-center font-medium">
              <span>登録日: {new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}

        {filteredJobs.length === 0 && (
          <div className="col-span-full bg-white p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
            検索条件に一致する作業マスタが見つかりません。
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                <h3 className="text-base font-black text-slate-800">
                  {editingJob ? '作業マスタの編集' : '新規作業マスタの登録'}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                  id="btn-close-job-form"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">作業名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="例) シール貼り、部品の組み立て"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    id="job-name-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    大カテゴリー（依頼先の部署・場所） <span className="text-slate-400 font-medium">例) 事務所、製造ライン</span>
                  </label>
                  <input
                    type="text"
                    placeholder="例) 事務所、製造ライン、検品課 など"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    id="job-department-input"
                  />
                  {existingDepartments.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">既存の大カテゴリーから選択:</span>
                      <div className="flex flex-wrap gap-1">
                        {existingDepartments.map((dep) => (
                          <button
                            key={dep}
                            type="button"
                            onClick={() => setDepartment(dep)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-md text-[9px] font-bold transition-all cursor-pointer border border-slate-200/50"
                          >
                            {dep}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">作業グループ（中カテゴリー）</label>
                  <input
                    type="text"
                    placeholder="例) 梱包作業、シール貼り、組み立てなど"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    id="job-category-input"
                  />
                  {existingCategories.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">既存のグループから選択:</span>
                      <div className="flex flex-wrap gap-1">
                        {existingCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(cat)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-md text-[9px] font-bold transition-all cursor-pointer border border-slate-200/50"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    単価 (1個/1件あたり、円) <span className="text-red-500">*</span>
                    <span className="ml-1 font-medium text-slate-400">小数第2位まで可（例: 1.25）</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      required
                      min={0}
                      step={0.01}
                      placeholder="例) 1.25"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono font-bold"
                      id="job-unitprice-input"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">円</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">説明文・仕様・注意点</label>
                  <textarea
                    rows={4}
                    placeholder="作業のやり方、検査基準、注意点などを記載できます。"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    id="job-description-textarea"
                  />
                </div>

                {/* Status Checkbox */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">状態</h4>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      id="job-active-checkbox"
                    />
                    <span className="text-sm font-bold text-slate-700">利用可能（チェックありで作業割当可能）</span>
                  </label>
                </div>

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
                    className="flex-1 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all cursor-pointer text-center"
                    id="btn-job-submit"
                  >
                    {editingJob ? '保存する' : '登録する'}
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

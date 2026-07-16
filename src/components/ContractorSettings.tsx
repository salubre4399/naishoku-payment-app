/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppSettings, PaymentConfig } from '../types';
import { 
  loadSettings, 
  saveSettings 
} from '../utils';
import { 
  Settings, 
  SlidersHorizontal, 
  FileText, 
  Upload, 
  Trash2, 
  Building,
  AlertTriangle
} from 'lucide-react';
import GoogleDriveManager from './GoogleDriveManager';

interface ContractorSettingsProps {
  onSettingsChange: () => void;
  onDataReset?: () => void;
}

export default function ContractorSettings({ onSettingsChange, onDataReset }: ContractorSettingsProps) {
  // Local states for AppSettings
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  
  // Local states for PaymentConfig (Payroll & Transfer settings)
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(() => {
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

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const triggerNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  };

  // Helper to update AppSettings
  const handleUpdateAppSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
    onSettingsChange();
    triggerNotification('success', 'アプリ設定を更新しました。');
  };

  // Helper to update PaymentConfig
  const handleUpdatePaymentConfig = (updated: PaymentConfig) => {
    setPaymentConfig(updated);
    localStorage.setItem('naishoku_payment_config', JSON.stringify(updated));
    onSettingsChange();
    triggerNotification('success', '締め・振込精算の設定を自動保存しました。');
  };

  // Company Stamp Upload
  const handleCompanyStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      triggerNotification('error', '画像ファイルサイズは2MB以下にしてください。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      if (base64String) {
        handleUpdateAppSetting('companyStampUrl', base64String);
        triggerNotification('success', '会社印影を適用しました！');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCompanyStamp = () => {
    const updated = { ...settings };
    delete updated.companyStampUrl;
    setSettings(updated);
    saveSettings(updated);
    onSettingsChange();
    triggerNotification('success', '会社印影を削除しました。');
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-250">
      
      {/* Title Header with Action State Notifications */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs relative">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-150 rounded-full text-[10px] font-black text-indigo-700 uppercase tracking-wider">
            <Settings className="w-3.5 h-3.5" />
            <span>契約・管理・ブランドの一括集約コンソール</span>
          </div>
          <h2 className="text-xl font-black text-slate-850 mt-2.5">
            統合設定センター
          </h2>
          <p className="text-xs text-slate-400 font-bold mt-1">
            お支払いルール、振込手数料、印影、自動支払い完了基準をいつでも自由に変更・調整可能です。
          </p>
        </div>

        {/* Global Toast Notification inside header */}
        {notification && (
          <div className={`p-3 rounded-2xl text-xs font-black shadow-lg flex items-center gap-2 border animate-bounce ${
            notification.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-ping" />
            <span>{notification.text}</span>
          </div>
        )}
      </div>

      {/* Grid Layout of Bento-like Settings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Section 3: Payroll, Cutoff, Bank & Transfer Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <SlidersHorizontal className="w-4.5 h-4.5 text-indigo-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              1. 集計・締め支払い・振込手数料ルール
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cutoff Day select */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  締め日の設定 (集計単位)
                </label>
                <select
                  value={paymentConfig.cutoffDay}
                  onChange={(e) => handleUpdatePaymentConfig({ ...paymentConfig, cutoffDay: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="末日">毎月末日締め</option>
                  <option value="20日">毎月20日締め</option>
                  <option value="15日">毎月15日締め</option>
                  <option value="10日">毎月10日締め</option>
                </select>
              </div>

              {/* Transfer scheduled day */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  支払期日 (標準の振込予定日)
                </label>
                <select
                  value={paymentConfig.transferDayType}
                  onChange={(e) => handleUpdatePaymentConfig({ ...paymentConfig, transferDayType: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="next-10">翌月10日振込</option>
                  <option value="next-15">翌月15日振込</option>
                  <option value="next-20">翌月20日振込 (標準)</option>
                  <option value="next-25">翌月25日振込</option>
                  <option value="next-end">翌月末日振込</option>
                  <option value="current-end">当月末日振込</option>
                  <option value="custom">カスタム（下に入力）</option>
                </select>
              </div>
            </div>

            {/* Conditional custom transfer text */}
            {paymentConfig.transferDayType === 'custom' && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  カスタム振込予定日の自由記述
                </label>
                <input
                  type="text"
                  value={paymentConfig.customTransferDayText}
                  onChange={(e) => handleUpdatePaymentConfig({ ...paymentConfig, customTransferDayText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                  placeholder="例: 翌月末営業日、随時払い など"
                />
              </div>
            )}

            {/* Fee Burden select */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                振込手数料の負担ルール
              </label>
              <select
                value={paymentConfig.feeBurden}
                onChange={(e) => handleUpdatePaymentConfig({ ...paymentConfig, feeBurden: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
              >
                <option value="company">自社負担（内職者には満額支払われ、手数料は自社で吸収）</option>
                <option value="worker">内職者負担（支払額から手数料設定に応じた額を自動的に差し引き）</option>
              </select>
              <p className="text-[9px] text-slate-400 font-bold mt-1">
                ※ 内職者負担に設定した場合、金融機関および振込金額（3万円未満/以上）に応じた手数料が差し引かれます。
              </p>
            </div>

            {/* Sender Bank info */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                自社の標準振込元銀行口座
              </label>
              <input
                type="text"
                value={paymentConfig.senderBankName}
                onChange={(e) => handleUpdatePaymentConfig({ ...paymentConfig, senderBankName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                placeholder="例: みずほ銀行　本店営業部"
              />
              <p className="text-[9px] text-slate-400 font-bold mt-1">
                ※ 同一銀行・同一支店・他店などの手数料判定（振込手数料の算出）に利用します。
              </p>
            </div>

          </div>
        </div>

        {/* Section 4: Payslip Printing, Company Stamp & Auto Completion Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4.5 h-4.5 text-indigo-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              2. 報酬明細書・会社印・自動完了設定
            </h3>
          </div>

          <div className="space-y-5 text-xs">
            
            {/* Stamp upload and setup */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-3">
              <div className="flex items-start gap-2.5">
                <Building className="w-4.5 h-4.5 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[11px] font-black text-slate-700">報酬明細用 会社角印/電子印影(丸印)の登録</h4>
                  <p className="text-[9px] text-slate-450 font-bold mt-0.5">印刷時、明細書の「発行元」欄の背景に印影が自動合成されます（透過PNG/白背景推奨）。</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                {/* Stamp visual slot */}
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center p-1 relative overflow-hidden shrink-0">
                  {settings.companyStampUrl ? (
                    <>
                      <img 
                        src={settings.companyStampUrl} 
                        alt="会社印" 
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveCompanyStamp}
                        className="absolute top-0 right-0 bg-rose-500 hover:bg-rose-600 text-white p-0.5 rounded-bl-lg transition-colors cursor-pointer"
                        title="削除"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <div className="text-[9px] text-slate-350 font-black text-center">
                      印影なし
                    </div>
                  )}
                </div>

                {/* Upload buttons */}
                <div className="flex-1 w-full space-y-1.5">
                  <label className="flex items-center justify-center gap-1.5 w-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-250 py-1.5 px-3 rounded-lg cursor-pointer transition-all text-center text-[10px] font-black shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    印影画像を選択してアップロード
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleCompanyStampUpload} 
                      className="hidden" 
                    />
                  </label>
                  <p className="text-[8px] text-slate-400 font-bold text-center sm:text-left">
                    ※ 1:1比率の正方形に近い、白背景または透過画像（2MB以内）を推奨。
                  </p>
                </div>
              </div>

              {/* Stamp toggle */}
              <div className="pt-2 border-t border-slate-200/60">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={settings.showCompanyStampOnPrint || false}
                    onChange={(e) => handleUpdateAppSetting('showCompanyStampOnPrint', e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded-sm cursor-pointer"
                  />
                  <span className="text-[10px] font-black text-slate-650">明細の印刷時に印影を自動印字する</span>
                </label>
              </div>
            </div>

            {/* Auto payment date rules */}
            <div className="text-xs space-y-2">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  「振込完了」登録時の精算完了日ルールの指定
                </label>
                <select
                  value={paymentConfig.autoPaymentDateType}
                  onChange={(e) => handleUpdatePaymentConfig({ ...paymentConfig, autoPaymentDateType: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="today">処理を完了した当日（自動適用）</option>
                  <option value="scheduled">上記の標準振込予定日（自動適用）</option>
                  <option value="custom">指定した固定の日（下でカレンダー入力）</option>
                </select>
              </div>

              {paymentConfig.autoPaymentDateType === 'custom' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">
                    固定適用するお支払い完了日
                  </label>
                  <input
                    type="date"
                    value={paymentConfig.customAutoPaymentDate}
                    onChange={(e) => handleUpdatePaymentConfig({ ...paymentConfig, customAutoPaymentDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                  />
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Google Drive Synchronization Section */}
      <div className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <GoogleDriveManager onDataReset={onDataReset} />
      </div>

    </div>
  );
}

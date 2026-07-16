/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Worker, Job, WorkLog, MonthlyPayment } from '../types';
import { formatYen, formatDateJP, formatMonthJP, loadSettings, saveSettings } from '../utils';
import { X, Printer, Building2, Landmark, Check, Cloud, Loader2 } from 'lucide-react';
import { getAccessToken } from '../lib/firebaseAuth';
import { initializeAppFolders, uploadFileToDrive } from '../lib/googleDrive';

interface StatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker;
  month: string;
  workLogs: WorkLog[];
  jobs: Job[];
  payment: MonthlyPayment | null;
}

export default function StatementModal({
  isOpen,
  onClose,
  worker,
  month,
  workLogs,
  jobs,
  payment,
}: StatementModalProps) {
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('naishoku_company_name') || '内職管理センター株式会社');
  const [companyZip, setCompanyZip] = useState(() => localStorage.getItem('naishoku_company_zip') || '150-0002');
  const [companyAddress, setCompanyAddress] = useState(() => localStorage.getItem('naishoku_company_address') || '東京都渋谷区渋谷1-2-3 渋谷ビル4F');
  const [companyPhone, setCompanyPhone] = useState(() => localStorage.getItem('naishoku_company_phone') || '03-5468-XXXX');
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());

  const [config] = useState(() => {
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

  const getScheduledPaymentDateLocal = (monthStr: string): string => {
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

  const handleSaveCompany = () => {
    localStorage.setItem('naishoku_company_name', companyName);
    localStorage.setItem('naishoku_company_zip', companyZip);
    localStorage.setItem('naishoku_company_address', companyAddress);
    localStorage.setItem('naishoku_company_phone', companyPhone);
    setIsEditingCompany(false);
  };

  if (!isOpen) return null;

  // Filter logs for this worker and this month
  const monthlyCompletedLogs = workLogs.filter(
    log => log.workerId === worker.id &&
    log.date.startsWith(month) &&
    log.status === 'completed'
  );

  // Group logs by Job ID to summarize clean line items
  const summaryMap: { [jobId: string]: { quantity: number; ngQuantity: number; okQuantity: number; unitPrice: number; name: string } } = {};
  monthlyCompletedLogs.forEach(log => {
    const job = jobs.find(j => j.id === log.jobId);
    if (!job) return;
    if (!summaryMap[log.jobId]) {
      summaryMap[log.jobId] = {
        quantity: 0,
        ngQuantity: 0,
        okQuantity: 0,
        unitPrice: job.unitPrice,
        name: job.name,
      };
    }
    summaryMap[log.jobId].quantity += log.quantity;
    summaryMap[log.jobId].ngQuantity += (log.ngQuantity || 0);
    summaryMap[log.jobId].okQuantity += (log.quantity - (log.ngQuantity || 0));
  });

  const lineItems = Object.values(summaryMap);
  const totalAmount = lineItems.reduce((sum, item) => sum + (item.okQuantity * item.unitPrice), 0);

  let feeAmount = 0;
  if (totalAmount > 0) {
    if (config.feeBurden === 'worker-110') feeAmount = 110;
    else if (config.feeBurden === 'worker-220') feeAmount = 220;
    else if (config.feeBurden === 'worker-actual') feeAmount = 330;
  }
  const netAmount = Math.max(0, totalAmount - feeAmount);

  const handlePrint = () => {
    window.print();
  };

  const [isSavingToDrive, setIsSavingToDrive] = useState(false);

  const handleSaveToDrive = async () => {
    setIsSavingToDrive(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        alert('Google Driveに接続されていません。「設定」画面の一番下にある「Google Driveに接続」ボタンをクリックして連携を行ってください。');
        return;
      }

      const folders = await initializeAppFolders(accessToken);
      
      // Build statement text representation
      const currentDate = new Date().toLocaleDateString('ja-JP');
      const itemsText = lineItems.map(item => {
        const ngDetail = item.ngQuantity > 0 ? ` (総数: ${item.quantity} / NG: ${item.ngQuantity})` : '';
        return `• ${item.name}${ngDetail}\n  単価: ${formatYen(item.unitPrice)} | 良品数: ${item.okQuantity} 個 | 金額: ${formatYen(item.okQuantity * item.unitPrice)}`;
      }).join('\n');

      const bankDetailsText = worker.bankName 
        ? `金融機関: ${worker.bankName} (${worker.bankBranch})\n口座番号: ${worker.bankAccountType} ${worker.bankAccountNumber}\n口座名義: ${worker.bankAccountHolder || worker.name}`
        : '未登録';

      const statementText = `==================================================
                 内職報酬支払明細書
==================================================
対象度分：${formatMonthJP(month)}度分
お宛先　：${worker.name} 様

発行日　：${currentDate}
発行元　：${companyName}
郵便番号：〒${companyZip}
住所　　：${companyAddress}
電話番号：TEL ${companyPhone}
--------------------------------------------------
お支払合計金額 (当月支給額)：${formatYen(netAmount)}
--------------------------------------------------
【報酬算出の内訳】
${lineItems.length === 0 ? '当月の検品完了データがありません。' : itemsText}

総報酬合計金額：${formatYen(totalAmount)}
${feeAmount > 0 ? `振込手数料差引負担：-${formatYen(feeAmount)}\n差引手取振込支給額：${formatYen(netAmount)}` : ''}

【お振込先口座】
${bankDetailsText}
--------------------------------------------------
本明細書の内容に相違がある場合は、速やかに支払発行元までご連絡いただきますようお願い申し上げます。
==================================================`;

      const filename = `naishoku_statement_${worker.name}_${month}.txt`;
      await uploadFileToDrive(accessToken, filename, 'text/plain', statementText, folders.statementsFolderId);
      
      alert(`Google Driveの「内職報酬管理システム_GoogleDrive/明細書_PDF・テキスト」フォルダに、支払明細書（${filename}）を保存しました！`);
    } catch (err: any) {
      console.error(err);
      alert(`Google Driveへの保存に失敗しました: ${err.message}`);
    } finally {
      setIsSavingToDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" id="statement-modal-overlay">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header (Hidden during print) */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 shrink-0 print:hidden">
          <div>
            <h3 className="text-sm font-black text-slate-800">支払明細書 プレビュー</h3>
            <p className="text-[10px] text-slate-400 font-medium">印刷（PDF保存）または会社情報の変更ができます。</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Stamp print toggle */}
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all select-none">
              <input
                type="checkbox"
                checked={settings.showCompanyStampOnPrint ?? true}
                onChange={(e) => {
                  const updated = { ...settings, showCompanyStampOnPrint: e.target.checked };
                  setSettings(updated);
                  saveSettings(updated);
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
              />
              <span>会社印を表示する</span>
            </label>
            <button
              onClick={() => setIsEditingCompany(!isEditingCompany)}
              className="inline-flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-1.5 px-3 rounded-xl transition-colors cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              {isEditingCompany ? '編集完了' : '発行元情報の変更'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              印刷・PDF保存
            </button>
            <button
              onClick={handleSaveToDrive}
              disabled={isSavingToDrive}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-1.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {isSavingToDrive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Cloud className="w-3.5 h-3.5" />
              )}
              Google Driveへ保存
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors cursor-pointer"
              id="btn-close-statement-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container (Printable area) */}
        <div className="overflow-y-auto p-6 md:p-10 flex-1 print:overflow-visible print:p-0" id="statement-printable-area">
          
          {/* Company Info Editing Panel (Hidden during print) */}
          {isEditingCompany && (
            <div className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-xs print:hidden">
              <h4 className="font-black text-slate-700">発行元（会社情報）の変更</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">事業所名・会社名</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">電話番号</label>
                  <input
                    type="text"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">郵便番号</label>
                  <input
                    type="text"
                    value={companyZip}
                    onChange={(e) => setCompanyZip(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">所在地・住所</label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-xs font-bold"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveCompany}
                className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-4 rounded-xl transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                適用する
              </button>
            </div>
          )}

          {/* ----- STATEMENT SHEET (TRADITIONAL JAPANESE BUSINESS STYLE) ----- */}
          <div className="print-sheet mx-auto max-w-2xl bg-white p-2 text-slate-900 font-sans leading-relaxed">
            
            {/* Document Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold tracking-widest border-b-2 border-double border-slate-800 pb-2 inline-block px-12">
                内職報酬支払明細書
              </h1>
            </div>

            {/* Meta info block */}
            <div className="flex justify-between items-start mb-8 gap-6 text-sm">
              {/* Recipient Details (Left) */}
              <div className="space-y-1">
                <div className="text-xs text-slate-500">対象：{formatMonthJP(month)}度分</div>
                <div className="text-lg font-bold border-b border-slate-800 pb-1.5 flex items-baseline gap-2">
                  <span className="text-slate-900 font-extrabold">{worker.name}</span>
                  <span className="text-sm font-medium text-slate-600">様</span>
                </div>
                <div className="text-xs text-slate-500 pt-1">
                  いつも丁寧な内職作業をいただき、心より感謝申し上げます。
                </div>
              </div>

              {/* Issuer Details (Right) */}
              <div className="text-right text-xs space-y-1 shrink-0 relative pr-18">
                <div>発行日: {formatDateJP(new Date().toISOString().substring(0, 10))}</div>
                <div className="font-bold text-sm text-slate-800 pt-1">{companyName}</div>
                <div>〒{companyZip}</div>
                <div>{companyAddress}</div>
                <div>TEL: {companyPhone}</div>
                {config.senderBankName && (
                  <div className="text-[10px] text-slate-400">振込元: {config.senderBankName}</div>
                )}
                
                {/* Square Stamp Hanko Box / Custom Stamp */}
                {(settings.showCompanyStampOnPrint ?? true) && (
                  settings.companyStampUrl ? (
                    <div className="absolute right-1 bottom-[-8px] w-16 h-16 pointer-events-none select-none z-10">
                      <img
                        src={settings.companyStampUrl}
                        alt="Company Stamp"
                        className="w-full h-full object-contain opacity-95"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="absolute right-0 bottom-0 w-14 h-14 border border-red-400/80 rounded-sm flex items-center justify-center text-red-500 text-[10px] font-bold text-center leading-3 p-1 rotate-[-3deg] print:border-red-500 print:text-red-600 select-none">
                      センター<br/>支払印
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Big Total Box */}
            <div className="border border-slate-800 bg-white p-4 rounded-md mb-8 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">お支払合計金額 {feeAmount > 0 ? '(差引手取振込支給額)' : '(当月実績)'}</span>
              <span className="text-2xl font-black text-slate-900 font-mono tracking-wider border-b-2 border-slate-900 pb-0.5">
                {formatYen(netAmount)}-
              </span>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">【 報酬算出の内訳 】</h4>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-y-2 border-slate-800 font-bold bg-white text-slate-700">
                    <th className="py-2 px-3 text-left">作業項目 (内職内容)</th>
                    <th className="py-2 px-3 text-right">単価</th>
                    <th className="py-2 px-3 text-right">数量（検品完了・良品数）</th>
                    <th className="py-2 px-3 text-right">金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lineItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/10">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        <div>{item.name}</div>
                        {item.ngQuantity > 0 && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            (内訳: 総数 {item.quantity.toLocaleString()} 個 / NG {item.ngQuantity.toLocaleString()} 個)
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-mono">{formatYen(item.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right text-slate-800 font-bold font-mono">{item.okQuantity.toLocaleString()} 個</td>
                      <td className="py-2.5 px-3 text-right text-slate-900 font-extrabold font-mono">{formatYen(item.okQuantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                  {lineItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">当月の検品完了データがありません。</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-800 font-bold text-slate-900 bg-white">
                    <td colSpan={2} className="py-2.5 px-3 text-left">合計（非課税）</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                      <div>{lineItems.reduce((sum, i) => sum + i.okQuantity, 0).toLocaleString()} 個</div>
                      {lineItems.reduce((sum, i) => sum + i.ngQuantity, 0) > 0 && (
                        <div className="text-[9px] text-rose-500 font-medium">(NG 合計: {lineItems.reduce((sum, i) => sum + i.ngQuantity, 0).toLocaleString()} 個)</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-lg text-slate-900">{formatYen(totalAmount)}</td>
                  </tr>
                  {feeAmount > 0 && (
                    <tr className="border-t border-slate-300 font-bold text-slate-600 bg-white">
                      <td colSpan={3} className="py-1 px-3 text-left text-[11px]">振込手数料差引負担</td>
                      <td className="py-1 px-3 text-right font-mono text-[11px] text-rose-600">-{formatYen(feeAmount)}</td>
                    </tr>
                  )}
                  {feeAmount > 0 && (
                    <tr className="border-t-2 border-slate-800 font-black text-slate-900 bg-white">
                      <td colSpan={3} className="py-2 px-3 text-left">差引手取振込支給額</td>
                      <td className="py-2 px-3 text-right font-mono text-base text-slate-950">{formatYen(netAmount)}</td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            {/* Bank details */}
            <div className="border border-slate-300 p-4 rounded-md text-xs space-y-1.5 bg-white">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
                <Landmark className="w-3.5 h-3.5 text-slate-500" />
                <span>【 お振込先口座 】</span>
              </div>
              {worker.bankName ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 leading-relaxed font-medium">
                  <div>
                    <span className="text-slate-400">金融機関:</span> {worker.bankName} ({worker.bankBranch})
                  </div>
                  <div>
                    <span className="text-slate-400">口座番号:</span> {worker.bankAccountType} {worker.bankAccountNumber}
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <span className="text-slate-400">口座名義:</span> {worker.bankAccountHolder || worker.name}
                  </div>
                  {payment?.paymentStatus === 'paid' ? (
                    <div className="col-span-1 md:col-span-2 text-emerald-600 font-semibold flex items-center gap-1 pt-1 border-t border-slate-100 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>振込処理完了 ({payment.paymentDate ? formatDateJP(payment.paymentDate) : '済'})</span>
                    </div>
                  ) : (
                    <div className="col-span-1 md:col-span-2 text-indigo-600 font-semibold flex items-center gap-1 pt-1 border-t border-slate-100 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      <span>
                        振込予定日: {getScheduledPaymentDateLocal(month)} 頃（当月{config.cutoffDay}締め）
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 font-medium">
                  振込用の口座情報が未登録です。口座登録を行いますと、自動で振込先が印字されます。
                </div>
              )}
            </div>

            {/* Footer notice */}
            <div className="mt-8 text-[10px] text-slate-400 text-center leading-relaxed">
              本明細書の内容に相違がある場合は、速やかに支払発行元までご連絡いただきますようお願い申し上げます。<br />
              © {new Date().getFullYear()} {companyName}
            </div>
          </div>
          {/* ----- END OF STATEMENT SHEET ----- */}

        </div>
      </div>

      {/* Embedded CSS specific for print layout */}
      <style>{`
        @media print {
          /* Hide everything except printable area */
          body * {
            visibility: hidden;
          }
          #statement-printable-area, #statement-printable-area * {
            visibility: visible;
          }
          /* Position printable area perfectly */
          #statement-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          #statement-modal-overlay {
            background: white !important;
            backdrop-filter: none !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          /* Remove boxes and shadows */
          .bg-white, .print-sheet {
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          /* Hide print preview headers */
          .print\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

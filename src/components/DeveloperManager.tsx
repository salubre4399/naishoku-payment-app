import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Terminal, 
  Settings, 
  UserCheck, 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Check, 
  AlertTriangle,
  RefreshCw,
  LogOut,
  Briefcase,
  CreditCard,
  Users,
  LayoutDashboard,
  Heart,
  Award,
  Zap,
  CheckCircle,
  Palette,
  Layers,
  Sparkles,
  Info,
  HelpCircle,
  Megaphone,
  CalendarClock,
  FileText,
  SlidersHorizontal,
  Bell,
  BookOpen,
  ClipboardList
} from 'lucide-react';
import { Worker, Job, WorkLog, MonthlyPayment, AppSettings } from '../types';
import {
  loadWorkers,
  loadJobs,
  loadWorkLogs,
  loadPayments,
  loadSettings,
  saveSettings
} from '../utils';
import { AccessConfig, saveAccessConfig } from '../lib/access';
import { COLLECTIONS, deleteItem, migrateArraysToCloud } from '../lib/store';
import { Mail, Plus, X, CloudUpload, ExternalLink } from 'lucide-react';

// Google Cloud OAuth同意画面（テストユーザー登録）へのリンク
const OAUTH_TESTUSERS_URL =
  'https://console.cloud.google.com/apis/credentials/consent?project=gen-lang-client-0874086404';

interface DeveloperManagerProps {
  onSettingsChange?: () => void; // Notify main layout to dynamically update logos, names, active tabs
  currentEmail?: string | null;  // ログイン中の開発者メール
  accessConfig?: AccessConfig | null; // 許可アカウント設定 (Firestore)
  workers: Worker[];
  jobs: Job[];
  workLogs: WorkLog[];
  payments: MonthlyPayment[];
}

export default function DeveloperManager({
  onSettingsChange,
  currentEmail,
  accessConfig,
  workers,
  jobs,
  workLogs,
  payments,
}: DeveloperManagerProps) {
  // 許可アカウント編集用ローカル状態（accessConfigに追従）
  const [members, setMembers] = useState<string[]>(accessConfig?.members || []);
  const [devEmail, setDevEmail] = useState<string>(accessConfig?.developerEmail || '');
  const [newMember, setNewMember] = useState('');
  useEffect(() => {
    setMembers(accessConfig?.members || []);
    setDevEmail(accessConfig?.developerEmail || '');
  }, [accessConfig]);

  // 統計（Firestoreデータ = props から算出）
  const stats = {
    workersCount: workers.length,
    jobsCount: jobs.length,
    logsCount: workLogs.length,
    paymentsCount: payments.length,
    totalYen: workLogs.reduce((total, log) => {
      const job = jobs.find((j) => j.id === log.jobId);
      return total + (job ? log.quantity * job.unitPrice : 0);
    }, 0),
  };

  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // App Settings States
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [customBulletin, setCustomBulletin] = useState<string>(() => localStorage.getItem('homeworkers_bulletin_text') || '【お知らせ】\nこちらにスタッフ・操作員向けのお知らせ、作業ルール、連絡事項などのカスタム表示ができます。開発者タブより自由に編集・更新が可能です。');
  const [limitInputType, setLimitInputType] = useState<'fixed' | 'custom'>(() => {
    const s = loadSettings();
    return [5, 10, 25, 100, 99999].includes(s.workerLimit) ? 'fixed' : 'custom';
  });
  const [customLimit, setCustomLimit] = useState<number>(() => {
    const s = loadSettings();
    return s.workerLimit;
  });

  const updateSettingField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
    if (onSettingsChange) {
      onSettingsChange();
    }
    triggerNotification('success', 'アプリ設定を更新・保存しました。');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        updateSettingField('customLogoUrl', base64String);
        triggerNotification('success', 'カスタムロゴ画像をアップロードして適用しました！');
      }
    };
    reader.onerror = () => {
      triggerNotification('error', 'ファイルの読み込みに失敗しました。');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomLogo = () => {
    const updated = { ...settings };
    delete updated.customLogoUrl;
    setSettings(updated);
    saveSettings(updated);
    if (onSettingsChange) {
      onSettingsChange();
    }
    triggerNotification('success', 'カスタムロゴ画像を削除し、デフォルトのアイコン表示に戻しました。');
  };

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
        updateSettingField('companyStampUrl', base64String);
        triggerNotification('success', '会社印画像をアップロードして適用しました！');
      }
    };
    reader.onerror = () => {
      triggerNotification('error', 'ファイルの読み込みに失敗しました。');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCompanyStamp = () => {
    const updated = { ...settings };
    delete updated.companyStampUrl;
    setSettings(updated);
    saveSettings(updated);
    if (onSettingsChange) {
      onSettingsChange();
    }
    triggerNotification('success', '会社印画像を削除しました。');
  };

  const handleToggleTab = (tabId: string) => {
    let newHidden = [...settings.hiddenTabs];
    if (newHidden.includes(tabId)) {
      newHidden = newHidden.filter(t => t !== tabId);
    } else {
      const standardTabs = ['dashboard', 'workers', 'jobs', 'logs', 'payments'];
      const currentVisibleStandard = standardTabs.filter(t => !newHidden.includes(t));
      if (currentVisibleStandard.length <= 1 && currentVisibleStandard.includes(tabId)) {
        triggerNotification('error', '少なくとも1つの標準タブを表示状態にする必要があります。');
        return;
      }
      newHidden.push(tabId);
    }
    updateSettingField('hiddenTabs', newHidden);
  };

  const handleUpdateTabCustomization = (tabId: string, name: string, icon: string) => {
    const currentCustomizations = settings.tabCustomizations || {};
    const updatedCustomizations = {
      ...currentCustomizations,
      [tabId]: { name, icon }
    };
    const updated = { ...settings, tabCustomizations: updatedCustomizations };
    setSettings(updated);
    saveSettings(updated);
    if (onSettingsChange) {
      onSettingsChange();
    }
    triggerNotification('success', 'タブのカスタム名称・アイコン設定を更新しました。');
  };

  const handleSaveBulletinText = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('homeworkers_bulletin_text', customBulletin);
    if (onSettingsChange) {
      onSettingsChange();
    }
    triggerNotification('success', 'お知らせタブの内容を更新しました。');
  };

  // --- 許可アカウント管理 (Firestore config/access) ---
  const handleAddMember = () => {
    const email = newMember.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      triggerNotification('error', '正しいメールアドレスを入力してください。');
      return;
    }
    if (members.map((m) => m.toLowerCase()).includes(email)) {
      triggerNotification('error', 'そのアカウントは既に登録されています。');
      return;
    }
    setMembers([...members, email]);
    setNewMember('');
  };

  const handleRemoveMember = (email: string) => {
    setMembers(members.filter((m) => m !== email));
  };

  const handleSaveAccess = async () => {
    if (!devEmail.trim().includes('@')) {
      triggerNotification('error', '開発者メールアドレスが正しくありません。');
      return;
    }
    try {
      await saveAccessConfig({ members, developerEmail: devEmail.trim() });
      triggerNotification('success', '許可アカウント設定を保存しました。');
    } catch (e) {
      console.error(e);
      triggerNotification('error', '保存に失敗しました。この操作は開発者アカウントのみ実行できます。');
    }
  };

  // --- 端末内(localStorage)の既存データをクラウドへ移行 ---
  const handleMigrateLocal = async () => {
    try {
      const count = await migrateArraysToCloud({
        workers: loadWorkers(),
        jobs: loadJobs(),
        workLogs: loadWorkLogs(),
        payments: loadPayments(),
      });
      if (count === 0) {
        triggerNotification('error', '移行対象の端末内データが見つかりませんでした。');
      } else {
        triggerNotification('success', `端末内の${count}件のデータをクラウドへ移行しました。`);
      }
    } catch (e) {
      console.error(e);
      triggerNotification('error', 'クラウドへの移行に失敗しました。');
    }
  };

  const triggerNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Simple encryption/decryption (obfuscation) helper to prevent easy copying/modifying
  const encryptData = (plainText: string, key: string): string => {
    const base64 = btoa(unescape(encodeURIComponent(plainText)));
    let result = '';
    const keyLen = key.length;
    for (let i = 0; i < base64.length; i++) {
      const charCode = base64.charCodeAt(i);
      const keyCharCode = key.charCodeAt(i % keyLen);
      const cipherCode = charCode ^ keyCharCode;
      result += cipherCode.toString(16).padStart(2, '0');
    }
    return 'HW-SECURED:' + result;
  };

  const decryptData = (cipherText: string, key: string): string => {
    if (!cipherText.startsWith('HW-SECURED:')) {
      throw new Error('暗号シグネチャが無効、または暗号化されていないプレーンなJSONデータです。');
    }
    const hex = cipherText.replace('HW-SECURED:', '');
    let base64 = '';
    const keyLen = key.length;
    for (let i = 0, j = 0; i < hex.length; i += 2, j++) {
      const cipherCode = parseInt(hex.substring(i, i + 2), 16);
      const keyCharCode = key.charCodeAt(j % keyLen);
      const charCode = cipherCode ^ keyCharCode;
      base64 += String.fromCharCode(charCode);
    }
    return decodeURIComponent(escape(atob(base64)));
  };

  // JSON Export (Backup): クラウド上の現在データをファイル出力
  const handleExportBackup = () => {
    const payload = {
      workers,
      jobs,
      workLogs,
      payments,
      settings: loadSettings(),
      bulletin: localStorage.getItem('homeworkers_bulletin_text') || '',
      exportedAt: new Date().toISOString(),
    };
    const jsonString = JSON.stringify(payload, null, 2);
    let outputContent = jsonString;
    let fileName = `naishoku_backup_${new Date().toISOString().substring(0, 10)}.json`;

    if (settings.securityEncryptBackup) {
      const key = settings.securityBackupPassword || 'homeworkers-secure';
      outputContent = JSON.stringify({
        secured: true,
        payload: encryptData(jsonString, key),
        timestamp: new Date().toISOString(),
        author: 'Homeworkers Protection Engine'
      }, null, 2);
      fileName = `naishoku_SECURE_backup_${new Date().toISOString().substring(0, 10)}.enc.json`;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(outputContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    triggerNotification('success', settings.securityEncryptBackup
      ? '暗号化された安全なバックアップ（.enc.json）をエクスポートしました。'
      : 'クラウド上の全データをJSONファイルとしてエクスポートしました。');
  };

  // JSON Import (Restore): バックアップファイルからクラウドへ復元
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = async (event) => {
      try {
        const fileContent = event.target?.result as string;
        let parsed = JSON.parse(fileContent);

        // 暗号化バックアップの復号
        if (parsed && parsed.secured && parsed.payload) {
          const key = settings.securityBackupPassword || 'homeworkers-secure';
          try {
            parsed = JSON.parse(decryptData(parsed.payload, key));
          } catch (decryptError) {
            triggerNotification('error', 'バックアップデータの復号に失敗しました。「セキュリティ復元パスワード」がエクスポート時と一致しているか確認してください。');
            return;
          }
        }

        if (typeof parsed !== 'object' || parsed === null || !parsed.workers) {
          triggerNotification('error', '対応していないファイル形式です。このアプリでエクスポートしたJSONを選択してください。');
          return;
        }

        await migrateArraysToCloud({
          workers: parsed.workers || [],
          jobs: parsed.jobs || [],
          workLogs: parsed.workLogs || [],
          payments: parsed.payments || [],
        });

        if (parsed.settings) {
          saveSettings(parsed.settings);
          setSettings(loadSettings());
          onSettingsChange?.();
        }
        if (typeof parsed.bulletin === 'string') {
          localStorage.setItem('homeworkers_bulletin_text', parsed.bulletin);
        }

        triggerNotification('success', 'バックアップからクラウドへ復元しました。');
      } catch (err) {
        triggerNotification('error', 'ファイルの読み込みまたは解析に失敗しました。JSON形式か確認してください。');
      }
    };
    fileReader.readAsText(files[0]);
    e.target.value = '';
  };

  // Factory Reset: クラウド上の全業務データを削除
  const handleFactoryReset = async () => {
    try {
      await Promise.all([
        ...workers.map((w) => deleteItem(COLLECTIONS.WORKERS, w.id)),
        ...jobs.map((j) => deleteItem(COLLECTIONS.JOBS, j.id)),
        ...workLogs.map((l) => deleteItem(COLLECTIONS.WORK_LOGS, l.id)),
        ...payments.map((p) => deleteItem(COLLECTIONS.PAYMENTS, p.id)),
      ]);
      triggerNotification('success', 'クラウド上の全業務データを削除しました。');
    } catch (e) {
      console.error(e);
      triggerNotification('error', 'データ削除に失敗しました。');
    }
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-6" id="developer-dashboard">
      {/* Dev Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
            <Terminal className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 tracking-tight">開発者コントロールセンター</h2>
            <p className="text-xs text-slate-500 font-medium">許可アカウントの管理、データ移行・バックアップ、ブランド設定などを行います。</p>
          </div>
        </div>

        {currentEmail && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-150 ml-auto">
            <UserCheck className="w-3.5 h-3.5" />
            {currentEmail}
          </div>
        )}
      </div>

      {notification && (
        <div className={`p-4 rounded-xl border font-bold text-xs flex items-center gap-2.5 animate-in fade-in duration-200 ${
          notification.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-850'
        }`}>
          <Check className="w-4 h-4" />
          <span>{notification.text}</span>
        </div>
      )}

      {/* Grid of config sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 許可アカウント管理パネル */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <UserCheck className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">許可アカウント（Googleログイン）の管理</h3>
          </div>
          <p className="text-[11px] text-slate-450 font-medium">
            このシステムにログインできるGoogleアカウントを管理します。ここで許可したメールアドレスのみがアプリを利用できます。
          </p>

          {/* 重要な注意事項：2か所への登録が必要 */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 font-bold leading-relaxed space-y-1.5">
            <p className="flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>新しい職員を追加するときは、必ず次の<span className="underline">2か所</span>にメールを登録してください（片方だけだとログイン時に「403 access_denied」になります）。</span>
            </p>
            <p className="pl-5">① この下のフォームで、許可アカウントに追加して保存</p>
            <p className="pl-5">② Google Cloud の「OAuth同意画面 → テストユーザー」にも同じメールを追加</p>
            <a
              href={OAUTH_TESTUSERS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors no-underline"
            >
              <ExternalLink className="w-3 h-3" /> ②テストユーザー設定を開く
            </a>
          </div>

          {/* メンバー追加 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember(); } }}
                placeholder="追加するメールアドレス"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
              />
            </div>
            <button
              type="button"
              onClick={handleAddMember}
              className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> 追加
            </button>
          </div>

          {/* メンバー一覧 */}
          <div className="space-y-1.5">
            {members.length === 0 && (
              <p className="text-[11px] text-slate-400 font-bold py-2">許可アカウントがありません。</p>
            )}
            {members.map((email) => (
              <div key={email} className="flex items-center justify-between bg-slate-50 border border-slate-150 rounded-xl px-3 py-2">
                <span className="text-xs font-bold text-slate-700 break-all">{email}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {email.toLowerCase() === devEmail.trim().toLowerCase() && (
                    <span className="text-[9px] font-black text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-md">開発者</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(email)}
                    className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    title="削除"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 開発者メール変更 */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-650">開発者アカウント（開発者タブを操作できるメール）</label>
            <input
              type="email"
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="developer@example.com"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
            />
            <p className="text-[9px] text-amber-600 font-bold flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              変更後は、この新しいメールのGoogleアカウントでログインした時のみ開発者タブを操作できます。必ずログイン可能なアドレスを指定してください。
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveAccess}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" /> 許可アカウントを保存
          </button>
        </div>

        {/* 端末内データのクラウド移行パネル */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CloudUpload className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">端末内データのクラウド移行</h3>
          </div>
          <p className="text-[11px] text-slate-450 font-medium">
            以前この端末のブラウザ内(LocalStorage)に保存されていた担当者・作業・支払い等のデータを、共有クラウド(Firestore)へ取り込みます。1回だけ実行すれば十分です。
          </p>
          <button
            type="button"
            onClick={handleMigrateLocal}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <CloudUpload className="w-3.5 h-3.5" /> 端末内データをクラウドへ移行
          </button>
        </div>

        {/* Brand & Styling Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Palette className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">ブランド・デザイン・ロゴの調整</h3>
          </div>
          <p className="text-[11px] text-slate-450 font-medium">
            システムの表示タイトル、ロゴマーク、およびブランドのメインテーマ（カラー）をリアルタイムに変更します。
          </p>

          <div className="space-y-4 pt-1">
            {/* App Name */}
            <div>
              <label className="block text-[10px] font-bold text-slate-650 mb-1">システム製品名 / 表示タイトル</label>
              <input
                type="text"
                value={settings.appName}
                onChange={(e) => updateSettingField('appName', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 font-bold"
                placeholder="内職報酬管理システム"
              />
            </div>

            {/* Accent Color Selection */}
            <div>
              <label className="block text-[10px] font-bold text-slate-650 mb-2">テーマ・アクセントカラー</label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {[
                  { name: 'indigo', label: 'インディゴ', bg: 'bg-indigo-600' },
                  { name: 'blue', label: 'ブルー', bg: 'bg-blue-600' },
                  { name: 'emerald', label: 'エメラルド', bg: 'bg-emerald-600' },
                  { name: 'rose', label: 'ローズ', bg: 'bg-rose-600' },
                  { name: 'amber', label: 'アンバー', bg: 'bg-amber-600' },
                  { name: 'violet', label: 'バイオレット', bg: 'bg-violet-600' },
                  { name: 'slate', label: 'チャコール', bg: 'bg-slate-700' },
                ].map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => updateSettingField('accentColor', col.name as any)}
                    className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      settings.accentColor === col.name
                        ? 'border-slate-850 bg-slate-50 ring-2 ring-offset-1 ring-slate-400'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${col.bg}`} />
                    <span className="text-[8px] font-bold text-slate-500">{col.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Icon Picker */}
            <div>
              <label className="block text-[10px] font-bold text-slate-650 mb-2">ロゴアイコンマークの変更</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
                {[
                  { name: 'lock', icon: Lock, label: '鍵' },
                  { name: 'briefcase', icon: Briefcase, label: '作業' },
                  { name: 'credit-card', icon: CreditCard, label: '報酬' },
                  { name: 'users', icon: Users, label: '担当者' },
                  { name: 'layout-dashboard', icon: LayoutDashboard, label: '分析' },
                  { name: 'heart', icon: Heart, label: 'ハート' },
                  { name: 'award', icon: Award, label: '実績' },
                  { name: 'zap', icon: Zap, label: 'スピード' },
                  { name: 'check-circle', icon: CheckCircle, label: '完了' },
                  { name: 'workflow', icon: Layers, label: 'フロー' },
                  { name: 'terminal', icon: Terminal, label: 'システム' },
                  { name: 'sparkles', icon: Sparkles, label: '輝き' },
                ].map((item) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => updateSettingField('appLogo', item.name as any)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        settings.appLogo === item.name && !settings.customLogoUrl
                          ? 'border-slate-800 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/10'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                      <span className="text-[8px] font-bold">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Logo Image Upload */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="block text-[10px] font-bold text-slate-650 mb-2">またはオリジナルのロゴ画像をアップロード</span>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 overflow-hidden shadow-xs shrink-0">
                    {settings.customLogoUrl ? (
                      <img
                        src={settings.customLogoUrl}
                        alt="Uploaded Logo"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <HelpCircle className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex gap-2">
                      <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        ロゴ画像を選択
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                      {settings.customLogoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveCustomLogo}
                          className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-xl transition-all cursor-pointer"
                          title="アップロードしたロゴを削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold leading-tight">
                      ※ 1:1 の正方形に近い画像を推奨。ヘッダーのロゴとして表示されます。
                    </p>
                  </div>
                </div>
              </div>

              {/* Company Stamp Upload and Print Toggle */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-3">
                <span className="block text-[10px] font-bold text-slate-650 mb-2">明細書用 会社印（角印・丸印）の登録</span>
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="relative w-16 h-16 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 overflow-hidden shadow-xs shrink-0">
                    {settings.companyStampUrl ? (
                      <img
                        src={settings.companyStampUrl}
                        alt="Company Stamp"
                        className="w-full h-full object-contain p-1"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-[10px] text-slate-300 font-bold text-center leading-tight">印影<br />未設定</div>
                    )}
                  </div>
                  <div className="flex-1 w-full space-y-2.5">
                    <div className="flex gap-2">
                      <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        印影画像を選択
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCompanyStampUpload}
                          className="hidden"
                        />
                      </label>
                      {settings.companyStampUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveCompanyStamp}
                          className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 rounded-xl transition-all cursor-pointer"
                          title="アップロードした印影を削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {/* Checkbox to toggle stamp visibility on print */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={settings.showCompanyStampOnPrint ?? true}
                        onChange={(e) => updateSettingField('showCompanyStampOnPrint', e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span className="text-[10px] font-bold text-slate-700">報酬明細書の印刷時に会社印を表示する</span>
                    </label>
                    <p className="text-[9px] text-slate-400 font-bold leading-tight">
                      ※ 背景透過(PNG)の印影画像を推奨。報酬明細書の発行元情報欄に重なって表示されます。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Editor Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Layers className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">タブの表示/非表示・カスタム掲示板タブ設定</h3>
          </div>
          <p className="text-[11px] text-slate-450 font-medium">
            使用しないタブを非表示にして画面構成をシンプル化できます。また、スタッフ全員が閲覧できるカスタム「お知らせ・マニュアル」タブを追加できます。
          </p>

          <div className="space-y-4 pt-1">
            {/* Standard Tabs toggle list */}
            <div>
              <label className="block text-[10px] font-bold text-slate-650 mb-2">表示する標準メニューの選択</label>
              <div className="space-y-2">
                {[
                  { id: 'dashboard', name: 'ダッシュボード', desc: '全体サマリー・未払い状況分析グラフ' },
                  { id: 'workers', name: '内職担当者', desc: '内職担当者の登録・銀行口座管理' },
                  { id: 'jobs', name: '作業マスタ', desc: '単価や難易度などの作業区分設定' },
                  { id: 'logs', name: '作業・進捗管理', desc: '毎日の作業数記録・検品、ステータス更新' },
                  { id: 'payments', name: '支払い・明細発行', desc: '月次支払い集計、承認、振込CSV・領収書出力' },
                ].map((item) => {
                  const isVisible = !settings.hiddenTabs.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isVisible 
                          ? 'border-indigo-150 bg-indigo-50/10 hover:bg-indigo-50/20' 
                          : 'border-slate-150 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => handleToggleTab(item.id)}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div>
                          <span className="block text-xs font-bold text-slate-700">{item.name}</span>
                          <span className="block text-[9px] text-slate-450 font-medium">{item.desc}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        isVisible ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {isVisible ? '表示中' : '非表示'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Custom Tab Add/Edit Section */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[11px] font-bold text-slate-750">「お知らせ・マニュアル」タブを追加</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!settings.hiddenTabs.includes('bulletin')}
                    onChange={() => handleToggleTab('bulletin')}
                    className="sr-only peer cursor-pointer"
                  />
                  <div className="w-7 h-4 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <p className="text-[10px] text-slate-450 font-medium">
                有効にすると、マニュアルや作業ルールの伝達、休暇連絡などを掲載できる「お知らせ・連絡事項」タブがメニューバーに追加されます。
              </p>

              {!settings.hiddenTabs.includes('bulletin') && (
                <form onSubmit={handleSaveBulletinText} className="space-y-2">
                  <textarea
                    rows={4}
                    value={customBulletin}
                    onChange={(e) => setCustomBulletin(e.target.value)}
                    className="w-full p-2.5 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"
                    placeholder="スタッフへ伝達したい内容や、作業マニュアル手順などを入力してください。"
                  />
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                  >
                    お知らせ掲示板を更新保存
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Tab Name & Icon Customization Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">メニュータブの名称・アイコン設定</h3>
          </div>
          <p className="text-[11px] text-slate-450 font-medium">
            各メニュータブの表示名称とアイコンを個別に変更することができます。業務に合わせて分かりやすい表記にカスタマイズしてください。
          </p>

          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {[
              { id: 'dashboard', defaultName: 'ダッシュボード', defaultIcon: 'layout-dashboard' },
              { id: 'workers', defaultName: '内職担当者', defaultIcon: 'users' },
              { id: 'jobs', defaultName: '作業マスタ', defaultIcon: 'briefcase' },
              { id: 'logs', defaultName: '作業・進捗管理', defaultIcon: 'calendar-clock' },
              { id: 'payments', defaultName: '支払い・明細発行', defaultIcon: 'credit-card' },
              { id: 'bulletin', defaultName: 'お知らせ・連絡事項', defaultIcon: 'megaphone' },
              { id: 'contractor-settings', defaultName: '設定', defaultIcon: 'settings' },
              { id: 'developer', defaultName: 'developer', defaultIcon: 'terminal' }
            ].map((tab) => {
              const custom = settings.tabCustomizations?.[tab.id] || { name: tab.defaultName, icon: tab.defaultIcon };
              const currentName = custom.name;
              const currentIcon = custom.icon;

              return (
                <div key={tab.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">ID: {tab.id}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateTabCustomization(tab.id, tab.defaultName, tab.defaultIcon)}
                      className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 transition-all cursor-pointer"
                    >
                      デフォルトに戻す
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">タブの表示名</label>
                      <input
                        type="text"
                        value={currentName}
                        onChange={(e) => handleUpdateTabCustomization(tab.id, e.target.value, currentIcon)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-250 rounded-lg text-slate-800 font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        placeholder={tab.defaultName}
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">表示アイコン</label>
                      <select
                        value={currentIcon}
                        onChange={(e) => handleUpdateTabCustomization(tab.id, currentName, e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-250 rounded-lg text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="layout-dashboard">📊 ダッシュボード (layout-dashboard)</option>
                        <option value="users">👥 内職担当者 (users)</option>
                        <option value="briefcase">💼 作業マスタ (briefcase)</option>
                        <option value="calendar-clock">🕒 進捗管理 (calendar-clock)</option>
                        <option value="credit-card">💳 お支払い (credit-card)</option>
                        <option value="megaphone">📣 お知らせ (megaphone)</option>
                        <option value="settings">⚙️ 設定 (settings)</option>
                        <option value="terminal">💻 開発者 (terminal)</option>
                        <option value="heart">❤️ ハート (heart)</option>
                        <option value="award">🏆 実績 (award)</option>
                        <option value="zap">⚡ スピード (zap)</option>
                        <option value="check-circle">✅ 完了 (check-circle)</option>
                        <option value="layers">🥞 レイヤー (layers)</option>
                        <option value="sparkles">✨ 輝き (sparkles)</option>
                        <option value="help-circle">❓ ヘルプ (help-circle)</option>
                        <option value="info">ℹ️ インフォ (info)</option>
                        <option value="file-text">📝 書類 (file-text)</option>
                        <option value="sliders-horizontal">🎛️ 詳細設定 (sliders-horizontal)</option>
                        <option value="bell">🔔 お知らせベル (bell)</option>
                        <option value="book-open">📖 マニュアル本 (book-open)</option>
                        <option value="clipboard-list">📋 指示リスト (clipboard-list)</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security & Copy Protection Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldAlert className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">コピーガード・システムライセンス保護設定</h3>
          </div>
          <p className="text-[11px] text-slate-450 font-medium">
            本ソフトウェアの不正複製、無断転載、および別の環境（ドメイン）への無断コピー稼働を防止するための統合コピーガード設定です。
          </p>

          <div className="space-y-4 pt-1">
            {/* Domain Lock Setting */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                稼働を許可するドメイン制限 (ドメインロック)
              </label>
              <input
                type="text"
                value={settings.securityDomainLock || ''}
                onChange={(e) => updateSettingField('securityDomainLock', e.target.value)}
                placeholder="例: localhost, example.com, my-app.run.app"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-850 font-medium font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-[9px] text-slate-400 mt-1">
                指定したドメイン以外でシステムが開かれた場合、自動的に警告付きのロック画面が表示されアクセスが遮断されます。空欄にするとドメイン制限が無効になります。（複数ある場合はカンマ区切りで指定）
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Copy prevention toggle */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={!!settings.securityBlockRightClick}
                  onChange={(e) => updateSettingField('securityBlockRightClick', e.target.checked)}
                  className="mt-0.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <div>
                  <span className="block text-[11px] font-bold text-slate-700">コピー＆右クリック禁止</span>
                  <span className="block text-[9px] text-slate-400 leading-normal mt-0.5">右クリックやテキスト選択、コピーを完全ブロック。</span>
                </div>
              </label>

              {/* DevTools block toggle */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={!!settings.securityBlockDevTools}
                  onChange={(e) => updateSettingField('securityBlockDevTools', e.target.checked)}
                  className="mt-0.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <div>
                  <span className="block text-[11px] font-bold text-slate-700">開発者ツールのブロック</span>
                  <span className="block text-[9px] text-slate-400 leading-normal mt-0.5">F12やショートカットによる解析・コード盗用を抑制。</span>
                </div>
              </label>

              {/* Secure backup toggle */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={!!settings.securityEncryptBackup}
                  onChange={(e) => updateSettingField('securityEncryptBackup', e.target.checked)}
                  className="mt-0.5 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <div>
                  <span className="block text-[11px] font-bold text-slate-700">暗号化バックアップ</span>
                  <span className="block text-[9px] text-slate-400 leading-normal mt-0.5">エクスポートするJSONを暗号化し、他所での無断インポートを防御。</span>
                </div>
              </label>
            </div>

            {/* Security password settings */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  セキュリティ復元・バイパス用パスワード
                </label>
                <input
                  type="text"
                  value={settings.securityBackupPassword || ''}
                  onChange={(e) => updateSettingField('securityBackupPassword', e.target.value)}
                  placeholder="homeworkers-secure"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="text-[10px] text-slate-400 font-medium leading-relaxed flex flex-col justify-center">
                <p className="font-bold text-slate-500">💡 このパスワードの役割：</p>
                <p>1. ドメインロック時に保護画面をバイパスしてログインするための管理者キー</p>
                <p>2. 暗号化バックアップ（.enc.json）をエクスポート/インポートする際の暗号鍵</p>
              </div>
            </div>

          </div>
        </div>

        {/* Worker Limit & Subscription Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldAlert className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">内職担当者登録の上限数制限設定（サブスク形式）</h3>
          </div>
          <p className="text-[11px] text-slate-450 font-medium">
            契約プランの形態に合わせて、システム上で登録可能な内職担当者の最大人数を設定・制限します。上限を超えて新規登録しようとすると、美しいプラン変更アラートが表示されます。
          </p>

          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setLimitInputType('fixed');
                  updateSettingField('workerLimit', 5);
                }}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  limitInputType === 'fixed'
                    ? 'border-indigo-500 bg-indigo-50/10'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center">
                  {limitInputType === 'fixed' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-700">プラン別プリセット</span>
                  <span className="block text-[9px] text-slate-400">標準サブスク契約制限</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLimitInputType('custom');
                  updateSettingField('workerLimit', customLimit);
                }}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  limitInputType === 'custom'
                    ? 'border-indigo-500 bg-indigo-50/10'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full border border-slate-300 flex items-center justify-center">
                  {limitInputType === 'custom' && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-700">カスタム制限</span>
                  <span className="block text-[9px] text-slate-400">自由な制限数を設定</span>
                </div>
              </button>
            </div>

            {limitInputType === 'fixed' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 5, label: 'ライトプラン', desc: '上限5名' },
                  { value: 15, label: 'スタンダード', desc: '上限15名' },
                  { value: 30, label: 'プロプラン', desc: '上限30名' },
                  { value: 99999, label: 'エンタープライズ', desc: '無制限' },
                ].map((plan) => (
                  <button
                    key={plan.value}
                    type="button"
                    onClick={() => updateSettingField('workerLimit', plan.value)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      settings.workerLimit === plan.value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-black'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] font-black">{plan.label}</span>
                    <span className="text-[9px] font-medium opacity-80 mt-0.5">{plan.desc}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex-1">
                  <label className="block text-[9px] font-bold text-slate-500 mb-1">上限内職担当者数</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={99999}
                      value={customLimit}
                      onChange={(e) => setCustomLimit(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 font-bold font-mono"
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-bold text-slate-400">名</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettingField('workerLimit', customLimit)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg cursor-pointer h-8"
                >
                  適用する
                </button>
              </div>
            )}

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[10px] text-amber-800 font-semibold space-y-1">
              <div className="flex gap-1.5 items-center font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-650 shrink-0" />
                <span>現在の利用状況・制限チェック</span>
              </div>
              <p className="font-medium">
                現在登録されている内職者：<span className="font-mono font-bold text-slate-900">{stats.workersCount}名</span> /
                制限上限数：<span className="font-mono font-bold text-slate-900">
                  {settings.workerLimit === 99999 ? '無制限' : `${settings.workerLimit}名`}
                </span>
              </p>
              {settings.workerLimit !== 99999 && stats.workersCount >= settings.workerLimit && (
                <p className="text-rose-700 font-bold mt-1">
                  ⚠️ 注意：登録数が上限に達しているため、新しい内職担当者は追加できません。
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Database Stats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-500" />
              <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">現在のデータベース統計</h3>
            </div>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">クラウド同期中</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">内職担当者数</span>
              <span className="text-lg font-black text-slate-800 font-mono">{stats.workersCount} 名</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">登録作業マスタ</span>
              <span className="text-lg font-black text-slate-800 font-mono">{stats.jobsCount} 件</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">総進捗・作業記録</span>
              <span className="text-lg font-black text-slate-800 font-mono">{stats.logsCount} 件</span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 col-span-2 sm:col-span-3">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">記録されている総作業金額</span>
              <span className="text-lg font-black text-indigo-600 font-mono">¥ {stats.totalYen.toLocaleString()} 円</span>
            </div>
          </div>
        </div>

        {/* Data Maintenance, Import & Export */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Settings className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black text-slate-800 tracking-wide uppercase">バックアップとシステム保守</h3>
          </div>
          <p className="text-[11px] text-slate-450 font-medium">
            全データ（内職者、作業、実績、認証情報）の保存と復元を行います。PC移行やExcel保存に有効です。
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {/* Backup export */}
            <button
              onClick={handleExportBackup}
              className="flex-1 inline-flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              データをエクスポート
            </button>

            {/* Restore import */}
            <label className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-4 rounded-xl cursor-pointer text-center">
              <Upload className="w-3.5 h-3.5" />
              データをインポート
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>

          <div className="pt-3 border-t border-slate-100">
            {showResetConfirm ? (
              <div className="p-4 bg-rose-50 border border-rose-150 rounded-xl space-y-3">
                <div className="flex gap-2 items-start text-xs text-rose-800 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    本当に全データを初期化しますか？この操作を実行すると、登録した内職者情報、作業マスタ、すべての進捗実績記録が即座に完全に削除され、元に戻せません。
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleFactoryReset}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-xl cursor-pointer"
                  >
                    はい、初期化を実行
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[10px] rounded-xl cursor-pointer"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-bold text-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                システムの工場出荷時初期化（データ全削除）
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

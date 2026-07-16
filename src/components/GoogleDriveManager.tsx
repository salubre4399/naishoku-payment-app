import React, { useState, useEffect } from 'react';
import { 
  initAuth, 
  googleSignIn, 
  logoutGoogle 
} from '../lib/firebaseAuth';
import { 
  initializeAppFolders, 
  uploadFileToDrive, 
  listFilesInFolder, 
  downloadFileContent, 
  deleteFileFromDrive,
  GoogleDriveFile 
} from '../lib/googleDrive';
import { 
  Cloud, 
  CloudOff, 
  CloudLightning, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  FolderOpen,
  Info,
  User as UserIcon,
  FileCode
} from 'lucide-react';
import { User } from 'firebase/auth';

interface GoogleDriveManagerProps {
  onDataReset?: () => void;
}

export default function GoogleDriveManager({ onDataReset }: GoogleDriveManagerProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backups, setBackups] = useState<GoogleDriveFile[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [folders, setFolders] = useState<{
    mainFolderId: string;
    backupsFolderId: string;
    statementsFolderId: string;
    csvFolderId: string;
  } | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, accessToken) => {
        setUser(firebaseUser);
        setToken(accessToken);
        await loadDriveBackups(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setBackups([]);
        setFolders(null);
      }
    );
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const triggerStatus = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(prev => prev?.text === text ? null : prev);
    }, 4500);
  };

  const loadDriveBackups = async (accessToken: string) => {
    setIsLoadingBackups(true);
    try {
      const appFolders = await initializeAppFolders(accessToken);
      setFolders(appFolders);
      const files = await listFilesInFolder(accessToken, appFolders.backupsFolderId);
      setBackups(files);
    } catch (err: any) {
      console.error(err);
      triggerStatus('error', `バックアップ一覧の取得に失敗しました: ${err.message}`);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        triggerStatus('success', 'Google Driveに正常に接続されました！');
        await loadDriveBackups(result.accessToken);
      }
    } catch (err: any) {
      triggerStatus('error', `接続に失敗しました: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (confirm('Google Driveとの接続を切断しますか？\n保存されているバックアップデータはGoogle Drive上に維持されます。')) {
      try {
        await logoutGoogle();
        setUser(null);
        setToken(null);
        setBackups([]);
        setFolders(null);
        triggerStatus('info', 'Google Driveとの接続を切断しました。');
      } catch (err: any) {
        triggerStatus('error', `切断エラー: ${err.message}`);
      }
    }
  };

  const handleCreateBackup = async () => {
    if (!token || !folders) {
      triggerStatus('error', 'Google Driveに接続されていません。');
      return;
    }
    setIsBackingUp(true);
    setStatusMessage(null);
    try {
      // Collect all local storage keys related to the app
      const keys = [
        'naishoku_workers',
        'naishoku_jobs',
        'naishoku_work_logs',
        'naishoku_payments',
        'naishoku_settings',
        'naishoku_payment_config',
        'homeworkers_credentials_main',
        'homeworkers_credentials_dev'
      ];
      
      const backupData: Record<string, string | null> = {};
      keys.forEach(k => {
        backupData[k] = localStorage.getItem(k);
      });

      const jsonString = JSON.stringify({
        version: '2.5',
        timestamp: new Date().toISOString(),
        data: backupData
      }, null, 2);

      const timestampStr = new Date().toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/[\/\s:]/g, '-');
      
      const filename = `naishoku_system_backup_${timestampStr}.json`;

      await uploadFileToDrive(token, filename, 'application/json', jsonString, folders.backupsFolderId);
      triggerStatus('success', 'Google Driveへのバックアップ保存が完了しました！');
      await loadDriveBackups(token);
    } catch (err: any) {
      triggerStatus('error', `バックアップ作成に失敗しました: ${err.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleExportToHtml = async () => {
    if (!token || !folders) {
      triggerStatus('error', 'Google Driveに接続されていません。');
      return;
    }
    setIsBackingUp(true);
    setStatusMessage(null);
    try {
      const rawWorkers = localStorage.getItem('naishoku_workers') || '[]';
      const rawJobs = localStorage.getItem('naishoku_jobs') || '[]';
      const rawLogs = localStorage.getItem('naishoku_work_logs') || '[]';
      const rawPayments = localStorage.getItem('naishoku_payments') || '[]';
      const rawSettings = localStorage.getItem('naishoku_settings') || '{}';

      const workers = JSON.parse(rawWorkers);
      const jobs = JSON.parse(rawJobs);
      const logs = JSON.parse(rawLogs);
      const payments = JSON.parse(rawPayments);
      const settings = JSON.parse(rawSettings);

      const timestampStr = new Date().toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/[\/\s:]/g, '-');

      const companyName = settings.companyName || '内職報酬管理システム';

      // Build rows for workers
      const workersRows = workers.map((w: any) => `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
          <td class="p-4 text-xs font-black text-slate-800">${w.name || '未登録'}</td>
          <td class="p-4 text-[10px] font-mono text-slate-500">${w.phone || '未登録'}</td>
          <td class="p-4 text-[10px] font-mono text-slate-500">${w.email || '未登録'}</td>
          <td class="p-4 text-xs font-semibold text-slate-600">${w.bankName ? `${w.bankName} (${w.bankBranch || ''})` : '未登録'}</td>
          <td class="p-4 text-[10px] font-mono text-slate-500">${w.bankAccountNumber || '未登録'}</td>
          <td class="p-4 text-xs font-bold text-slate-700">${w.bankAccountHolder || '未登録'}</td>
        </tr>
      `).join('');

      // Build rows for jobs
      const jobsRows = jobs.map((j: any) => `
        <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
          <td class="p-4 text-xs font-black text-slate-800">${j.name || '未設定'}</td>
          <td class="p-4 text-xs font-mono font-bold text-indigo-600">¥${(j.unitPrice || 0).toLocaleString()}</td>
          <td class="p-4 text-xs font-semibold text-slate-600">${j.description || '説明なし'}</td>
        </tr>
      `).join('');

      // Build rows for recent logs
      const logsRows = logs.slice(0, 100).map((l: any) => {
        const workerName = workers.find((w: any) => w.id === l.workerId)?.name || '不明な内職者';
        const jobName = jobs.find((j: any) => j.id === l.jobId)?.name || '不明な作業';
        const okQty = l.okQuantity || 0;
        const ngQty = l.ngQuantity || 0;
        const total = l.quantity || (okQty + ngQty);
        return `
          <tr class="hover:bg-slate-50 transition-colors border-b border-slate-100">
            <td class="p-4 text-[10px] font-mono text-slate-500">${l.date || '未登録'}</td>
            <td class="p-4 text-xs font-black text-slate-800">${workerName}</td>
            <td class="p-4 text-xs font-semibold text-slate-700">${jobName}</td>
            <td class="p-4 text-xs font-mono font-bold text-slate-800">${total.toLocaleString()}</td>
            <td class="p-4 text-xs font-mono font-bold text-emerald-600">${okQty.toLocaleString()}</td>
            <td class="p-4 text-xs font-mono font-bold text-rose-600">${ngQty.toLocaleString()}</td>
            <td class="p-4 text-[11px]">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                l.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }">${l.status === 'paid' ? '精算済' : '未精算'}</span>
            </td>
          </tr>
        `;
      }).join('');

      const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${companyName} - 内職報酬管理システム データ報告書</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Noto+Sans+JP:wght@400;500;700;900&display=swap');
    body {
      font-family: 'Inter', 'Noto Sans JP', sans-serif;
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-850 min-h-screen py-8 px-4 sm:px-6 lg:px-8">
  <div class="max-w-6xl mx-auto space-y-8">
    
    <!-- Title Section -->
    <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div class="space-y-1.5">
        <div class="flex items-center gap-2">
          <span class="inline-block w-3 h-3 rounded-full bg-indigo-600 animate-pulse"></span>
          <span class="text-[10px] font-black text-indigo-600 tracking-widest uppercase">GOOGLE DRIVE EXPORT REPORT</span>
        </div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">\${companyName}</h1>
        <p class="text-xs text-slate-450 font-bold">内職報酬管理システムから自動出力された統合データレポートです。</p>
      </div>
      <div class="bg-slate-50 border border-slate-150 p-4 rounded-2xl text-right md:min-w-[200px]">
        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">エクスポート日時</p>
        <p class="text-sm font-mono font-black text-slate-800 mt-1">\${new Date().toLocaleString('ja-JP')}</p>
        <p class="text-[9px] text-slate-400 font-bold mt-1">Version 2.5 • HTML形式</p>
      </div>
    </div>

    <!-- Quick Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs">
        <p class="text-[10px] text-slate-400 font-black uppercase tracking-wider">登録内職者数</p>
        <p class="text-2xl font-black text-slate-800 mt-1.5">\${workers.length} <span class="text-xs font-semibold text-slate-400">名</span></p>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs">
        <p class="text-[10px] text-slate-400 font-black uppercase tracking-wider">登録作業数</p>
        <p class="text-2xl font-black text-indigo-600 mt-1.5">\${jobs.length} <span class="text-xs font-semibold text-slate-400">件</span></p>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs">
        <p class="text-[10px] text-slate-400 font-black uppercase tracking-wider">総実績ログ件数</p>
        <p class="text-2xl font-black text-emerald-600 mt-1.5">\${logs.length} <span class="text-xs font-semibold text-slate-400">件</span></p>
      </div>
      <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-2xs">
        <p class="text-[10px] text-slate-400 font-black uppercase tracking-wider">直近精算レコード</p>
        <p class="text-2xl font-black text-slate-800 mt-1.5">\${payments.length} <span class="text-xs font-semibold text-slate-400">件</span></p>
      </div>
    </div>

    <!-- Workers Section -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
      <div class="p-6 border-b border-slate-150 bg-slate-25/50">
        <h2 class="text-sm font-black text-slate-800">1. 内職者名簿・お振込口座一覧</h2>
        <p class="text-[10px] text-slate-400 font-bold mt-0.5">登録されているすべての内職者情報と支払用口座情報です。</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-wider border-b border-slate-150">
              <th class="p-4">氏名</th>
              <th class="p-4">電話番号</th>
              <th class="p-4">メールアドレス</th>
              <th class="p-4">金融機関・支店</th>
              <th class="p-4">口座番号</th>
              <th class="p-4">口座名義</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            \${workersRows || '<tr><td colspan="6" class="p-8 text-center text-xs font-bold text-slate-400">内職者が登録されていません。</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Jobs Section -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
      <div class="p-6 border-b border-slate-150 bg-slate-25/50">
        <h2 class="text-sm font-black text-slate-800">2. 登録作業・単価定義一覧</h2>
        <p class="text-[10px] text-slate-400 font-bold mt-0.5">内職者向けに割り当てられる内職作業の一覧です。</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-wider border-b border-slate-150">
              <th class="p-4">作業・パーツ名</th>
              <th class="p-4">単価 (税込)</th>
              <th class="p-4">作業説明</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            \${jobsRows || '<tr><td colspan="3" class="p-8 text-center text-xs font-bold text-slate-400">作業が登録されていません。</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Logs Section -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
      <div class="p-6 border-b border-slate-150 bg-slate-25/50">
        <h2 class="text-sm font-black text-slate-800">3. 作業実績ログ (直近100件)</h2>
        <p class="text-[10px] text-slate-400 font-bold mt-0.5">内職者が完了報告した検品・作業数量の履歴一覧です。</p>
      </div>
      <div class="overflow-x-auto font-sans">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 text-[10px] text-slate-400 font-black uppercase tracking-wider border-b border-slate-150">
              <th class="p-4">作業日</th>
              <th class="p-4">内職者</th>
              <th class="p-4">作業項目</th>
              <th class="p-4">総数</th>
              <th class="p-4 text-emerald-600">良品数</th>
              <th class="p-4 text-rose-600">NG数</th>
              <th class="p-4">ステータス</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            \${logsRows || '<tr><td colspan="7" class="p-8 text-center text-xs font-bold text-slate-400">実績ログがありません。</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Footer Disclaimer -->
    <div class="text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider py-4">
      © \${new Date().getFullYear()} \${companyName} • Generated via Naishoku Pay Manager
    </div>

  </div>
</body>
</html>`;

      const filename = `naishoku_system_report_\${timestampStr}.html`;
      const targetFolderId = folders.csvFolderId || folders.mainFolderId;
      await uploadFileToDrive(token, filename, 'text/html', htmlContent, targetFolderId);
      
      triggerStatus('success', `システムデータ（HTML形式のビジュアル報告書）をGoogle Driveの「CSVレポート」フォルダに保存しました！ (\${filename})`);
      await loadDriveBackups(token);
    } catch (err: any) {
      triggerStatus('error', `HTMLエクスポートに失敗しました: \${err.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreBackup = async (fileId: string, filename: string) => {
    if (!token) return;
    
    const confirmed = confirm(
      `【警告：データ復元】\nバックアップファイル「${filename}」からデータを復元しますか？\n\n現在ブラウザにあるすべてのデータ（内職者、作業、進捗、精算など）が上書きされ、上書き前のデータは失われます。この操作は取り消せません。`
    );
    if (!confirmed) return;

    setIsRestoring(true);
    setStatusMessage(null);
    try {
      const rawContent = await downloadFileContent(token, fileId);
      const parsed = JSON.parse(rawContent);

      if (!parsed || !parsed.data) {
        throw new Error('バックアップファイルのフォーマットが無効です（dataフィールドが見つかりません）。');
      }

      // Restore each local storage item
      Object.entries(parsed.data).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          localStorage.setItem(key, value);
        } else {
          localStorage.removeItem(key);
        }
      });

      triggerStatus('success', 'Google Driveからデータを正常に復元しました！自動的にブラウザを再読み込みします...');
      
      if (onDataReset) {
        onDataReset();
      }

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      triggerStatus('error', `復元に失敗しました: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteBackup = async (fileId: string, filename: string) => {
    if (!token) return;
    const confirmed = confirm(`【確認】\nGoogle Drive上のバックアップ「${filename}」を完全に削除してもよろしいですか？`);
    if (!confirmed) return;

    try {
      await deleteFileFromDrive(token, fileId);
      triggerStatus('success', 'バックアップファイルをGoogle Driveから削除しました。');
      await loadDriveBackups(token);
    } catch (err: any) {
      triggerStatus('error', `削除に失敗しました: ${err.message}`);
    }
  };

  const handleRefresh = async () => {
    if (!token) return;
    await loadDriveBackups(token);
    triggerStatus('info', 'バックアップ一覧を更新しました。');
  };

  const formatSize = (bytesStr?: string): string => {
    if (!bytesStr) return '不明';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return '不明';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-2xs">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-850">Google Drive クラウド連携・同期</h3>
            <p className="text-[10px] text-slate-450 font-bold mt-0.5">システムデータをGoogle Driveへ安全に保管・復元、CSV/明細の直接エクスポートが行えます。</p>
          </div>
        </div>

        {user ? (
          <button
            onClick={handleDisconnect}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 rounded-xl text-xs font-bold text-slate-600 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CloudOff className="w-3.5 h-3.5" />
            切断する
          </button>
        ) : (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isConnecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CloudLightning className="w-3.5 h-3.5" />
            )}
            Google Driveに接続
          </button>
        )}
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-2xl text-xs font-bold border flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : statusMessage.type === 'error' 
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />}
          {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />}
          {statusMessage.type === 'info' && <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />}
          <div>
            <span>{statusMessage.text}</span>
          </div>
        </div>
      )}

      {user ? (
        <div className="space-y-6">
          {/* Active Connection Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-150 rounded-2xl">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-10 h-10 rounded-full border border-white shadow-xs" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">接続中のGoogleアカウント</p>
                <p className="text-xs font-black text-slate-800">{user.displayName || 'Google ユーザー'}</p>
                <p className="text-[9px] text-slate-400 font-mono">{user.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                onClick={handleExportToHtml}
                disabled={isBackingUp}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-750 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBackingUp ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileCode className="w-3.5 h-3.5" />
                )}
                HTML形式で保存
              </button>
              <button
                onClick={handleCreateBackup}
                disabled={isBackingUp}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isBackingUp ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                JSONバックアップ
              </button>
            </div>
          </div>

          {/* Backup Folder structure overview */}
          <div className="text-[10px] text-slate-500 font-medium flex items-center gap-2 pl-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <FolderOpen className="w-4 h-4 text-amber-500" />
            <span>Google Drive上に <b>「内職報酬管理システム_GoogleDrive」</b> フォルダを作成し、バックアップ、明細書、CSVレポートを分けて整理・保存しています。</span>
          </div>

          {/* Drive Backups List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center pl-1">
              <h4 className="text-xs font-black text-slate-700">クラウド上のバックアップ一覧 ({backups.length}件)</h4>
              <button
                onClick={handleRefresh}
                disabled={isLoadingBackups}
                className="p-1.5 text-slate-450 hover:text-slate-850 hover:bg-slate-100 rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                同期・更新
              </button>
            </div>

            {isLoadingBackups ? (
              <div className="py-8 text-center flex flex-col items-center justify-center text-xs text-slate-400 font-bold gap-2">
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                <span>Google Driveからバックアップ履歴を読み込んでいます...</span>
              </div>
            ) : backups.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-25/50">
                <Cloud className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-450">バックアップがまだありません</p>
                <p className="text-[10px] text-slate-400 mt-1">「今すぐバックアップを作成」ボタンを押して、最初のバックアップを作成してください。</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-150">
                {backups.map(file => (
                  <div key={file.id} className="p-3.5 flex justify-between items-center hover:bg-slate-25/40 transition-colors bg-white">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-slate-800 font-mono truncate max-w-[250px] sm:max-w-md">{file.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                        <span>作成日: {file.createdTime ? new Date(file.createdTime).toLocaleString('ja-JP') : '不明'}</span>
                        <span>•</span>
                        <span>サイズ: {formatSize(file.size)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreBackup(file.id, file.name)}
                        disabled={isRestoring}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="このバックアップから復元します"
                      >
                        <Download className="w-3 h-3" />
                        復元
                      </button>
                      <button
                        onClick={() => handleDeleteBackup(file.id, file.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Google Driveからこのバックアップを削除します"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-25 border border-slate-150 p-6 rounded-2xl text-center space-y-4">
          <Cloud className="w-12 h-12 text-slate-350 mx-auto" />
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="text-xs font-black text-slate-800">Google Drive クラウド同期が無効です</h4>
            <p className="text-[11px] text-slate-450 font-semibold leading-relaxed">
              Google Driveと連携することで、LocalStorageの自動/手動バックアップ、支払い明細書のGoogle Drive自動保存、CSVの一括アップロードなどを実現します。
            </p>
          </div>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            {isConnecting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CloudLightning className="w-3.5 h-3.5 animate-pulse" />
            )}
            Googleアカウントでサインインして同期を開始
          </button>
        </div>
      )}
    </div>
  );
}

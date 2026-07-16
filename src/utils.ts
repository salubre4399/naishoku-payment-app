/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Worker, Job, WorkLog, MonthlyPayment, AppSettings } from './types';
import { INITIAL_WORKERS, INITIAL_JOBS, INITIAL_WORK_LOGS, INITIAL_PAYMENTS } from './mockData';

// Storage keys
const KEYS = {
  WORKERS: 'naishoku_workers',
  JOBS: 'naishoku_jobs',
  WORK_LOGS: 'naishoku_work_logs',
  PAYMENTS: 'naishoku_payments',
  SETTINGS: 'naishoku_settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  hiddenTabs: [],
  workerLimit: 99999,
  appName: '内職報酬管理システム',
  appLogo: 'lock',
  accentColor: 'indigo',
  tabCustomizations: {
    'dashboard': { name: 'ダッシュボード', icon: 'layout-dashboard' },
    'workers': { name: '内職担当者', icon: 'users' },
    'jobs': { name: '作業マスタ', icon: 'briefcase' },
    'logs': { name: '作業・進捗管理', icon: 'calendar-clock' },
    'payments': { name: '支払い・明細発行', icon: 'credit-card' },
    'bulletin': { name: 'お知らせ・連絡事項', icon: 'megaphone' },
    'contractor-settings': { name: '設定', icon: 'settings' },
    'developer': { name: 'developer', icon: 'terminal' }
  },
  securityDomainLock: '',
  securityBlockRightClick: false,
  securityBlockDevTools: false,
  securityEncryptBackup: false,
  securityBackupPassword: 'homeworkers-secure'
};

export const loadSettings = (): AppSettings => {
  const data = localStorage.getItem(KEYS.SETTINGS);
  if (!data) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  try {
    const parsed = JSON.parse(data);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};

// Local storage loaders & savers
export const loadWorkers = (): Worker[] => {
  const data = localStorage.getItem(KEYS.WORKERS);
  if (!data) {
    localStorage.setItem(KEYS.WORKERS, JSON.stringify(INITIAL_WORKERS));
    return INITIAL_WORKERS;
  }
  return JSON.parse(data);
};

export const saveWorkers = (workers: Worker[]) => {
  localStorage.setItem(KEYS.WORKERS, JSON.stringify(workers));
};

export const loadJobs = (): Job[] => {
  const data = localStorage.getItem(KEYS.JOBS);
  if (!data) {
    localStorage.setItem(KEYS.JOBS, JSON.stringify(INITIAL_JOBS));
    return INITIAL_JOBS;
  }
  return JSON.parse(data);
};

export const saveJobs = (jobs: Job[]) => {
  localStorage.setItem(KEYS.JOBS, JSON.stringify(jobs));
};

export const loadWorkLogs = (): WorkLog[] => {
  const data = localStorage.getItem(KEYS.WORK_LOGS);
  if (!data) {
    localStorage.setItem(KEYS.WORK_LOGS, JSON.stringify(INITIAL_WORK_LOGS));
    return INITIAL_WORK_LOGS;
  }
  return JSON.parse(data);
};

export const saveWorkLogs = (logs: WorkLog[]) => {
  localStorage.setItem(KEYS.WORK_LOGS, JSON.stringify(logs));
};

export const loadPayments = (): MonthlyPayment[] => {
  const data = localStorage.getItem(KEYS.PAYMENTS);
  if (!data) {
    localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
    return INITIAL_PAYMENTS;
  }
  return JSON.parse(data);
};

export const savePayments = (payments: MonthlyPayment[]) => {
  localStorage.setItem(KEYS.PAYMENTS, JSON.stringify(payments));
};

// Formatters
export const formatYen = (num: number): string => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(num);
};

export const formatDateJP = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
};

export const formatMonthJP = (monthStr: string): string => {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  return `${year}年${parseInt(month, 10)}月`;
};

// CSV Export Helper with BOM for proper Excel Japanese encoding
export const exportToCSV = (filename: string, headers: string[], rows: string[][]) => {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(val => {
      // Escape commas and double quotes
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(','))
  ].join('\n');

  // UTF-8 with BOM to open correctly in Excel
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

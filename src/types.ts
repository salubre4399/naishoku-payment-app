/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Worker {
  id: string;
  name: string;
  phone: string;
  email: string;
  bankName: string;
  bankBranch: string;
  bankAccountType: '普通' | '当座';
  bankAccountNumber: string;
  bankAccountHolder: string;
  isActive: boolean;
  createdAt: string;
  allowedJobIds?: string[];
}

export interface Job {
  id: string;
  name: string;
  unitPrice: number; // Single item price in Yen
  description: string;
  isActive: boolean;
  createdAt: string;
  department?: string; // 大カテゴリー（依頼先の部署・場所。例: 事務所、製造ライン）
  category?: string;   // 中カテゴリー（作業のグループ分け）
}

export type WorkStatus = 'unstarted' | 'ongoing' | 'completed';

export interface WorkLog {
  id: string;
  workerId: string;
  jobId: string;
  date: string; // YYYY-MM-DD (Groups monthly payments - corresponds to deliveredDate when completed)
  requestDate: string; // 依頼日
  handedOverDate?: string; // 商品を渡した日 (registered when worker picks up)
  dueDate?: string; // 納品予定日
  deliveredDate?: string; // 実際に納品された日 (registered when completed)
  quantity: number;
  ngQuantity?: number; // Defective / NG count
  status: WorkStatus;
  notes: string;
  isPaid: boolean;
  paymentId: string | null; // Associated MonthlyPayment id
  createdAt: string;
}

export type PaymentStatus = 'unpaid' | 'approved' | 'paid';

export interface MonthlyPayment {
  id: string; // workerId-YYYY-MM
  workerId: string;
  month: string; // YYYY-MM
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paymentDate: string | null;
  workLogIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TabCustomization {
  name: string;
  icon: string;
}

export interface AppSettings {
  hiddenTabs: string[];
  workerLimit: number; // e.g. 5, 10, 50, 99999
  appName: string;
  appLogo: 'lock' | 'briefcase' | 'credit-card' | 'settings' | 'users' | 'layout-dashboard' | 'heart' | 'award' | 'zap' | 'check-circle' | 'workflow' | 'terminal';
  accentColor: 'indigo' | 'blue' | 'emerald' | 'rose' | 'amber' | 'slate' | 'violet';
  customLogoUrl?: string;
  companyStampUrl?: string;
  showCompanyStampOnPrint?: boolean;
  showNgOnStatement?: boolean; // 明細書にNG数（不良数）を表示するか（既定: 非表示）
  tabCustomizations?: Record<string, TabCustomization>;
  securityDomainLock?: string;
  securityBlockRightClick?: boolean;
  securityBlockDevTools?: boolean;
  securityEncryptBackup?: boolean;
  securityBackupPassword?: string;
}

export interface PaymentConfig {
  cutoffDay: string;
  transferDayType: 'next-10' | 'next-15' | 'next-20' | 'next-25' | 'next-end' | 'current-end' | 'custom';
  customTransferDayText: string;
  feeBurden: 'company' | 'worker-110' | 'worker-220' | 'worker-actual';
  senderBankName: string;
  autoPaymentDateType: 'today' | 'scheduled' | 'custom';
  customAutoPaymentDate: string;
}


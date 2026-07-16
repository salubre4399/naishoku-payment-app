/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Worker, Job, WorkLog, MonthlyPayment } from './types';

export const INITIAL_WORKERS: Worker[] = [
  {
    id: 'worker-1',
    name: '佐藤 美紀',
    phone: '090-1234-5678',
    email: 'miki.sato@example.com',
    bankName: 'みずほ銀行',
    bankBranch: '渋谷中央支店',
    bankAccountType: '普通',
    bankAccountNumber: '1234567',
    bankAccountHolder: 'サトウ ミキ',
    isActive: true,
    createdAt: '2026-05-10T10:00:00Z',
  },
  {
    id: 'worker-2',
    name: '鈴木 健一',
    phone: '080-9876-5432',
    email: 'kenichi.suzuki@example.com',
    bankName: '三菱UFJ銀行',
    bankBranch: '新宿新都心支店',
    bankAccountType: '普通',
    bankAccountNumber: '7654321',
    bankAccountHolder: 'スズキ ケンイチ',
    isActive: true,
    createdAt: '2026-05-15T11:30:00Z',
  },
  {
    id: 'worker-3',
    name: '高橋 由美子',
    phone: '070-4567-8901',
    email: 'yumiko.takahashi@example.com',
    bankName: '三井住友銀行',
    bankBranch: '梅田支店',
    bankAccountType: '普通',
    bankAccountNumber: '9876543',
    bankAccountHolder: 'タカハシ ユミコ',
    isActive: true,
    createdAt: '2026-05-20T14:15:00Z',
  },
  {
    id: 'worker-4',
    name: '渡辺 直美',
    phone: '090-8765-4321',
    email: 'naomi.watanabe@example.com',
    bankName: 'ゆうちょ銀行',
    bankBranch: '〇一八支店',
    bankAccountType: '普通',
    bankAccountNumber: '1029384',
    bankAccountHolder: 'ワタナベ ナオミ',
    isActive: false,
    createdAt: '2026-05-22T09:45:00Z',
  }
];

export const INITIAL_JOBS: Job[] = [
  {
    id: 'job-1',
    name: 'DMラベル・シール貼り',
    unitPrice: 4, // 4 JPY per piece
    description: 'DM封筒に宛名ラベルと案内シールをズレなく貼る作業。',
    isActive: true,
    createdAt: '2026-05-01T09:00:00Z',
  },
  {
    id: 'job-2',
    name: '化粧品サンプル袋詰め・梱包',
    unitPrice: 12, // 12 JPY per piece
    description: 'サンプルの台紙と化粧水ミニボトルをOPP袋に入れ、テープ留め。',
    isActive: true,
    createdAt: '2026-05-01T09:00:00Z',
  },
  {
    id: 'job-3',
    name: 'アクセサリー・キーホルダー組立',
    unitPrice: 45, // 45 JPY per piece
    description: 'ペンチ等の工具を使い、金属パーツとチャームを連結する作業。',
    isActive: true,
    createdAt: '2026-05-05T10:00:00Z',
  },
  {
    id: 'job-4',
    name: 'ギフトボックス折り組み立て',
    unitPrice: 18, // 18 JPY per piece
    description: '平らな台紙を折り目に沿って組み立て、仕切りをセットする作業。',
    isActive: true,
    createdAt: '2026-05-05T10:00:00Z',
  }
];

// Seed Work Logs across June and July 2026
export const INITIAL_WORK_LOGS: WorkLog[] = [
  // --- JUNE 2026 (Mostly completed and paid/approved) ---
  {
    id: 'log-1',
    workerId: 'worker-1',
    jobId: 'job-1',
    date: '2026-06-05',
    requestDate: '2026-06-01',
    handedOverDate: '2026-06-02',
    dueDate: '2026-06-05',
    deliveredDate: '2026-06-05',
    quantity: 1500, // 1500 * 4 = 6,000 JPY
    status: 'completed',
    notes: 'シワなく綺麗に貼られています。',
    isPaid: true,
    paymentId: 'worker-1-2026-06',
    createdAt: '2026-06-01T10:00:00Z',
  },
  {
    id: 'log-2',
    workerId: 'worker-1',
    jobId: 'job-2',
    date: '2026-06-12',
    requestDate: '2026-06-08',
    handedOverDate: '2026-06-08',
    dueDate: '2026-06-12',
    deliveredDate: '2026-06-12',
    quantity: 800, // 800 * 12 = 9,600 JPY
    status: 'completed',
    notes: '丁寧な梱包でした。',
    isPaid: true,
    paymentId: 'worker-1-2026-06',
    createdAt: '2026-06-08T11:00:00Z',
  },
  {
    id: 'log-3',
    workerId: 'worker-2',
    jobId: 'job-2',
    date: '2026-06-10',
    requestDate: '2026-06-04',
    handedOverDate: '2026-06-05',
    dueDate: '2026-06-10',
    deliveredDate: '2026-06-10',
    quantity: 1200, // 1200 * 12 = 14,400 JPY
    status: 'completed',
    notes: '予定通り納品。',
    isPaid: true,
    paymentId: 'worker-2-2026-06',
    createdAt: '2026-06-04T13:00:00Z',
  },
  {
    id: 'log-4',
    workerId: 'worker-2',
    jobId: 'job-3',
    date: '2026-06-20',
    requestDate: '2026-06-15',
    handedOverDate: '2026-06-16',
    dueDate: '2026-06-20',
    deliveredDate: '2026-06-20',
    quantity: 300, // 300 * 45 = 13,500 JPY
    status: 'completed',
    notes: '金具の傷もありません。',
    isPaid: true,
    paymentId: 'worker-2-2026-06',
    createdAt: '2026-06-15T14:00:00Z',
  },
  {
    id: 'log-5',
    workerId: 'worker-3',
    jobId: 'job-4',
    date: '2026-06-18',
    requestDate: '2026-06-12',
    handedOverDate: '2026-06-13',
    dueDate: '2026-06-18',
    deliveredDate: '2026-06-18',
    quantity: 500, // 500 * 18 = 9,000 JPY
    status: 'completed',
    notes: '折れ目の歪み無し。',
    isPaid: true,
    paymentId: 'worker-3-2026-06',
    createdAt: '2026-06-12T15:00:00Z',
  },

  // --- JULY 2026 (Active, some completed but unpaid, some ongoing) ---
  {
    id: 'log-6',
    workerId: 'worker-1',
    jobId: 'job-1',
    date: '2026-07-02',
    requestDate: '2026-06-28',
    handedOverDate: '2026-06-29',
    dueDate: '2026-07-02',
    deliveredDate: '2026-07-02',
    quantity: 2000, // 2000 * 4 = 8,000 JPY
    status: 'completed',
    notes: '完了・検品済。',
    isPaid: false,
    paymentId: null,
    createdAt: '2026-06-28T09:00:00Z',
  },
  {
    id: 'log-7',
    workerId: 'worker-1',
    jobId: 'job-3',
    date: '2026-07-10',
    requestDate: '2026-07-05',
    handedOverDate: '2026-07-06',
    dueDate: '2026-07-10',
    deliveredDate: '2026-07-10',
    quantity: 200, // 200 * 45 = 9,000 JPY
    status: 'completed', // 'inspected' is removed; changed to 'completed'
    notes: '検品完了、一部金具調整を行いました。',
    isPaid: false,
    paymentId: null,
    createdAt: '2026-07-05T10:00:00Z',
  },
  {
    id: 'log-8',
    workerId: 'worker-2',
    jobId: 'job-2',
    date: '2026-07-05',
    requestDate: '2026-07-01',
    handedOverDate: '2026-07-01',
    dueDate: '2026-07-05',
    deliveredDate: '2026-07-05',
    quantity: 1000, // 1000 * 12 = 12,000 JPY
    status: 'completed',
    notes: '検品問題なし。',
    isPaid: false,
    paymentId: null,
    createdAt: '2026-07-01T11:00:00Z',
  },
  {
    id: 'log-9',
    workerId: 'worker-2',
    jobId: 'job-4',
    date: '2026-07-12',
    requestDate: '2026-07-06',
    handedOverDate: '2026-07-07',
    dueDate: '2026-07-12',
    quantity: 600, // 600 * 18 = 10,800 JPY
    status: 'ongoing',
    notes: '作業進捗率 70% との連絡あり。',
    isPaid: false,
    paymentId: null,
    createdAt: '2026-07-06T14:00:00Z',
  },
  {
    id: 'log-10',
    workerId: 'worker-3',
    jobId: 'job-3',
    date: '2026-07-08',
    requestDate: '2026-07-03',
    handedOverDate: '2026-07-04',
    dueDate: '2026-07-08',
    deliveredDate: '2026-07-08',
    quantity: 400, // 400 * 45 = 18,000 JPY
    status: 'completed',
    notes: '仕上げ綺麗です。',
    isPaid: false,
    paymentId: null,
    createdAt: '2026-07-03T16:00:00Z',
  },
  {
    id: 'log-11',
    workerId: 'worker-3',
    jobId: 'job-1',
    date: '2026-07-14',
    requestDate: '2026-07-14',
    quantity: 1000, // 1000 * 4 = 4,000 JPY
    status: 'unstarted',
    notes: '新規資材の依頼登録。',
    isPaid: false,
    paymentId: null,
    createdAt: '2026-07-14T09:00:00Z',
  }
];

export const INITIAL_PAYMENTS: MonthlyPayment[] = [
  {
    id: 'worker-1-2026-06',
    workerId: 'worker-1',
    month: '2026-06',
    totalAmount: 15600, // 6000 + 9600
    paymentStatus: 'paid',
    paymentDate: '2026-07-10',
    workLogIds: ['log-1', 'log-2'],
    createdAt: '2026-06-30T18:00:00Z',
    updatedAt: '2026-07-10T10:00:00Z',
  },
  {
    id: 'worker-2-2026-06',
    workerId: 'worker-2',
    month: '2026-06',
    totalAmount: 27900, // 14400 + 13500
    paymentStatus: 'paid',
    paymentDate: '2026-07-10',
    workLogIds: ['log-3', 'log-4'],
    createdAt: '2026-06-30T18:00:00Z',
    updatedAt: '2026-07-10T10:05:00Z',
  },
  {
    id: 'worker-3-2026-06',
    workerId: 'worker-3',
    month: '2026-06',
    totalAmount: 9000, // 9000
    paymentStatus: 'approved',
    paymentDate: null,
    workLogIds: ['log-5'],
    createdAt: '2026-06-30T18:00:00Z',
    updatedAt: '2026-06-30T18:00:00Z',
  }
];

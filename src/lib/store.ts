/**
 * Firestore データ層。
 * 業務データ（担当者/作業/作業記録/支払い）と設定・お知らせを
 * クラウド(Firestore)で共有・保存する。すべて会社単位の共有データ。
 */
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Worker, Job, WorkLog, MonthlyPayment, AppSettings } from '../types';

// Firestore コレクション名
export const COLLECTIONS = {
  WORKERS: 'workers',
  JOBS: 'jobs',
  WORK_LOGS: 'workLogs',
  PAYMENTS: 'payments',
} as const;

type Unsub = () => void;

/**
 * コレクションをリアルタイム購読し、変化のたびに全件を配列で返す。
 * 返り値は購読解除関数。
 */
export function subscribeCollection<T>(
  collectionName: string,
  onChange: (items: T[]) => void,
  onError?: (e: Error) => void
): Unsub {
  return onSnapshot(
    collection(db, collectionName),
    (snap) => onChange(snap.docs.map((d) => d.data() as T)),
    (err) => onError?.(err)
  );
}

/** id をドキュメントIDとして1件を作成/更新する（全置換）。 */
export async function upsertItem<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<void> {
  await setDoc(doc(db, collectionName, item.id), item as Record<string, unknown>);
}

/** 1件を削除する。 */
export async function deleteItem(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

// ---- 設定（settings/app 単一ドキュメント） ----
const SETTINGS_DOC = doc(db, 'settings', 'app');

export function subscribeSettings(
  onChange: (settings: AppSettings | null) => void,
  onError?: (e: Error) => void
): Unsub {
  return onSnapshot(
    SETTINGS_DOC,
    (snap) => onChange(snap.exists() ? (snap.data() as AppSettings) : null),
    (err) => onError?.(err)
  );
}

export async function saveSettingsToCloud(settings: AppSettings): Promise<void> {
  await setDoc(SETTINGS_DOC, settings as unknown as Record<string, unknown>);
}

// ---- お知らせ本文（meta/bulletin） ----
const BULLETIN_DOC = doc(db, 'meta', 'bulletin');

export function subscribeBulletin(
  onChange: (text: string | null) => void,
  onError?: (e: Error) => void
): Unsub {
  return onSnapshot(
    BULLETIN_DOC,
    (snap) => onChange(snap.exists() ? ((snap.data() as { text?: string }).text ?? '') : null),
    (err) => onError?.(err)
  );
}

export async function saveBulletinToCloud(text: string): Promise<void> {
  await setDoc(BULLETIN_DOC, { text });
}

/**
 * 既存の localStorage データを一括で Firestore に取り込む（移行用・冪等）。
 * 同じ id は上書きされるため複数回実行しても重複しない。
 */
export async function migrateArraysToCloud(data: {
  workers: Worker[];
  jobs: Job[];
  workLogs: WorkLog[];
  payments: MonthlyPayment[];
}): Promise<number> {
  const batch = writeBatch(db);
  let count = 0;
  const push = (name: string, items: { id: string }[]) => {
    for (const item of items) {
      batch.set(doc(db, name, item.id), item as Record<string, unknown>);
      count++;
    }
  };
  push(COLLECTIONS.WORKERS, data.workers);
  push(COLLECTIONS.JOBS, data.jobs);
  push(COLLECTIONS.WORK_LOGS, data.workLogs);
  push(COLLECTIONS.PAYMENTS, data.payments);
  await batch.commit();
  return count;
}

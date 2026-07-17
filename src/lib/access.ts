/**
 * アクセス制御。
 * 許可アカウント一覧と開発者メールは Firestore の config/access ドキュメントにのみ保存し、
 * ソースコード（公開リポジトリ）には一切書かない。
 */
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface AccessConfig {
  /** アプリを利用できるメールアドレス一覧（開発者も含める） */
  members: string[];
  /** 開発者タブ・許可アカウント管理を行えるメールアドレス */
  developerEmail: string;
}

export type Role = 'developer' | 'member' | 'denied';

const ACCESS_DOC = doc(db, 'config', 'access');

const norm = (s: string) => s.trim().toLowerCase();

/** config/access を1回だけ読む（未作成なら null）。 */
export async function fetchAccessConfig(): Promise<AccessConfig | null> {
  const snap = await getDoc(ACCESS_DOC);
  return snap.exists() ? (snap.data() as AccessConfig) : null;
}

/** config/access をリアルタイム購読する。 */
export function subscribeAccessConfig(
  onChange: (config: AccessConfig | null) => void,
  onError?: (e: Error) => void
): () => void {
  return onSnapshot(
    ACCESS_DOC,
    (snap) => onChange(snap.exists() ? (snap.data() as AccessConfig) : null),
    (err) => onError?.(err)
  );
}

/** ログイン中メールの役割を判定する。 */
export function resolveRole(email: string | null | undefined, config: AccessConfig | null): Role {
  if (!email || !config) return 'denied';
  const e = norm(email);
  const members = (config.members || []).map(norm);
  if (!members.includes(e)) return 'denied';
  return norm(config.developerEmail || '') === e ? 'developer' : 'member';
}

/**
 * 許可アカウント設定を保存する（開発者のみ・Firestoreルールで保護）。
 * developerEmail は必ず members に含める。
 */
export async function saveAccessConfig(config: AccessConfig): Promise<void> {
  const developerEmail = norm(config.developerEmail);
  const members = Array.from(
    new Set((config.members || []).map(norm).filter(Boolean).concat(developerEmail))
  );
  await setDoc(ACCESS_DOC, { members, developerEmail });
}

/**
 * Firebase 初期化（アプリ全体で共有する単一インスタンス）。
 * app / auth / db をここから import して使う。
 */
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// ignoreUndefinedProperties: 任意項目（未受取時の受渡日など）が undefined でも
// Firestoreへの書き込みが失敗しないようにする。これがないと作業依頼で
// 「受け取り済み」を未チェックのまま送信した際に undefined フィールドを含む保存が
// 拒否され、「保存に失敗＝通信できない」不具合が発生する。
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export default app;

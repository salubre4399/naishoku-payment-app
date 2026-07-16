export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  size?: string;
}

// Find or create a folder with a specific name and optional parent folder ID
export async function findOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  // 1. Search for existing folder
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }
  
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const err = await searchRes.json();
    throw new Error(`Google Driveフォルダの検索に失敗しました: ${err.error?.message || searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. Folder does not exist, create it
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const body: Record<string, any> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentFolderId) {
    body.parents = [parentFolderId];
  }

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(`Google Driveフォルダの作成に失敗しました: ${err.error?.message || createRes.statusText}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

// Initialize the folder structure: Main folder and subfolders
export async function initializeAppFolders(accessToken: string): Promise<{
  mainFolderId: string;
  backupsFolderId: string;
  statementsFolderId: string;
  csvFolderId: string;
}> {
  const mainFolderId = await findOrCreateFolder(accessToken, '内職報酬管理システム_GoogleDrive');
  const backupsFolderId = await findOrCreateFolder(accessToken, 'バックアップ', mainFolderId);
  const statementsFolderId = await findOrCreateFolder(accessToken, '明細書_PDF・テキスト', mainFolderId);
  const csvFolderId = await findOrCreateFolder(accessToken, 'CSVレポート', mainFolderId);

  return { mainFolderId, backupsFolderId, statementsFolderId, csvFolderId };
}

// Upload/create a file in Google Drive via multipart/related
export async function uploadFileToDrive(
  accessToken: string,
  filename: string,
  mimeType: string,
  content: string,
  parentFolderId?: string
): Promise<GoogleDriveFile> {
  const boundary = '314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: filename,
    mimeType: mimeType,
    parents: parentFolderId ? [parentFolderId] : undefined,
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelimiter;

  const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,size';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Google Driveへのファイル保存に失敗しました: ${err.error?.message || response.statusText}`);
  }

  return response.json();
}

// List files inside a specific parent folder
export async function listFilesInFolder(
  accessToken: string,
  folderId: string,
  mimeTypeFilter?: string
): Promise<GoogleDriveFile[]> {
  let query = `'${folderId}' in parents and trashed = false`;
  if (mimeTypeFilter) {
    query += ` and mimeType = '${mimeTypeFilter}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=createdTime%20desc&fields=files(id,name,mimeType,createdTime,size)`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Google Driveファイル一覧の取得に失敗しました: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.files || [];
}

// Download file content by file ID
export async function downloadFileContent(accessToken: string, fileId: string): Promise<string> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google Driveからのファイルダウンロードに失敗しました: ${response.statusText}`);
  }

  return response.text();
}

// Delete a file in Google Drive (requires user confirmation in UI)
export async function deleteFileFromDrive(accessToken: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Google Driveファイルの削除に失敗しました: ${err.error?.message || response.statusText}`);
  }
}

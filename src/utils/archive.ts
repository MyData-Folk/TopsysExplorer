let dirHandle: FileSystemDirectoryHandle | null = null;

export async function getArchiveHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (dirHandle) return dirHandle;
  try {
    dirHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    return dirHandle;
  } catch {
    return null;
  }
}

export function setArchiveHandle(handle: FileSystemDirectoryHandle | null) {
  dirHandle = handle;
}

export async function saveToArchive(fileName: string, content: string): Promise<boolean> {
  const handle = dirHandle || await getArchiveHandle();
  if (!handle) return false;
  dirHandle = handle;
  try {
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function archiveReport(report: any, folderName: string): Promise<boolean> {
  if (!dirHandle) return false;
  const fileName = `${folderName}_${report.fileName?.replace('.pdf', '') || 'report'}_${new Date().toISOString().split('T')[0]}.json`;
  return saveToArchive(fileName, JSON.stringify(report, null, 2));
}

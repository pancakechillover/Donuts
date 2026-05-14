import React, { useRef, useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useAppStore } from '../lib/store';
import { nowYMD } from '../lib/utils';
import { Upload, Download, Trash2, X } from 'lucide-react';

interface DataModalProps {
  onClose: () => void;
}

export function DataModal({ onClose }: DataModalProps) {
  const { db, updateDb, clearLocalData } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [webdavUrl, setWebdavUrl] = useState(() => localStorage.getItem('syncWebdavUrl') || 'https://dav.jianguoyun.com/dav/');
  const [username, setUsername] = useState(() => localStorage.getItem('syncUser') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('syncPassword') || '');
  const [autoSync, setAutoSync] = useState(() => localStorage.getItem('syncAuto') === 'true');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem('syncWebdavUrl', webdavUrl);
    localStorage.setItem('syncUser', username);
    localStorage.setItem('syncPassword', password);
    localStorage.setItem('syncAuto', autoSync.toString());
  }, [webdavUrl, username, password, autoSync]);

  const handleExport = () => {
    const backupJson = JSON.stringify(db, null, 2);
    const blob = new Blob([backupJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tracker-backup-${nowYMD()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // backup before import
    handleExport();

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        parsed.days ||= {};
        parsed.habits ||= { list: [], records: {} };
        parsed.taskTypes ||= { list: [] };
        if (!parsed.taskTypes.list?.length) {
          parsed.taskTypes.list = [
            { id: "uncat", name: "未分类", color: "#7aa2ff", created: nowYMD() }
          ];
        }
        updateDb(parsed);
        alert("导入成功（已覆盖当前数据并备份原数据）。");
        onClose();
      } catch (err) {
        console.error(err);
        alert("导入失败：文件不是有效 JSON 或格式不正确。");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClear = () => {
    if (confirm("确定清空本地数据吗？（不会删除你导出的文件）")) {
      clearLocalData();
      alert("已清空本地数据。");
      onClose();
    }
  };

  const handleSyncPull = async () => {
    if (!webdavUrl || !username || !password) return alert("请输入 WebDAV 地址、账号和应用密码");
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webdavUrl, username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '拉取失败');
      
      // Merge logic could be added here, but for simplicity we overwrite
      if (confirm(`发现在云端更新于 ${new Date(data.updatedAt).toLocaleString()} 的数据，即将覆盖本地数据。是否继续？`)) {
        updateDb(data.data);
        alert("成功从云端恢复历史记录！");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncPush = async (force: boolean = false) => {
    if (!webdavUrl || !username || !password) return alert("请输入 WebDAV 地址、账号和应用密码");
    setIsSyncing(true);
    try {
      const payload = {
        webdavUrl,
        username,
        password,
        data: db,
        force
      };
      
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.status === 409) {
        if (confirm(`${data.error}\n云端数据比当前本地数据更新（云端：${new Date(data.cloudUpdatedAt).toLocaleString()}）。\n强制覆盖云端吗？`)) {
          return handleSyncPush(true);
        } else {
          return;
        }
      }
      
      if (!res.ok) throw new Error(data.error || '推送失败');
      alert("自动存档已同步到云端！");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCancelSync = async () => {
    if (!webdavUrl || !username || !password) return alert("请输入 WebDAV 地址、账号和应用密码");
    if (!confirm("这将会清空云端服务器上保存的该账号数据。确认执行？")) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webdavUrl, username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '取消失败');
      alert("已清除云端数据，这不会影响你的本地数据。");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Modal
      title="数据与存档"
      onClose={onClose}
      footer={<Button onClick={onClose}>完成</Button>}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="pb-1 border-b border-[var(--line)]">
            <h2 className="text-[13px] font-bold m-0">云端同步（WebDAV）</h2>
            <div className="text-xs text-[var(--muted)]">例如坚果云（会自动创建 TIMEDONUTS 文件夹）</div>
          </div>
          <div className="flex flex-col gap-3 mt-1">
            <input 
              type="text" 
              placeholder="WebDAV 地址 (例如：https://dav.jianguoyun.com/dav/)" 
              className="px-3 py-2 text-sm border border-[var(--line)] rounded-md bg-[var(--panel2)] outline-none"
              value={webdavUrl}
              onChange={e => setWebdavUrl(e.target.value)}
            />
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="同步账号 (例如你的邮箱)" 
                className="flex-1 px-3 py-2 text-sm border border-[var(--line)] rounded-md bg-[var(--panel2)] outline-none"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
              <input 
                type="password" 
                placeholder="应用密码" 
                className="flex-[0.8] px-3 py-2 text-sm border border-[var(--line)] rounded-md bg-[var(--panel2)] outline-none"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap text-sm items-center">
              <Button variant="primary" onClick={() => handleSyncPush()} disabled={isSyncing}>
                {isSyncing ? '同步中...' : <span className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" /> 推送覆盖云端</span>}
              </Button>
              <Button onClick={() => handleSyncPull()} disabled={isSyncing}>
                <span className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> 拉取覆盖本地</span>
              </Button>
              <Button variant="danger" onClick={() => handleCancelSync()} disabled={isSyncing}>
                <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> 清空云端数据</span>
              </Button>
              <label className="flex items-center gap-1.5 ml-1 cursor-pointer text-xs select-none">
                <input 
                  type="checkbox" 
                  className="w-3.5 h-3.5 accent-[var(--accent)]" 
                  checked={autoSync} 
                  onChange={e => setAutoSync(e.target.checked)} 
                />
                自动上传修改
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="pb-1 border-b border-[var(--line)]">
            <h2 className="text-[13px] font-bold m-0">本地数据 / 离线备份</h2>
            <div className="text-xs text-[var(--muted)]">手动导出为文件存档</div>
          </div>
          <div className="pt-1">
             <div className="flex gap-2 flex-wrap items-center">
              <Button variant="primary" onClick={handleExport}>导出 JSON</Button>
              <label className="cursor-pointer">
                <div className="rounded-md px-4 py-1.5 text-sm font-medium shadow-sm transition-colors duration-150 active:translate-y-0 active:opacity-90 disabled:opacity-50 select-none border border-[var(--line)] bg-[var(--panel)] text-[var(--text)] hover:bg-[var(--panel2)] inline-flex items-center justify-center">
                  导入 JSON
                  <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
                </div>
              </label>
              <Button variant="danger" onClick={handleClear}>清空本地数据</Button>
            </div>
            <div className="text-[11px] text-[var(--muted)] mt-2">
              导入会覆盖当前数据（会先尝试备份为下载文件）。
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
}

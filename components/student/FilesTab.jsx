import { useState } from 'react';
import { C } from './constants';

export default function FilesTab({ allFiles, standaloneFiles, isParent, onFileDrop, uploading, onDelete, onRename }) {
  const [fileDrag, setFileDrag] = useState(false);
  const [renFileId, setRenFileId] = useState(null);
  const [renFileName, setRenFileName] = useState("");

  const startRename = (f) => { setRenFileId(f.id); setRenFileName(f.file_name || ""); };
  const saveRename = async () => { if (!renFileId || !renFileName.trim()) return; await onRename(renFileId, renFileName.trim()); setRenFileId(null); };

  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp }}>자료실</h3>
      <span style={{ fontSize: 12, color: C.tt }}>{allFiles.length + standaloneFiles.length}개 파일</span>
    </div>

    {!isParent && (<div onDragOver={e => { e.preventDefault(); setFileDrag(true); }} onDragLeave={() => setFileDrag(false)} onDrop={e => { e.preventDefault(); setFileDrag(false); onFileDrop(e.dataTransfer.files); }}
      style={{ border: "2px dashed " + (fileDrag ? C.ac : C.bd), borderRadius: 14, padding: uploading ? 20 : 24, textAlign: "center", marginBottom: 16, background: fileDrag ? C.as : C.sf, transition: "all .15s", cursor: "pointer", position: "relative" }}
      onClick={() => { const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.onchange = e => onFileDrop(e.target.files); inp.click(); }}>
      {uploading ? (<div style={{ color: C.ac, fontSize: 13 }}>업로드 중...</div>) : (
        <div><div style={{ fontSize: 20, marginBottom: 6 }}>{fileDrag ? "+" : "+"}</div><div style={{ fontSize: 13, color: fileDrag ? C.ac : C.ts }}>{fileDrag ? "놓으면 업로드됩니다" : "파일을 드래그하거나 클릭하여 추가"}</div></div>
      )}
    </div>)}

    {standaloneFiles.length > 0 && (<div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.tp, marginBottom: 8 }}>직접 추가한 자료</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {standaloneFiles.map(f => { const icon = f.file_type === "pdf" ? "PDF" : f.file_type === "img" ? "IMG" : "FILE"; const isRen = renFileId === f.id; return (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.sf, border: "1px solid " + (isRen ? C.ac : C.bd), borderRadius: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.ts }}>{icon}</span>
            {isRen ? (<>
              <input value={renFileName} onChange={e => setRenFileName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenFileId(null); }} autoFocus style={{ fontSize: 13, fontWeight: 500, color: C.tp, flex: 1, border: "none", outline: "none", background: "transparent", padding: 0, fontFamily: "inherit" }} />
              <button onClick={saveRename} style={{ background: C.as, color: C.ac, border: "1px solid " + C.al, borderRadius: 6, padding: "2px 10px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>확인</button>
              <button onClick={() => setRenFileId(null)} style={{ background: "none", border: "none", color: C.tt, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>취소</button>
            </>) : (<>
              <span style={{ fontSize: 13, fontWeight: 500, color: C.tp, flex: 1 }}>{f.file_name}</span>
              <span style={{ fontSize: 10, color: C.tt, background: C.sfh, padding: "2px 8px", borderRadius: 4 }}>{f.file_type || "file"}</span>
              {f.file_url && <a href={f.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: C.ac, textDecoration: "none" }}>열기</a>}
              {!isParent && <button onClick={() => startRename(f)} style={{ background: "none", border: "none", color: C.tt, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>이름변경</button>}
              {!isParent && <button onClick={() => onDelete(f.id)} style={{ background: "none", border: "none", color: C.tt, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>삭제</button>}
            </>)}
          </div>); })}
      </div>
    </div>)}

    {allFiles.length === 0 && standaloneFiles.length === 0 ? (<div style={{ textAlign: "center", padding: 40, color: C.tt, background: C.sf, border: "1px solid " + C.bd, borderRadius: 14 }}><div style={{ fontSize: 16, marginBottom: 8 }}>자료</div><div style={{ fontSize: 14 }}>아직 등록된 자료가 없습니다</div></div>) :
      allFiles.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tp, marginBottom: 8 }}>수업 자료</div>
          {[...new Set(allFiles.map(f => f.lesTopic))].map(topic => { const items = allFiles.filter(f => f.lesTopic === topic); return (<div key={topic || "etc"} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: C.ts, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}><span>{topic || "수업"}</span><span style={{ fontSize: 10, color: C.tt }}>({items[0]?.lesDate})</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{items.map(f => { const icon = (f.file_type || "") === "pdf" ? "PDF" : (f.file_type || "") === "img" ? "IMG" : "FILE"; return (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.sf, border: "1px solid " + C.bd, borderRadius: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.ts }}>{icon}</span><span style={{ fontSize: 13, fontWeight: 500, color: C.tp, flex: 1 }}>{f.file_name || f.name}</span><span style={{ fontSize: 10, color: C.tt, background: C.sfh, padding: "2px 8px", borderRadius: 4 }}>{f.file_type || "file"}</span>
              </div>); })}</div>
          </div>); })}
        </div>
      )}
  </div>);
}

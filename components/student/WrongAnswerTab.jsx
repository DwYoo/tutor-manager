import { useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { C, REASON_COLORS, ls, is, ReasonTooltip } from './constants';

export default function WrongAnswerTab({ wrongs, isParent, onAdd, onDelete, onUpdate }) {
  const [wForm, setWForm] = useState({ book: "", chapter: "", problem_num: "", reason: "", note: "" });
  const [wFilter, setWFilter] = useState("");
  const [wPage, setWPage] = useState(0);
  const [wExpanded, setWExpanded] = useState({});
  const [reasonBook, setReasonBook] = useState("");
  const [chapterBook, setChapterBook] = useState("");
  const PER_PAGE = 20;

  const wBooks = [...new Set(wrongs.map(w => w.book).filter(Boolean))];
  const filteredW = (wFilter ? wrongs.filter(w => w.book === wFilter) : wrongs).sort((a, b) => { const ac = a.chapter || "", bc = b.chapter || ""; if (ac !== bc) return ac.localeCompare(bc, undefined, { numeric: true }); const an = parseInt(a.problem_num) || 0, bn = parseInt(b.problem_num) || 0; return an - bn; });
  const totalWPages = Math.max(1, Math.ceil(filteredW.length / PER_PAGE));
  const pagedW = filteredW.slice(wPage * PER_PAGE, (wPage + 1) * PER_PAGE);

  const reasonSource = reasonBook ? wrongs.filter(w => w.book === reasonBook) : wrongs;
  const reasonMap = {};
  reasonSource.forEach(w => { const r = w.reason || "미분류"; reasonMap[r] = (reasonMap[r] || 0) + 1; });
  const reasonData = Object.entries(reasonMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([reason, count], i) => ({ name: reason, count, fill: REASON_COLORS[i % REASON_COLORS.length] }));

  const chapterSource = chapterBook ? wrongs.filter(w => w.book === chapterBook) : wrongs;
  const chapterMap = {};
  chapterSource.forEach(w => { const c = w.chapter || "미분류"; chapterMap[c] = (chapterMap[c] || 0) + 1; });
  const chapterData = Object.entries(chapterMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count], i) => ({ name, count, fill: REASON_COLORS[i % REASON_COLORS.length] }));

  const _rmc = {}; wrongs.forEach(w => { const r = w.reason || "미분류"; _rmc[r] = (_rmc[r] || 0) + 1; });
  const reasonColorMap = {}; Object.entries(_rmc).sort((a, b) => b[1] - a[1]).forEach(([r], i) => { reasonColorMap[r] = REASON_COLORS[i % REASON_COLORS.length]; });
  const _cmc = {}; wrongs.forEach(w => { const c = w.chapter; if (c) { _cmc[c] = (_cmc[c] || 0) + 1; } });
  const chapterColorMap = {}; Object.entries(_cmc).sort((a, b) => b[1] - a[1]).forEach(([c], i) => { chapterColorMap[c] = REASON_COLORS[i % REASON_COLORS.length]; });

  const handleAdd = () => {
    if (!wForm.problem_num.trim()) return;
    onAdd(wForm);
    setWForm(f => ({ ...f, problem_num: "", reason: "", note: "" }));
    setWPage(0);
  };

  const renderRow = (w) => {
    const rc = reasonColorMap[w.reason || "미분류"] || "#888";
    const cc = chapterColorMap[w.chapter] || null;
    return (<tr key={w.id} style={{ borderBottom: "1px solid " + C.bl }}>
      <td style={{ padding: "6px 4px" }}>{isParent ? <span style={{ fontSize: 12, padding: "0 6px", display: "inline-flex", alignItems: "center", gap: 4, color: w.chapter ? C.ts : "#bbb" }}>{cc && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: cc, flexShrink: 0 }} />}{w.chapter || "단원"}</span> : <div style={{ display: "flex", alignItems: "center", gap: 4 }}>{cc && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: cc, flexShrink: 0 }} />}<input value={w.chapter || ""} onChange={e => onUpdate(w.id, "chapter", e.target.value)} style={{ border: "none", outline: "none", background: "transparent", color: C.ts, fontSize: 12, fontFamily: "inherit", width: "100%", padding: "2px 6px" }} placeholder="단원" /></div>}</td>
      <td style={{ padding: "6px 4px" }}>{isParent ? <span style={{ fontWeight: 600, color: C.tp, fontSize: 12, padding: "0 6px" }}>{w.problem_num}</span> : <input value={w.problem_num || ""} onChange={e => onUpdate(w.id, "problem_num", e.target.value)} style={{ border: "none", outline: "none", background: "transparent", fontWeight: 600, color: C.tp, fontSize: 12, fontFamily: "inherit", width: 60, padding: "2px 6px" }} />}</td>
      <td style={{ padding: "6px 4px" }}>{isParent ? <span style={{ background: rc + "20", color: rc, padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600 }}>{w.reason || "-"}</span> : <input value={w.reason || ""} onChange={e => onUpdate(w.id, "reason", e.target.value)} style={{ border: "none", outline: "none", background: rc + "20", color: rc, fontSize: 11, fontWeight: 600, fontFamily: "inherit", borderRadius: 5, padding: "2px 8px", width: "100%" }} placeholder="사유" />}</td>
      <td style={{ padding: "6px 4px" }}>{isParent ? <span style={{ color: C.ts, fontSize: 12, padding: "0 6px" }}>{w.note || "-"}</span> : <input value={w.note || ""} onChange={e => onUpdate(w.id, "note", e.target.value)} style={{ border: "none", outline: "none", background: "transparent", color: C.ts, fontSize: 12, fontFamily: "inherit", width: "100%", padding: "2px 6px" }} placeholder="메모" />}</td>
      <td style={{ padding: "6px 4px" }}>{!isParent && <button onClick={() => onDelete(w.id)} style={{ background: "none", border: "none", color: C.tt, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>삭제</button>}</td>
    </tr>);
  };

  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.tp }}>오답 관리</h3>
      <span style={{ background: C.db, color: C.dn, padding: "3px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>총 {wrongs.length}문항</span>
    </div>

    {/* Stats charts */}
    {wrongs.length > 0 && (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
      <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 12, padding: "14px 12px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.tp, marginBottom: 6 }}>오답 사유별</div>
        <div style={{ display: "flex", gap: 3, marginBottom: 8, flexWrap: "wrap" }}>
          <button onClick={() => setReasonBook("")} style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid " + (!reasonBook ? C.ac : C.bd), background: !reasonBook ? C.as : "transparent", fontSize: 9, fontWeight: !reasonBook ? 600 : 400, color: !reasonBook ? C.ac : C.ts, cursor: "pointer", fontFamily: "inherit" }}>전체</button>
          {wBooks.map(b => (<button key={b} onClick={() => setReasonBook(reasonBook === b ? "" : b)} style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid " + (reasonBook === b ? C.ac : C.bd), background: reasonBook === b ? C.as : "transparent", fontSize: 9, fontWeight: reasonBook === b ? 600 : 400, color: reasonBook === b ? C.ac : C.ts, cursor: "pointer", fontFamily: "inherit" }}>{b}</button>))}
        </div>
        {reasonData.length > 0 ? (<ResponsiveContainer width="100%" height={120}>
          <BarChart data={reasonData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.tt }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 9, fill: C.tt }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ReasonTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={14}>
              {reasonData.map((d, i) => (<Cell key={i} fill={d.fill} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>) : (<div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: C.tt, fontSize: 11 }}>데이터 없음</div>)}
      </div>
      <div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 12, padding: "14px 12px" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.tp, marginBottom: 6 }}>단원별 오답</div>
        <div style={{ display: "flex", gap: 3, marginBottom: 8, flexWrap: "wrap" }}>
          <button onClick={() => setChapterBook("")} style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid " + (!chapterBook ? C.ac : C.bd), background: !chapterBook ? C.as : "transparent", fontSize: 9, fontWeight: !chapterBook ? 600 : 400, color: !chapterBook ? C.ac : C.ts, cursor: "pointer", fontFamily: "inherit" }}>전체</button>
          {wBooks.map(b => (<button key={b} onClick={() => setChapterBook(chapterBook === b ? "" : b)} style={{ padding: "2px 8px", borderRadius: 5, border: "1px solid " + (chapterBook === b ? C.ac : C.bd), background: chapterBook === b ? C.as : "transparent", fontSize: 9, fontWeight: chapterBook === b ? 600 : 400, color: chapterBook === b ? C.ac : C.ts, cursor: "pointer", fontFamily: "inherit" }}>{b}</button>))}
        </div>
        {chapterData.length > 0 ? (<ResponsiveContainer width="100%" height={120}>
          <BarChart data={chapterData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.tt }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 9, fill: C.tt }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ReasonTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={14}>
              {chapterData.map((d, i) => (<Cell key={i} fill={d.fill} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>) : (<div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: C.tt, fontSize: 11 }}>데이터 없음</div>)}
      </div>
    </div>)}

    {/* Add wrong */}
    {!isParent && (<div style={{ background: C.sf, border: "1px solid " + C.bd, borderRadius: 14, padding: 16, marginBottom: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 100px" }}><label style={ls}>교재</label><input value={wForm.book} onChange={e => setWForm(p => ({ ...p, book: e.target.value }))} style={{ ...is, fontSize: 12, padding: "6px 10px" }} placeholder="교재명" /></div>
        <div style={{ flex: "1 1 80px" }}><label style={ls}>단원</label><input value={wForm.chapter} onChange={e => setWForm(p => ({ ...p, chapter: e.target.value }))} style={{ ...is, fontSize: 12, padding: "6px 10px" }} placeholder="단원" /></div>
        <div style={{ flex: "0 0 60px" }}><label style={ls}>번호</label><input value={wForm.problem_num} onChange={e => setWForm(p => ({ ...p, problem_num: e.target.value }))} style={{ ...is, fontSize: 12, padding: "6px 10px" }} placeholder="#" /></div>
        <div style={{ flex: "1 1 100px" }}><label style={ls}>오답 사유</label><input value={wForm.reason} onChange={e => setWForm(p => ({ ...p, reason: e.target.value }))} style={{ ...is, fontSize: 12, padding: "6px 10px" }} placeholder="오답 사유" /></div>
        <div style={{ flex: "1 1 100px" }}><label style={ls}>메모</label><input value={wForm.note} onChange={e => setWForm(p => ({ ...p, note: e.target.value }))} style={{ ...is, fontSize: 12, padding: "6px 10px" }} placeholder="메모" /></div>
        <button onClick={handleAdd} style={{ background: C.pr, color: "#fff", border: "none", borderRadius: 8, padding: "6px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, alignSelf: "flex-end" }}>추가</button>
      </div>
    </div>)}

    {/* Filter by book */}
    <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
      <button onClick={() => { setWFilter(""); setWPage(0); }} style={{ background: !wFilter ? C.as : C.sfh, border: "1px solid " + (!wFilter ? C.ac : C.bd), borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: !wFilter ? 600 : 400, color: !wFilter ? C.ac : C.ts, cursor: "pointer", fontFamily: "inherit" }}>전체 ({wrongs.length})</button>
      {wBooks.map(b => { const cnt = wrongs.filter(w => w.book === b).length; return (<button key={b} onClick={() => { setWFilter(wFilter === b ? "" : b); setWPage(0); }} style={{ background: wFilter === b ? C.as : C.sfh, border: "1px solid " + (wFilter === b ? C.ac : C.bd), borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: wFilter === b ? 600 : 400, color: wFilter === b ? C.ac : C.ts, cursor: "pointer", fontFamily: "inherit" }}>{b} ({cnt})</button>); })}
    </div>

    {/* Wrong answers list */}
    {wrongs.length === 0 ? (<div style={{ textAlign: "center", padding: 40, color: C.tt, background: C.sf, border: "1px solid " + C.bd, borderRadius: 14 }}><div style={{ fontSize: 14 }}>오답 기록이 없습니다</div></div>) :
      !wFilter ? ([...wBooks, ...(wrongs.some(w => !w.book) ? [""] : [])].map(book => { const bk = book || "__no_book__"; const items = [...wrongs.filter(w => book ? w.book === book : !w.book)].sort((a, b) => { const ac = a.chapter || "", bc = b.chapter || ""; if (ac !== bc) return ac.localeCompare(bc, undefined, { numeric: true }); const an = parseInt(a.problem_num) || 0, bn = parseInt(b.problem_num) || 0; return an - bn; }); const exp = wExpanded[bk] !== false; return (
        <div key={bk} style={{ marginBottom: 12 }}>
          <div onClick={() => setWExpanded(p => ({ ...p, [bk]: !exp }))} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: C.sfh, borderRadius: 10, cursor: "pointer", marginBottom: exp ? 8 : 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: book ? C.tp : C.tt }}>{book || "교재명 미지정"} <span style={{ fontWeight: 400, color: C.tt }}>({items.length})</span></span>
            <span style={{ fontSize: 12, color: C.tt }}>{exp ? "▲" : "▼"}</span>
          </div>
          {exp && <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>{["단원", "번호", "사유", "메모", ""].map((h, i) => (<th key={i} style={{ padding: "8px 10px", textAlign: "left", color: C.tt, fontWeight: 500, borderBottom: "1px solid " + C.bd }}>{h}</th>))}</tr></thead>
            <tbody>{items.map(w => renderRow(w))}</tbody>
          </table>}
        </div>); })) : (
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr>{["단원", "번호", "사유", "메모", ""].map((h, i) => (<th key={i} style={{ padding: "8px 10px", textAlign: "left", color: C.tt, fontWeight: 500, borderBottom: "1px solid " + C.bd }}>{h}</th>))}</tr></thead>
            <tbody>{pagedW.map(w => renderRow(w))}</tbody>
          </table>
          {pagedW.length === 0 && <div style={{ textAlign: "center", padding: 24, color: C.tt, fontSize: 13 }}>오답 기록이 없습니다</div>}
          {totalWPages > 1 && (<div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 12 }}>
            <button onClick={() => setWPage(p => Math.max(0, p - 1))} disabled={wPage === 0} style={{ padding: "4px 12px", border: "1px solid " + C.bd, borderRadius: 6, fontSize: 11, background: C.sf, cursor: wPage === 0 ? "default" : "pointer", opacity: wPage === 0 ? .4 : 1, fontFamily: "inherit" }}>← 이전</button>
            <span style={{ fontSize: 12, color: C.ts }}>{wPage + 1} / {totalWPages}</span>
            <button onClick={() => setWPage(p => Math.min(totalWPages - 1, p + 1))} disabled={wPage >= totalWPages - 1} style={{ padding: "4px 12px", border: "1px solid " + C.bd, borderRadius: 6, fontSize: 11, background: C.sf, cursor: wPage >= totalWPages - 1 ? "default" : "pointer", opacity: wPage >= totalWPages - 1 ? .4 : 1, fontFamily: "inherit" }}>다음 →</button>
          </div>)}
        </div>
      )
    }
  </div>);
}

/**
 * Data export utilities — PDF reports & CSV export
 * Uses jspdf for PDF generation, html2canvas for chart capture
 */

import { p2 } from '@/lib/utils';

/* ── CSV Export ─────────────────────────────────── */

/**
 * Export tuition data as CSV with BOM for Korean support
 * @param {Array} records - monthRecs from Tuition component
 * @param {string} monthLabel - e.g. "2026년 2월"
 */
export function exportTuitionCSV(records, monthLabel) {
  const header = ['학생명', '회당단가', '수업횟수', '수업료', '이월', '청구액', '납부액', '상태', '입금일', '현금영수증', '메모'];
  const statusMap = { paid: '완납', partial: '일부납', unpaid: '미납' };
  const rows = records.map(r => [
    r.student.name,
    r.student.fee_per_class || 0,
    r.lessonCnt,
    r.displayFee,
    r.carryover,
    r.totalDue,
    r.paidAmount,
    statusMap[r.status] || r.status,
    r.record?.paid_date || '',
    r.record?.cash_receipt_issued ? 'O' : '',
    (r.record?.memo || '').replace(/[\r\n]+/g, ' '),
  ]);
  const totalRow = ['합계', '', '', '', '', records.reduce((a, r) => a + r.totalDue, 0), records.reduce((a, r) => a + r.paidAmount, 0), '', '', '', ''];
  const csv = [header, ...rows, totalRow].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `수업료_${monthLabel.replace(/\s/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── PDF Report ─────────────────────────────────── */

/** Escape HTML special characters */
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Generate a student report PDF using html2canvas for Korean text support
 */
export async function exportStudentReportPDF({ student, scores, lessons, wrongs, studyPlans }) {
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import('jspdf'),
    import('html2canvas').then(m => m.default || m),
  ]);

  const s = student;
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  // Build HTML report content
  const sorted = [...scores].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const pastLessons = lessons.filter(l => (l.date || '') <= `${today.getFullYear()}-${p2(today.getMonth() + 1)}-${p2(today.getDate())}`);

  let html = '';

  // Title
  html += `<div style="font-size:24px;font-weight:800;color:#1a1a1a;margin-bottom:6px">${esc(s.name)} - 학습 리포트</div>`;
  html += `<div style="font-size:12px;color:#78716C;margin-bottom:8px">${esc(s.subject)} | ${esc(s.grade || '')}${s.school ? ' | ' + esc(s.school) : ''} | ${dateStr}</div>`;
  html += `<hr style="border:none;border-top:1px solid #E7E5E4;margin-bottom:16px">`;

  // 성적 추이
  if (sorted.length > 0) {
    const latest = sorted[sorted.length - 1];
    const best = Math.max(...sorted.map(x => x.score));
    const avg = Math.round(sorted.reduce((a, x) => a + x.score, 0) / sorted.length);

    html += `<div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:8px">성적 추이</div>`;
    html += `<div style="font-size:12px;color:#505050;margin-bottom:10px">최근 ${latest.score}점 &nbsp;|&nbsp; 최고 ${best}점 &nbsp;|&nbsp; 평균 ${avg}점</div>`;

    const recent = sorted.slice(-10);
    html += `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">`;
    html += `<thead><tr style="color:#78716C;border-bottom:1px solid #E7E5E4"><th style="text-align:left;padding:4px 6px;font-weight:500">날짜</th><th style="text-align:left;padding:4px 6px;font-weight:500">시험명</th><th style="text-align:left;padding:4px 6px;font-weight:500">점수</th><th style="text-align:left;padding:4px 6px;font-weight:500">등급</th></tr></thead><tbody>`;
    recent.forEach(sc => {
      html += `<tr style="border-bottom:1px solid #F5F5F4"><td style="padding:4px 6px">${esc(sc.date || '-')}</td><td style="padding:4px 6px">${esc((sc.label || '-').substring(0, 30))}</td><td style="padding:4px 6px">${sc.score ?? '-'}</td><td style="padding:4px 6px">${sc.grade != null ? sc.grade + '등급' : '-'}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  // 수업 이력
  if (pastLessons.length > 0) {
    const recentLessons = pastLessons.slice(0, 15);
    html += `<div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:8px">최근 수업 이력</div>`;
    html += `<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:16px">`;
    html += `<thead><tr style="color:#78716C;border-bottom:1px solid #E7E5E4"><th style="text-align:left;padding:4px 6px;font-weight:500">날짜</th><th style="text-align:left;padding:4px 6px;font-weight:500">과목/주제</th><th style="text-align:left;padding:4px 6px;font-weight:500">내용</th></tr></thead><tbody>`;
    recentLessons.forEach(l => {
      const topicStr = `${l.subject || ''}${l.topic ? ' - ' + l.topic : ''}`;
      const content = (l.content || '-').replace(/\n/g, ' ').substring(0, 50);
      html += `<tr style="border-bottom:1px solid #F5F5F4"><td style="padding:4px 6px;white-space:nowrap">${esc(l.date || '-')}</td><td style="padding:4px 6px">${esc(topicStr)}</td><td style="padding:4px 6px;color:#505050">${esc(content)}</td></tr>`;
    });
    html += `</tbody></table>`;
  }

  // 오답 유형 분포
  if (wrongs.length > 0) {
    const reasonMap = {};
    wrongs.forEach(w => { const r = w.reason || '미분류'; reasonMap[r] = (reasonMap[r] || 0) + 1; });
    const reasons = Object.entries(reasonMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxCount = Math.max(...reasons.map(r => r[1]));

    html += `<div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:10px">오답 유형 분포</div>`;
    reasons.forEach(([reason, count]) => {
      const barW = Math.round((count / maxCount) * 100);
      html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px">`;
      html += `<div style="width:80px;flex-shrink:0;text-align:right;color:#505050">${esc(reason)}</div>`;
      html += `<div style="flex:1;height:14px;background:#F5F5F4;border-radius:3px;overflow:hidden"><div style="width:${barW}%;height:100%;background:#2563EB;border-radius:3px"></div></div>`;
      html += `<div style="width:30px;flex-shrink:0;color:#1a1a1a;font-weight:600">${count}</div>`;
      html += `</div>`;
    });
    html += `<div style="margin-bottom:16px"></div>`;
  }

  // SWOT
  const swotSections = [
    { label: '지도 방향', text: s.plan_strategy },
    { label: '강점', text: s.plan_strength },
    { label: '약점', text: s.plan_weakness },
    { label: '기회', text: s.plan_opportunity },
    { label: '위협', text: s.plan_threat },
  ].filter(x => x.text);

  if (swotSections.length > 0) {
    html += `<div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:10px">학습 분석</div>`;
    swotSections.forEach(({ label, text }) => {
      html += `<div style="margin-bottom:8px">`;
      html += `<span style="font-size:12px;font-weight:600;color:#2563EB">[${esc(label)}]</span>`;
      html += `<div style="font-size:11px;color:#505050;margin-top:2px;white-space:pre-wrap">${esc(text)}</div>`;
      html += `</div>`;
    });
  }

  // 지도 방향 timeline
  if (studyPlans && studyPlans.length > 0) {
    html += `<div style="font-size:14px;font-weight:700;color:#1a1a1a;margin-top:12px;margin-bottom:8px">지도 방향</div>`;
    studyPlans.slice(0, 5).forEach(sp => {
      html += `<div style="margin-bottom:8px;padding:8px 12px;border-left:3px solid #E7E5E4;border-radius:4px">`;
      html += `<div style="display:flex;justify-content:space-between;align-items:center">`;
      html += `<span style="font-size:11px;font-weight:600;color:#1a1a1a">${esc(sp.title || '지도 방향')}</span>`;
      html += `<span style="font-size:10px;color:#78716C">${esc(sp.date || '')}</span>`;
      html += `</div>`;
      html += `<div style="font-size:11px;color:#505050;margin-top:4px;white-space:pre-wrap;line-height:1.6">${esc(sp.body || '')}</div>`;
      html += `</div>`;
    });
  }

  // Create off-screen container and render
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:720px;padding:36px;background:#fff;font-family:Pretendard Variable,system-ui,sans-serif;color:#1a1a1a;line-height:1.5;';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });

    const imgW = 210 - 20; // A4 width minus margins (mm)
    const imgH = (canvas.height * imgW) / canvas.width;
    const pageH = 287; // A4 usable height (mm) with margin
    const pageCount = Math.ceil(imgH / pageH);

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    for (let i = 0; i < pageCount; i++) {
      if (i > 0) doc.addPage();
      // Clip each page from the full canvas
      const srcY = Math.round((i * pageH / imgH) * canvas.height);
      const srcH = Math.round((pageH / imgH) * canvas.height);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.min(srcH, canvas.height - srcY);
      const ctx = pageCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, srcY, canvas.width, pageCanvas.height, 0, 0, canvas.width, pageCanvas.height);

      const pageImgH = (pageCanvas.height * imgW) / pageCanvas.width;
      doc.addImage(pageCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 10, 5, imgW, pageImgH);
    }

    doc.save(`${s.name}_학습리포트_${today.getFullYear()}${p2(today.getMonth() + 1)}${p2(today.getDate())}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

/* ── ShareView 월간 진도 요약 생성 ──────────────── */

/**
 * Generate monthly progress summary data
 * @param {Object} opts
 * @param {Array} opts.lessons - all lessons
 * @param {Array} opts.scores - all scores
 * @param {number} opts.year
 * @param {number} opts.month - 1-based
 * @returns {{ totalClasses, completedTopics, avgScore, hwRate, summary }}
 */
export function generateMonthlySummary({ lessons, scores, homework, year, month }) {
  const monthStr = `${year}-${p2(month)}`;
  const dim = new Date(year, month, 0).getDate();
  const monthStart = `${monthStr}-01`;
  const monthEnd = `${monthStr}-${p2(dim)}`;

  // Count classes in month
  const monthLessons = lessons.filter(l => {
    const d = (l.date || '').slice(0, 10);
    return d >= monthStart && d <= monthEnd;
  });
  const totalClasses = monthLessons.length;

  // Completed topics
  const completedLessons = monthLessons.filter(l => l.content && l.content.trim() !== '');
  const topics = monthLessons.map(l => l.topic || l.subject).filter(Boolean);
  const uniqueTopics = [...new Set(topics)];

  // Month scores
  const monthScores = scores.filter(sc => {
    const d = (sc.date || '').slice(0, 10);
    return d >= monthStart && d <= monthEnd;
  });
  const avgScore = monthScores.length ? Math.round(monthScores.reduce((a, x) => a + x.score, 0) / monthScores.length) : null;

  // Homework completion rate
  const allHw = homework || monthLessons.flatMap(l => l.homework || []);
  const monthHw = allHw.filter(h => {
    if (h.lesDate) return h.lesDate >= monthStart && h.lesDate <= monthEnd;
    return true;
  });
  const hwRate = monthHw.length ? Math.round(monthHw.filter(h => (h.completion_pct || 0) >= 100).length / monthHw.length * 100) : null;

  // Build summary text
  const lines = [];
  lines.push(`${year}년 ${month}월 학습 요약`);
  lines.push(`총 수업: ${totalClasses}회`);
  if (completedLessons.length > 0) lines.push(`기록 완료: ${completedLessons.length}회`);
  if (uniqueTopics.length > 0) lines.push(`학습 주제: ${uniqueTopics.slice(0, 5).join(', ')}${uniqueTopics.length > 5 ? ` 외 ${uniqueTopics.length - 5}개` : ''}`);
  if (avgScore != null) lines.push(`평균 점수: ${avgScore}점`);
  if (hwRate != null) lines.push(`숙제 완료율: ${hwRate}%`);

  return { totalClasses, completedLessons: completedLessons.length, topics: uniqueTopics, avgScore, hwRate, summary: lines.join('\n') };
}

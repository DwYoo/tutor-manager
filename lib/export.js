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

/**
 * Generate a student report PDF
 * @param {Object} opts
 * @param {Object} opts.student - student record
 * @param {Array} opts.scores - score records (sorted by date)
 * @param {Array} opts.lessons - lesson records (sorted by date desc)
 * @param {Array} opts.wrongs - wrong answer records
 */
export async function exportStudentReportPDF({ student, scores, lessons, wrongs }) {
  const { jsPDF } = await import('jspdf');

  const s = student;
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const W = 210, M = 15;
  const cw = W - M * 2; // content width
  let y = M;

  // Helper: auto-wrap Korean text
  const writeText = (text, x, startY, maxW, fontSize = 10, color = [30, 30, 30]) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, maxW);
    lines.forEach(line => {
      if (startY > 275) { doc.addPage(); startY = M; }
      doc.text(line, x, startY);
      startY += fontSize * 0.45;
    });
    return startY;
  };

  // ── Title ──
  doc.setFontSize(18);
  doc.setTextColor(26, 26, 26);
  doc.text(`${s.name} - 학습 리포트`, M, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(120, 113, 108);
  doc.text(`${s.subject} | ${s.grade || ''}${s.school ? ' | ' + s.school : ''} | ${dateStr}`, M, y);
  y += 4;
  doc.setDrawColor(231, 229, 228);
  doc.line(M, y, W - M, y);
  y += 8;

  // ── 성적 요약 ──
  const sorted = [...scores].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (sorted.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(26, 26, 26);
    doc.text('성적 추이', M, y);
    y += 7;

    const latest = sorted[sorted.length - 1];
    const best = Math.max(...sorted.map(x => x.score));
    const avg = Math.round(sorted.reduce((a, x) => a + x.score, 0) / sorted.length);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`최근 ${latest.score}점  |  최고 ${best}점  |  평균 ${avg}점`, M, y);
    y += 6;

    // Score table
    const recent = sorted.slice(-10);
    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108);
    doc.text('날짜', M, y);
    doc.text('시험명', M + 30, y);
    doc.text('점수', M + 100, y);
    doc.text('등급', M + 120, y);
    y += 1;
    doc.line(M, y, W - M, y);
    y += 4;
    doc.setTextColor(30, 30, 30);
    recent.forEach(sc => {
      if (y > 275) { doc.addPage(); y = M; }
      doc.text(sc.date || '-', M, y);
      doc.text((sc.label || '-').substring(0, 30), M + 30, y);
      doc.text(String(sc.score ?? '-'), M + 100, y);
      doc.text(sc.grade != null ? sc.grade + '등급' : '-', M + 120, y);
      y += 5;
    });
    y += 6;
  }

  // ── 수업 이력 ──
  const pastLessons = lessons.filter(l => (l.date || '') <= `${today.getFullYear()}-${p2(today.getMonth() + 1)}-${p2(today.getDate())}`);
  if (pastLessons.length > 0) {
    if (y > 240) { doc.addPage(); y = M; }
    doc.setFontSize(13);
    doc.setTextColor(26, 26, 26);
    doc.text('최근 수업 이력', M, y);
    y += 7;

    const recentLessons = pastLessons.slice(0, 15);
    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108);
    doc.text('날짜', M, y);
    doc.text('과목/주제', M + 30, y);
    doc.text('내용', M + 90, y);
    y += 1;
    doc.line(M, y, W - M, y);
    y += 4;
    doc.setTextColor(30, 30, 30);
    recentLessons.forEach(l => {
      if (y > 275) { doc.addPage(); y = M; }
      doc.text(l.date || '-', M, y);
      const topicStr = `${l.subject || ''}${l.topic ? ' - ' + l.topic : ''}`;
      doc.text(topicStr.substring(0, 25), M + 30, y);
      const content = (l.content || '-').replace(/\n/g, ' ').substring(0, 35);
      doc.text(content, M + 90, y);
      y += 5;
    });
    y += 6;
  }

  // ── 오답 유형 분포 ──
  if (wrongs.length > 0) {
    if (y > 240) { doc.addPage(); y = M; }
    doc.setFontSize(13);
    doc.setTextColor(26, 26, 26);
    doc.text('오답 유형 분포', M, y);
    y += 7;

    const reasonMap = {};
    wrongs.forEach(w => { const r = w.reason || '미분류'; reasonMap[r] = (reasonMap[r] || 0) + 1; });
    const reasons = Object.entries(reasonMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    reasons.forEach(([reason, count]) => {
      if (y > 275) { doc.addPage(); y = M; }
      const barW = Math.min((count / Math.max(...reasons.map(r => r[1]))) * 80, 80);
      doc.setFillColor(37, 99, 235);
      doc.rect(M, y - 3, barW, 4, 'F');
      doc.text(`${reason} (${count})`, M + barW + 3, y);
      y += 6;
    });
    y += 4;
  }

  // ── SWOT ──
  if (s.plan_strategy || s.plan_strength || s.plan_weakness) {
    if (y > 220) { doc.addPage(); y = M; }
    doc.setFontSize(13);
    doc.setTextColor(26, 26, 26);
    doc.text('학습 분석', M, y);
    y += 7;

    const sections = [
      { label: '전략', text: s.plan_strategy },
      { label: '강점', text: s.plan_strength },
      { label: '약점', text: s.plan_weakness },
      { label: '기회', text: s.plan_opportunity },
      { label: '위협', text: s.plan_threat },
    ].filter(x => x.text);

    sections.forEach(({ label, text }) => {
      if (y > 270) { doc.addPage(); y = M; }
      doc.setFontSize(10);
      doc.setTextColor(37, 99, 235);
      doc.text(`[${label}]`, M, y);
      y += 4;
      y = writeText(text, M, y, cw, 9, [80, 80, 80]);
      y += 3;
    });
  }

  // ── Footer ──
  const pc = doc.getNumberOfPages();
  for (let i = 1; i <= pc; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(168, 162, 158);
    doc.text(`${s.name} 학습 리포트 - ${dateStr}`, M, 290);
    doc.text(`${i} / ${pc}`, W - M, 290, { align: 'right' });
  }

  doc.save(`${s.name}_학습리포트_${today.getFullYear()}${p2(today.getMonth() + 1)}${p2(today.getDate())}.pdf`);
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { C } from '@/components/Colors'

const CATEGORIES = ['수업준비', '행정', '학부모연락', '기타']
const PRIORITIES = [
  { id: 'high', label: '높음', color: C.dn, bg: C.db },
  { id: 'medium', label: '보통', color: C.wn, bg: C.wb },
  { id: 'low', label: '낮음', color: C.su, bg: C.sb },
]

const FILTERS = [
  { id: 'all', label: '전체' },
  { id: 'active', label: '미완료' },
  { id: 'completed', label: '완료' },
]

function getPriorityMeta(id) {
  return PRIORITIES.find(p => p.id === id) || PRIORITIES[1]
}

function formatDueDate(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: `${Math.abs(diff)}일 초과`, color: C.dn }
  if (diff === 0) return { label: '오늘', color: C.wn }
  if (diff === 1) return { label: '내일', color: C.wn }
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return { label: `${mm}/${dd}`, color: diff <= 3 ? C.wn : C.ts }
}

export default function TeacherTodoTab() {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('전체')
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ title: '', priority: 'medium', category: '기타', due_date: '' })
  const [saving, setSaving] = useState(false)

  const fetchTodos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('teacher_todos')
      .select('*')
      .order('sort_order')
      .order('created_at')
    setTodos(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchTodos() }, [fetchTodos])

  const resetForm = () => setForm({ title: '', priority: 'medium', category: '기타', due_date: '' })

  const startAdd = () => {
    resetForm()
    setEditId(null)
    setAdding(true)
  }

  const startEdit = (todo) => {
    setForm({
      title: todo.title,
      priority: todo.priority,
      category: todo.category,
      due_date: todo.due_date || '',
    })
    setEditId(todo.id)
    setAdding(true)
  }

  const cancelForm = () => {
    setAdding(false)
    setEditId(null)
    resetForm()
  }

  const saveForm = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      priority: form.priority,
      category: form.category,
      due_date: form.due_date || null,
    }
    if (editId) {
      await supabase.from('teacher_todos').update(payload).eq('id', editId)
    } else {
      const maxOrder = todos.length > 0 ? Math.max(...todos.map(t => t.sort_order)) + 1 : 0
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('teacher_todos').insert({ ...payload, user_id: user.id, sort_order: maxOrder })
    }
    setSaving(false)
    cancelForm()
    fetchTodos()
  }

  const toggleComplete = async (todo) => {
    await supabase.from('teacher_todos').update({ completed: !todo.completed }).eq('id', todo.id)
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: !t.completed } : t))
  }

  const deleteTodo = async (id) => {
    await supabase.from('teacher_todos').delete().eq('id', id)
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  const filteredTodos = todos.filter(t => {
    if (filter === 'active' && t.completed) return false
    if (filter === 'completed' && !t.completed) return false
    if (categoryFilter !== '전체' && t.category !== categoryFilter) return false
    return true
  })

  const activeCount = todos.filter(t => !t.completed).length
  const completedCount = todos.filter(t => t.completed).length

  const btnSm = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, color: C.ts, fontFamily: 'inherit', padding: '2px 6px',
    borderRadius: 6, lineHeight: '1.4',
  }

  if (loading) return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: C.tt, fontSize: 14 }}>불러오는 중...</div>
  )

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, background: C.as, border: `1px solid ${C.al}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.ac, marginBottom: 2 }}>미완료</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.ac }}>{activeCount}</div>
        </div>
        <div style={{ flex: 1, background: C.sb, border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.su, marginBottom: 2 }}>완료</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.su }}>{completedCount}</div>
        </div>
        <div style={{ flex: 1, background: C.sfh, border: `1px solid ${C.bd}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.ts, marginBottom: 2 }}>전체</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.tp }}>{todos.length}</div>
        </div>
      </div>

      {/* Add button + filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button
          onClick={startAdd}
          style={{
            padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.ac}`,
            background: C.ac, color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          + 할 일 추가
        </button>
        <div style={{ flex: 1 }} />
        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '6px 12px', borderRadius: 8,
                border: `1px solid ${filter === f.id ? C.ac : C.bd}`,
                background: filter === f.id ? C.as : 'transparent',
                color: filter === f.id ? C.ac : C.ts,
                fontSize: 12, fontWeight: filter === f.id ? 600 : 400,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {['전체', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: '4px 10px', borderRadius: 6,
              border: `1px solid ${categoryFilter === cat ? C.ac : C.bd}`,
              background: categoryFilter === cat ? C.as : 'transparent',
              color: categoryFilter === cat ? C.ac : C.ts,
              fontSize: 11, fontWeight: categoryFilter === cat ? 600 : 400,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add / Edit form */}
      {adding && (
        <div style={{
          background: C.sf, border: `1px solid ${C.ac}`, borderRadius: 12,
          padding: 16, marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tp, marginBottom: 12 }}>
            {editId ? '할 일 수정' : '새 할 일'}
          </div>
          <input
            autoFocus
            placeholder="할 일을 입력하세요"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') saveForm(); if (e.key === 'Escape') cancelForm(); }}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: `1px solid ${C.bd}`, fontSize: 13, color: C.tp,
              fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              marginBottom: 10,
            }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {/* Priority */}
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 11, color: C.tt, marginBottom: 4 }}>우선순위</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {PRIORITIES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setForm(f => ({ ...f, priority: p.id }))}
                    style={{
                      flex: 1, padding: '5px 0', borderRadius: 6,
                      border: `1px solid ${form.priority === p.id ? p.color : C.bd}`,
                      background: form.priority === p.id ? p.bg : 'transparent',
                      color: form.priority === p.id ? p.color : C.ts,
                      fontSize: 11, fontWeight: form.priority === p.id ? 600 : 400,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Category */}
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 11, color: C.tt, marginBottom: 4 }}>분류</div>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{
                  width: '100%', padding: '5px 8px', borderRadius: 6,
                  border: `1px solid ${C.bd}`, fontSize: 12, color: C.tp,
                  fontFamily: 'inherit', background: C.sf, cursor: 'pointer',
                }}
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            {/* Due date */}
            <div style={{ flex: 1, minWidth: 130 }}>
              <div style={{ fontSize: 11, color: C.tt, marginBottom: 4 }}>마감일 (선택)</div>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                style={{
                  width: '100%', padding: '5px 8px', borderRadius: 6,
                  border: `1px solid ${C.bd}`, fontSize: 12, color: C.tp,
                  fontFamily: 'inherit', background: C.sf, boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={cancelForm}
              style={{
                padding: '7px 16px', borderRadius: 8,
                border: `1px solid ${C.bd}`, background: 'transparent',
                color: C.ts, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              취소
            </button>
            <button
              onClick={saveForm}
              disabled={saving || !form.title.trim()}
              style={{
                padding: '7px 16px', borderRadius: 8,
                border: `1px solid ${C.ac}`, background: C.ac,
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: saving || !form.title.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', opacity: saving || !form.title.trim() ? 0.6 : 1,
              }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* Todo list */}
      {filteredTodos.length === 0 ? (
        <div style={{
          background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 12,
          padding: '40px 20px', textAlign: 'center', color: C.tt, fontSize: 14,
        }}>
          {todos.length === 0 ? '할 일을 추가해보세요' : '해당하는 항목이 없습니다'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredTodos.map(todo => {
            const pm = getPriorityMeta(todo.priority)
            const due = formatDueDate(todo.due_date)
            const isEditing = editId === todo.id && adding
            return (
              <div
                key={todo.id}
                style={{
                  background: C.sf,
                  border: `1px solid ${isEditing ? C.ac : C.bd}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  opacity: todo.completed ? 0.65 : 1,
                  transition: 'opacity .15s',
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleComplete(todo)}
                  style={{
                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                    border: `2px solid ${todo.completed ? C.su : C.bd}`,
                    background: todo.completed ? C.su : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  {todo.completed && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 500, color: C.tp,
                    textDecoration: todo.completed ? 'line-through' : 'none',
                    marginBottom: 4,
                  }}>
                    {todo.title}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Priority badge */}
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: pm.color, background: pm.bg,
                      padding: '1px 7px', borderRadius: 4,
                    }}>
                      {pm.label}
                    </span>
                    {/* Category badge */}
                    <span style={{
                      fontSize: 11, color: C.ts, background: C.sfh,
                      border: `1px solid ${C.bd}`, padding: '1px 7px', borderRadius: 4,
                    }}>
                      {todo.category}
                    </span>
                    {/* Due date */}
                    {due && (
                      <span style={{ fontSize: 11, color: due.color, fontWeight: 500 }}>
                        📅 {due.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                  <button onClick={() => startEdit(todo)} style={btnSm} title="수정">✏️</button>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    style={{ ...btnSm, color: C.dn }}
                    title="삭제"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Bulk clear completed */}
      {completedCount > 0 && filter !== 'active' && (
        <div style={{ marginTop: 14, textAlign: 'right' }}>
          <button
            onClick={async () => {
              const ids = todos.filter(t => t.completed).map(t => t.id)
              await supabase.from('teacher_todos').delete().in('id', ids)
              setTodos(prev => prev.filter(t => !t.completed))
            }}
            style={{
              fontSize: 12, color: C.ts, background: 'none',
              border: `1px solid ${C.bd}`, borderRadius: 6,
              padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            완료 항목 삭제 ({completedCount})
          </button>
        </div>
      )}
    </div>
  )
}

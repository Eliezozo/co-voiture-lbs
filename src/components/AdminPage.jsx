import { useCallback, useEffect, useState } from 'react'
import { Shield, Users } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState('')

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, token_balance, created_at')
      .order('created_at', { ascending: false })

    if (queryError) {
      setError(queryError.message)
      setUsers([])
    } else {
      setUsers(data || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const updateRole = async (userId, role) => {
    setSavingId(userId)
    setError('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)))
    }

    setSavingId('')
  }

  const updateTokens = async (userId, tokenValue) => {
    const safeValue = Number(tokenValue)
    if (Number.isNaN(safeValue) || safeValue < 0) return

    setSavingId(userId)
    setError('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ token_balance: safeValue })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
    } else {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, token_balance: safeValue } : u)))
    }

    setSavingId('')
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center">
          <Shield size={20} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Administration</h2>
          <p className="text-sm text-slate-500">Contrôle des utilisateurs (rôle et jetons)</p>
        </div>
      </section>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}

      <section className="bg-white border border-slate-200 rounded-2xl overflow-auto">
        {loading ? (
          <div className="p-4 text-sm text-slate-500">Chargement des utilisateurs...</div>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Utilisateur</th>
                <th className="text-left px-3 py-2">Email</th>
                <th className="text-left px-3 py-2">Rôle</th>
                <th className="text-left px-3 py-2">Jetons</th>
                <th className="text-left px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{user.full_name || '-'}</td>
                  <td className="px-3 py-2">{user.email}</td>
                  <td className="px-3 py-2">
                    <select
                      value={user.role}
                      onChange={(e) => updateRole(user.id, e.target.value)}
                      disabled={savingId === user.id}
                      className="px-2 py-1 border rounded-lg"
                    >
                      <option value="passager">passager</option>
                      <option value="conducteur">conducteur</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      defaultValue={user.token_balance}
                      disabled={savingId === user.id}
                      onBlur={(e) => updateTokens(user.id, e.target.value)}
                      className="w-24 px-2 py-1 border rounded-lg"
                    />
                  </td>
                  <td className="px-3 py-2 text-slate-500 inline-flex items-center gap-1">
                    <Users size={14} /> {savingId === user.id ? 'Mise à jour...' : 'OK'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

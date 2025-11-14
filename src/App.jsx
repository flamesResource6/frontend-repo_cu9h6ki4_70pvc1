import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function useLocalProfileId() {
  const [profileId, setProfileId] = useState(localStorage.getItem('profile_id') || '')
  useEffect(() => {
    if (profileId) localStorage.setItem('profile_id', profileId)
  }, [profileId])
  return [profileId, setProfileId]
}

function SignIn({ onAuthed }) {
  const [step, setStep] = useState('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sentCode, setSentCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestCode = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/auth/request-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
      })
      const data = await res.json()
      setSentCode(data.code)
      setStep('verify')
    } catch (e) {
      setError('Failed to send code')
    } finally { setLoading(false) }
  }

  const verifyCode = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code })
      })
      const data = await res.json()
      if (data.ok) {
        onAuthed(data.profile_id)
      } else {
        setError('Invalid code')
      }
    } catch (e) {
      setError('Invalid code')
    } finally { setLoading(false) }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Sign in</h2>
      {step === 'request' && (
        <div className="mt-4 space-y-3">
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" />
          <button disabled={loading} onClick={requestCode} className="w-full bg-indigo-600 text-white py-2 rounded">{loading ? 'Sending...' : 'Send code'}</button>
        </div>
      )}
      {step === 'verify' && (
        <div className="mt-4 space-y-3">
          <input value={code} onChange={e => setCode(e.target.value)} placeholder="Enter code" className="w-full border rounded px-3 py-2" />
          <button disabled={loading} onClick={verifyCode} className="w-full bg-indigo-600 text-white py-2 rounded">{loading ? 'Verifying...' : 'Verify'}</button>
          <p className="text-xs text-gray-500">Demo code: {sentCode}</p>
        </div>
      )}
      {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
    </div>
  )
}

function ProfileEditor({ profile, onChange, onSave }) {
  const [form, setForm] = useState(profile || { name: '', age: '', bio: '', gender: '', interests: '' })
  useEffect(() => setForm(profile || { name: '', age: '', bio: '', gender: '', interests: '' }), [profile])

  const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="p-4 space-y-3">
      <h3 className="font-semibold">Your profile</h3>
      <input value={form.name} onChange={e => setField('name', e.target.value)} placeholder="Name" className="w-full border rounded px-3 py-2" />
      <input value={form.age} onChange={e => setField('age', parseInt(e.target.value || ''))} placeholder="Age" type="number" className="w-full border rounded px-3 py-2" />
      <select value={form.gender} onChange={e => setField('gender', e.target.value)} className="w-full border rounded px-3 py-2">
        <option value="">Gender</option>
        <option>male</option>
        <option>female</option>
        <option>non-binary</option>
        <option>other</option>
      </select>
      <textarea value={form.bio} onChange={e => setField('bio', e.target.value)} placeholder="Bio" className="w-full border rounded px-3 py-2" />
      <input value={form.interests} onChange={e => setField('interests', e.target.value)} placeholder="Interests (comma separated)" className="w-full border rounded px-3 py-2" />
      <button onClick={() => onSave({ ...form, interests: String(form.interests || '').split(',').map(s => s.trim()).filter(Boolean) })} className="w-full bg-green-600 text-white py-2 rounded">Save</button>
    </div>
  )
}

function Card({ item, onLike, onPass }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 w-full max-w-sm mx-auto">
      <div className="h-64 bg-gray-100 rounded-xl mb-3 flex items-center justify-center text-4xl">{item.name?.[0] || '👤'}</div>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold text-lg">{item.name} {item.age ? `• ${item.age}` : ''}</div>
          <div className="text-sm text-gray-600 line-clamp-2">{item.bio}</div>
        </div>
        <div className="flex gap-3">
          <button onClick={onPass} className="h-12 w-12 rounded-full bg-gray-200">❌</button>
          <button onClick={onLike} className="h-12 w-12 rounded-full bg-pink-500 text-white">❤️</button>
        </div>
      </div>
    </div>
  )
}

function Deck({ me, onMatched }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`${API_BASE}/discover?profile_id=${me}`)
    const data = await res.json()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [me])

  const act = async (item, action) => {
    const res = await fetch(`${API_BASE}/swipe?profile_id=${me}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_id: item.id, action }) })
    const data = await res.json()
    setItems(prev => prev.filter(x => x.id !== item.id))
    if (data.match) onMatched(data.match_id)
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Loading…</div>
  if (!items.length) return <div className="p-6 text-center text-gray-500">No more profiles right now</div>

  const current = items[0]
  return <Card item={current} onLike={() => act(current, 'like')} onPass={() => act(current, 'pass')} />
}

function Matches({ me, onOpenChat }) {
  const [items, setItems] = useState([])
  useEffect(() => { (async () => {
    const res = await fetch(`${API_BASE}/matches?profile_id=${me}`)
    setItems(await res.json())
  })() }, [me])
  return (
    <div className="p-4 grid grid-cols-2 gap-3">
      {items.map(m => (
        <button key={m.id} onClick={() => onOpenChat(m)} className="bg-white rounded-xl shadow p-3 text-left">
          <div className="h-24 bg-gray-100 rounded mb-2" />
          <div className="font-semibold">{m.other?.name}</div>
          <div className="text-xs text-gray-500">Tap to chat</div>
        </button>
      ))}
    </div>
  )
}

function Chat({ match, me, onBack }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')

  const load = async () => {
    const res = await fetch(`${API_BASE}/messages?match_id=${match.id}`)
    setMessages(await res.json())
  }

  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t) }, [match.id])

  const send = async () => {
    if (!text.trim()) return
    await fetch(`${API_BASE}/messages?match_id=${match.id}&sender_id=${me}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
    setText('')
    load()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center gap-3">
        <button onClick={onBack} className="px-2 py-1 rounded bg-gray-100">Back</button>
        <div className="font-semibold">Chat with {match.other?.name}</div>
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {messages.map(m => (
          <div key={m.id} className={`max-w-[75%] px-3 py-2 rounded-2xl ${m.sender_id === me ? 'bg-pink-500 text-white ml-auto' : 'bg-gray-100'}`}>{m.text}</div>
        ))}
      </div>
      <div className="p-3 border-t flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message" className="flex-1 border rounded px-3 py-2" />
        <button onClick={send} className="bg-indigo-600 text-white px-4 rounded">Send</button>
      </div>
    </div>
  )
}

function App() {
  const [profileId, setProfileId] = useLocalProfileId()
  const [me, setMe] = useState(null)
  const [tab, setTab] = useState('discover')
  const [activeMatch, setActiveMatch] = useState(null)

  useEffect(() => {
    const fetchMe = async () => {
      if (!profileId) return
      const res = await fetch(`${API_BASE}/profiles/me?profile_id=${profileId}`)
      const data = await res.json()
      setMe(data)
    }
    fetchMe()
  }, [profileId])

  const saveProfile = async (patch) => {
    const res = await fetch(`${API_BASE}/profiles/me?profile_id=${profileId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    const data = await res.json()
    setMe(data)
  }

  if (!profileId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 text-center">
            <div className="text-3xl font-bold">Spark</div>
            <p className="text-gray-500 mt-1">Find your people</p>
          </div>
          <SignIn onAuthed={setProfileId} />
        </div>
      </div>
    )
  }

  if (!me) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-bold">Spark</div>
          <div className="flex gap-2">
            <button onClick={() => setTab('discover')} className={`px-3 py-1 rounded ${tab==='discover'?'bg-gray-900 text-white':'bg-gray-100'}`}>Discover</button>
            <button onClick={() => setTab('matches')} className={`px-3 py-1 rounded ${tab==='matches'?'bg-gray-900 text-white':'bg-gray-100'}`}>Matches</button>
            <button onClick={() => setTab('profile')} className={`px-3 py-1 rounded ${tab==='profile'?'bg-gray-900 text-white':'bg-gray-100'}`}>Profile</button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto min-h-[calc(100vh-3.5rem)]">
        {tab === 'discover' && <div className="p-4"><Deck me={profileId} onMatched={(id)=>{ setTab('matches') }} /></div>}
        {tab === 'matches' && !activeMatch && <Matches me={profileId} onOpenChat={(m)=>{ setActiveMatch(m) }} />}
        {tab === 'matches' && activeMatch && <div className="h-[calc(100vh-3.5rem)]"><Chat match={activeMatch} me={profileId} onBack={()=>setActiveMatch(null)} /></div>}
        {tab === 'profile' && <ProfileEditor profile={me} onSave={saveProfile} />}
      </div>
    </div>
  )
}

export default App

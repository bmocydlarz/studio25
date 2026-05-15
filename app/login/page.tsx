"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })

    if (res.ok) {
      router.push('/admin') // Redirige vers ton agenda après connexion
    } else {
      setError('Mot de passe incorrect')
    }
    setLoading(false)
  }

  return (
    <div className="bg-orbs" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      
      <div className="booking-wrap glass" style={{ width: '100%', maxWidth: '400px', padding: '3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 className="serif" style={{ fontSize: '2.2rem' }}>Espace <em>Admin</em></h2>
            <p style={{ color: 'var(--text-soft)', marginTop: '0.5rem' }}>Accès réservé à Studiio.25</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="field-group">
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mot de passe</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              style={{ padding: '14px', borderRadius: '12px', border: '1.5px solid var(--border)', width: '100%', marginTop: '8px' }}
              required 
            />
          </div>

          {error && <p style={{ color: '#c94040', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}

          <button 
            type="submit" 
            className={`btn-submit ${loading ? 'loading' : ''}`} 
            disabled={loading}
            style={{ marginTop: '2rem', width: '100%' }}
          >
            <span className="btn-text">Se connecter</span>
            <span className="btn-loader">Connexion...</span>
          </button>
        </form>

        <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>
            ← Retour au site
        </a>
      </div>
    </div>
  )
}
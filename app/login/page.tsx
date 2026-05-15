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

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      if (res.ok) {
        router.push('/admin') 
      } else {
        setError('Mot de passe incorrect')
      }
    } catch (err) {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative',
      background: '#fcfaf8',
      overflow: 'hidden'
    }}>
      {/* Background Orbs avec z-index bas pour ne pas bloquer les clics */}
      <div className="bg-orbs" style={{ zIndex: 0 }}>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>
      
      <div className="booking-wrap glass" style={{ 
        width: '90%', 
        maxWidth: '400px', 
        padding: '3rem', 
        position: 'relative', 
        zIndex: 10, // On s'assure que le formulaire est au-dessus de tout
        boxShadow: '0 20px 40px rgba(0,0,0,0.05)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 className="serif" style={{ fontSize: '2.2rem', color: '#4a3f35' }}>Espace <em>Admin</em></h2>
            <p style={{ color: '#8c7e71', marginTop: '0.5rem' }}>Accès réservé à Studiio.25</p>
        </div>

        <form onSubmit={handleLogin} style={{ position: 'relative', zIndex: 20 }}>
          <div className="field-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ 
              display: 'block',
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: '#8c7e71', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              marginBottom: '8px'
            }}>
              Mot de passe
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              style={{ 
                padding: '14px', 
                borderRadius: '12px', 
                border: '1.5px solid #e2d9d1', 
                width: '100%', 
                outline: 'none',
                fontSize: '1rem',
                backgroundColor: 'rgba(255,255,255,0.8)',
                color: '#4a3f35'
              }}
              autoFocus
              required 
            />
          </div>

          {error && (
            <p style={{ 
              color: '#c94040', 
              fontSize: '0.85rem', 
              marginBottom: '1rem', 
              textAlign: 'center',
              fontWeight: 500 
            }}>
              {error}
            </p>
          )}

          <button 
            type="submit" 
            className={`btn-submit ${loading ? 'loading' : ''}`} 
            disabled={loading}
            style={{ 
              marginTop: '1rem', 
              width: '100%',
              cursor: 'pointer',
              position: 'relative',
              zIndex: 30
            }}
          >
            <span className="btn-text">{loading ? 'Connexion...' : 'Se connecter'}</span>
          </button>
        </form>

        <a href="/" style={{ 
          display: 'block', 
          textAlign: 'center', 
          marginTop: '1.5rem', 
          color: '#8c7e71', 
          fontSize: '0.9rem', 
          textDecoration: 'none',
          transition: 'color 0.2s'
        }}>
            ← Retour au site
        </a>
      </div>
    </div>
  )
}
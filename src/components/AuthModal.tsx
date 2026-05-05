import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { X, Mail, Lock, Cloud } from 'lucide-react'
import { AuthState } from '../hooks/useAuth'

interface AuthModalProps {
  auth: AuthState
  onClose: () => void
  onSuccess: () => void
}

export function AuthModal({ auth, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'signin') {
        await auth.signIn(email, password)
      } else {
        await auth.signUp(email, password)
      }
      setEmail('')
      setPassword('')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surf1 border border-border rounded-3xl p-8 max-w-sm w-full shadow-2xl"
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center text-gold">
              <Cloud size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif">
                {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
              </h2>
              <p className="text-[10px] text-text-dark uppercase tracking-widest">Cloud Storage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-text-dark hover:text-text rounded-lg hover:bg-surf2 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-text-dark uppercase mb-1">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dark" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-surf2 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:border-gold outline-none transition-colors"
                placeholder="vous@exemple.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-dark uppercase mb-1">Mot de passe</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dark" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-surf2 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:border-gold outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red/10 border border-red/20 rounded-xl text-red text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gold text-bg font-bold rounded-xl hover:bg-gold-light transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(null) }}
            className="text-xs text-text-dim hover:text-gold transition-colors"
          >
            {mode === 'signin' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

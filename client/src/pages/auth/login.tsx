import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'
import { Mail, Lock, Eye, EyeOff, Shield, AlertCircle } from 'lucide-react'
import { FaGoogle } from 'react-icons/fa'

export default function LoginPage() {
  const [, setLocation] = useLocation()
  const { signIn, signInWithGoogle, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setError('Email e senha são obrigatórios')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await signIn(email, password)
      
      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos')
        } else if (error.message?.includes('Email not confirmed')) {
          setError('Por favor, confirme seu email antes de fazer login')
        } else {
          setError('Erro ao fazer login. Tente novamente.')
        }
      } else {
        setLocation('/home')
      }
    } catch (error) {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const { error } = await signInWithGoogle()
      
      if (error) {
        setError('Erro ao fazer login com Google. Tente novamente.')
      }
    } catch (error) {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">DPO Fast</h1>
          <p className="text-gray-400 mt-2">Plataforma de Conformidade LGPD</p>
        </div>

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm" data-testid="login-form">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-white text-center">
              Fazer Login
            </CardTitle>
            <CardDescription className="text-gray-400 text-center">
              Acesse sua conta para gerenciar a conformidade LGPD
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert className="bg-red-900/20 border-red-500 text-red-200" data-testid="error-message">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                    disabled={loading}
                    data-testid="input-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                    disabled={loading}
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
                data-testid="button-login"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-800 px-2 text-gray-400">Ou continue com</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              className="w-full bg-gray-700/50 border-gray-600 text-white hover:bg-gray-600"
              disabled={loading}
              data-testid="button-google-login"
            >
              <FaGoogle className="mr-2 h-4 w-4" />
              {loading ? 'Conectando...' : 'Entrar com Google'}
            </Button>

            <div className="text-center space-y-2">
              <Link href="/register" className="text-blue-400 hover:text-blue-300 text-sm">
                Não tem uma conta? Criar conta
              </Link>
              <br />
              <Link href="/forgot-password" className="text-gray-400 hover:text-white text-sm">
                Esqueceu sua senha?
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Ao fazer login, você concorda com nossos</p>
          <div className="space-x-4 mt-1">
            <Link href="/terms" className="hover:text-gray-400">Termos de Uso</Link>
            <Link href="/privacy" className="hover:text-gray-400">Política de Privacidade</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
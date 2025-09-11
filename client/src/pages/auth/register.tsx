import { useState } from 'react'
import { Link, useLocation } from 'wouter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuth } from '@/hooks/useAuth'
import { Mail, Lock, Eye, EyeOff, Shield, AlertCircle, User, CheckCircle } from 'lucide-react'
import { FaGoogle } from 'react-icons/fa'

export default function RegisterPage() {
  const [, setLocation] = useLocation()
  const { signUp, signInWithGoogle, isLoading } = useAuth()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      setError('Nome é obrigatório')
      return false
    }
    
    if (!formData.lastName.trim()) {
      setError('Sobrenome é obrigatório')
      return false
    }

    if (!formData.email.trim()) {
      setError('Email é obrigatório')
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Email inválido')
      return false
    }

    if (formData.password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Senhas não coincidem')
      return false
    }

    return true
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await signUp(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      )
      
      if (error) {
        if (error.message?.includes('User already registered')) {
          setError('Este email já está cadastrado. Tente fazer login.')
        } else if (error.message?.includes('Password should be at least')) {
          setError('Senha deve ter pelo menos 6 caracteres')
        } else {
          setError('Erro ao criar conta. Tente novamente.')
        }
      } else {
        setSuccess('Conta criada com sucesso! Verifique seu email para confirmação.')
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: ''
        })
      }
    } catch (error) {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await signInWithGoogle()
      
      if (error) {
        setError('Erro ao cadastrar com Google. Tente novamente.')
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

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm" data-testid="register-form">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-white text-center">
              Criar Conta
            </CardTitle>
            <CardDescription className="text-gray-400 text-center">
              Registre-se para começar a gerenciar sua conformidade LGPD
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert className="bg-red-900/20 border-red-500 text-red-200" data-testid="error-message">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-900/20 border-green-500 text-green-200" data-testid="success-message">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-white">Nome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Nome"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                      disabled={loading}
                      data-testid="input-firstname"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-white">Sobrenome</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Sobrenome"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                      disabled={loading}
                      data-testid="input-lastname"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
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
                    placeholder="Mínimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repita sua senha"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                    disabled={loading}
                    data-testid="input-confirm-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white"
                    disabled={loading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
                data-testid="button-register"
              >
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-gray-600" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-gray-800 px-2 text-gray-400">Ou cadastre-se com</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleSignUp}
              variant="outline"
              className="w-full bg-gray-700/50 border-gray-600 text-white hover:bg-gray-600"
              disabled={loading}
              data-testid="button-google-signup"
            >
              <FaGoogle className="mr-2 h-4 w-4" />
              {loading ? 'Conectando...' : 'Cadastrar com Google'}
            </Button>

            <div className="text-center">
              <Link href="/login" className="text-blue-400 hover:text-blue-300 text-sm">
                Já tem uma conta? Fazer login
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Ao criar uma conta, você concorda com nossos</p>
          <div className="space-x-4 mt-1">
            <Link href="/terms" className="hover:text-gray-400">Termos de Uso</Link>
            <Link href="/privacy" className="hover:text-gray-400">Política de Privacidade</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
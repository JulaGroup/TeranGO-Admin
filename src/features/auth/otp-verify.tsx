import { useState, useRef, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, ShieldCheck, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { fetchVendorProfile } from '@/lib/vendor'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export function OTPVerify() {
  const navigate = useNavigate()
  const [otp, setOtp] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus()
  }, [])

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1)
    }

    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 4)

    if (!/^\d+$/.test(pastedData)) return

    const newOtp = [...otp]
    for (let i = 0; i < pastedData.length && i < 4; i++) {
      newOtp[i] = pastedData[i]
    }
    setOtp(newOtp)

    // Focus last filled input or next empty one
    const nextIndex = Math.min(pastedData.length, 3)
    inputRefs.current[nextIndex]?.focus()
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    const code = otp.join('')
    if (code.length !== 4) {
      toast.error('Please enter the complete 4-digit OTP')
      return
    }

    const phone = localStorage.getItem('temp_phone')
    if (!phone) {
      toast.error('Phone number not found. Please start over.')
      navigate({ to: '/sign-in' })
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/verify-otp', {
        phone,
        code,
      })

      const { token } = response.data

      // Store authentication token first
      localStorage.setItem('auth_token', token)
      localStorage.removeItem('temp_phone')

      // First decode token to get userId
      const tokenParts = token.split('.')
      if (tokenParts.length !== 3) {
        toast.error('Invalid token format')
        localStorage.clear()
        navigate({ to: '/sign-in' })
        return
      }

      const payload = JSON.parse(atob(tokenParts[1]))
      const userId = payload.userId

      if (!userId) {
        toast.error('User ID not found in token')
        localStorage.clear()
        navigate({ to: '/sign-in' })
        return
      }

      // Fetch complete user profile from database (same as mobile app)
      try {
        const profileResponse = await api.get(`/api/users/${userId}/profile`)
        const profileData = profileResponse.data
        const userData = profileData.user

        if (!userData) {
          toast.error('User data not found')
          localStorage.clear()
          navigate({ to: '/sign-in' })
          return
        }

        // Store complete user data
        localStorage.setItem('user', JSON.stringify(userData))

        // Preload vendor profile so dashboard has data immediately
        if (userData.role === 'VENDOR' && userId) {
          try {
            await fetchVendorProfile(userId)
          } catch (_vendorError) {
            toast.warning(
              'Unable to load vendor details. Some data may be missing until refresh.'
            )
          }
        }

        toast.success('Login successful!')

        // Redirect based on user role from database
        if (userData.role === 'ADMIN' || userData.role === 'SUPER_ADMIN') {
          navigate({ to: '/' })
        } else if (userData.role === 'VENDOR') {
          navigate({ to: '/vendor/dashboard' })
        } else {
          toast.error('Unauthorized access - Admin or Vendor role required')
          localStorage.clear()
          navigate({ to: '/sign-in' })
        }
      } catch (_profileError) {
        toast.error('Failed to load user profile. Please try again.')
        localStorage.clear()
        navigate({ to: '/sign-in' })
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(
        err.response?.data?.message || 'Invalid OTP. Please try again.'
      )
      setOtp(['', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    const phone = localStorage.getItem('temp_phone')
    if (!phone) {
      toast.error('Phone number not found')
      navigate({ to: '/sign-in' })
      return
    }

    try {
      await api.post('/auth/send-otp', { phone })
      toast.success('OTP resent successfully')
      setOtp(['', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch {
      toast.error('Failed to resend OTP')
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-linear-to-br from-orange-50 via-white to-orange-50 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1 text-center'>
          <div className='mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-orange-500 to-red-500'>
            <ShieldCheck className='h-10 w-10 text-white' />
          </div>
          <CardTitle className='text-3xl font-bold tracking-tight'>
            Enter OTP
          </CardTitle>
          <CardDescription className='text-base'>
            We sent a 4-digit code to your phone number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOTP} className='space-y-6'>
            <div className='flex justify-center gap-3'>
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el
                  }}
                  type='text'
                  inputMode='numeric'
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={loading}
                  className='h-14 w-14 text-center text-2xl font-semibold'
                />
              ))}
            </div>

            <Button
              type='submit'
              className='w-full bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
              disabled={loading || otp.some((d) => !d)}
              size='lg'
            >
              {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>

            <div className='flex flex-col gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={handleResendOTP}
                disabled={loading}
                className='w-full'
              >
                Resend OTP
              </Button>

              <Button
                type='button'
                variant='ghost'
                onClick={() => navigate({ to: '/sign-in' })}
                disabled={loading}
                className='w-full'
              >
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to Sign In
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

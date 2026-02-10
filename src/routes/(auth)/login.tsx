import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/(auth)/login')({
  component: LoginPage,
  beforeLoad: () => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      throw redirect({ to: '/' })
    }
  },
})

function LoginPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    if (phone.length < 7) {
      toast.error('Please enter a valid phone number')
      return
    }

    setLoading(true)

    try {
      const fullPhone = `+220${phone}`

      await api.post('/auth/send-otp', {
        phone: fullPhone,
      })

      // Store phone number for OTP verification
      localStorage.setItem('temp_phone', fullPhone)

      toast.success('OTP sent to your phone number')

      // Navigate to OTP verification page
      navigate({ to: '/otp' })
    } catch (error: unknown) {
      const err = error as {
        response?: { status?: number; data?: { message?: string } }
      }

      if (err.response?.status === 429) {
        toast.error(
          'Too many requests. Please wait a few minutes before trying again.'
        )
      } else {
        toast.error(
          err.response?.data?.message || 'Failed to send OTP. Please try again.'
        )
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-linear-to-br from-orange-50 via-white to-orange-50 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='space-y-1 text-center'>
          <div className='mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-orange-500 to-red-500'>
            <Phone className='h-10 w-10 text-white' />
          </div>
          <CardTitle className='text-3xl font-bold tracking-tight'>
            TeranGO Portal
          </CardTitle>
          <CardDescription className='text-base'>
            Enter your phone number to receive an OTP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendOTP} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='phone'>Phone Number</Label>
              <div className='flex gap-2'>
                <div className='bg-muted flex items-center gap-2 rounded-md border px-3 py-2'>
                  <span className='text-lg'>🇬🇲</span>
                  <span className='font-medium'>+220</span>
                </div>
                <Input
                  id='phone'
                  placeholder='Enter phone number'
                  type='tel'
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  className='flex-1 text-lg'
                  autoFocus
                  maxLength={7}
                />
              </div>
              <p className='text-muted-foreground text-xs'>
                We'll send you a 4-digit verification code
              </p>
            </div>

            <Button
              type='submit'
              className='w-full bg-linear-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
              disabled={loading || phone.length < 7}
              size='lg'
            >
              {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          </form>

          <div className='text-muted-foreground mt-6 text-center text-sm'>
            <p>For Admin and Vendor access</p>
            <p className='mt-1 text-xs'>
              Only Gambian phone numbers (+220) are accepted
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

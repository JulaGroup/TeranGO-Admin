import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/(auth)/unauthorized')({
  component: UnauthorizedPage,
})

function UnauthorizedPage() {
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate({ to: '/login' })
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4'>
      <Card className='w-full max-w-md text-center'>
        <CardHeader>
          <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100'>
            <ShieldAlert className='h-8 w-8 text-red-600' />
          </div>
          <CardTitle className='text-2xl font-bold'>Access Denied</CardTitle>
          <CardDescription>
            You do not have permission to access this resource
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <p className='text-muted-foreground text-sm'>
            This area is restricted to authorized users only. Please contact
            your administrator if you believe this is an error.
          </p>
          <Button onClick={handleGoBack} className='w-full'>
            Return to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/(auth)/sign-in-2')({
  component: SignIn2Page,
})

function SignIn2Page() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Sign In (Alternative)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Please use the main login page.
        </p>
        <Button asChild>
          <Link to="/login">Go to Login</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

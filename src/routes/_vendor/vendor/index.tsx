import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_vendor/vendor/')({
  beforeLoad: () => {
    throw redirect({ to: '/vendor/dashboard' })
  },
})

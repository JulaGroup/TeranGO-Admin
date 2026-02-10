import { createFileRoute } from '@tanstack/react-router'
import { OTPVerify } from '@/features/auth/otp-verify'

export const Route = createFileRoute('/(auth)/otp')({
  component: OTPVerify,
})

import { useState } from 'react'
import { format } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Send,
  Megaphone,
  Users,
  TrendingUp,
  Calendar,
  Eye,
  Trash2,
  Plus,
  //   Filter,
  //   BarChart3,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

export const Route = createFileRoute('/_authenticated/admin/broadcasts/')({
  component: BroadcastsPage,
})

const topNav = [
  { title: 'Broadcasts', href: '/admin/broadcasts', isActive: true },
  { title: 'Analytics', href: '/admin/broadcasts/analytics', isActive: false },
]

interface Broadcast {
  id: string
  type: string
  title: string
  body: string
  targetAudience: string
  sentCount: number
  failureCount: number
  scheduledFor: string
  sentAt: string
  createdAt: string
  metadata?: Record<string, unknown>
}

const BROADCAST_TYPES = [
  {
    value: 'MARKETING',
    label: '📢 Marketing',
    icon: Megaphone,
    color: 'bg-blue-500',
  },
  {
    value: 'DEAL',
    label: '🎁 Special Offer',
    icon: TrendingUp,
    color: 'bg-green-500',
  },
  {
    value: 'ANNOUNCEMENT',
    label: '📣 Announcement',
    icon: Users,
    color: 'bg-purple-500',
  },
  { value: 'ALERT', label: '⚠️ Alert', icon: Send, color: 'bg-orange-500' },
  { value: 'SYSTEM', label: '⚙️ System', icon: Calendar, color: 'bg-gray-500' },
]

const TARGET_AUDIENCES = [
  {
    value: 'ALL',
    label: 'All Users',
    description: 'Send to everyone',
    icon: Users,
  },
  {
    value: 'CUSTOMERS',
    label: 'Customers Only',
    description: 'Only customer app users',
    icon: Users,
  },
  {
    value: 'DRIVERS',
    label: 'Drivers Only',
    description: 'Only delivery drivers',
    icon: Users,
  },
  {
    value: 'HIGH_VALUE',
    label: 'High-Value Customers',
    description: '5+ orders',
    icon: TrendingUp,
  },
  {
    value: 'NEW',
    label: 'New Users',
    description: 'Joined in last 7 days',
    icon: Calendar,
  },
]

function BroadcastsPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(
    null
  )

  // Form state
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('MARKETING')
  const [targetAudience, setTargetAudience] = useState('ALL')

  // Fetch broadcasts
  const { data: broadcastsData, isLoading } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: async () => {
      const response = await api.get('/api/admin/broadcasts')
      return response.data
    },
  })

  // Fetch analytics summary
  const { data: analyticsData } = useQuery({
    queryKey: ['broadcasts-analytics'],
    queryFn: async () => {
      const response = await api.get('/api/admin/broadcasts/analytics/summary')
      return response.data
    },
  })

  const broadcasts: Broadcast[] = broadcastsData?.broadcasts || []
  const analytics = analyticsData?.summary || {
    totalBroadcasts: 0,
    totalSent: 0,
    avgDeliveryRate: 0,
    avgOpenRate: 0,
  }

  // Create broadcast mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      title: string
      body: string
      type: string
      targetAudience: string
      metadata: Record<string, unknown>
    }) => {
      const response = await api.post('/api/admin/broadcasts', data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
      queryClient.invalidateQueries({ queryKey: ['broadcasts-analytics'] })
      toast.success('Broadcast sent successfully!', {
        description: `Sent to ${data.summary?.successCount || 0} users`,
      })
      setCreateOpen(false)
      resetForm()
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error && 'response' in error
          ? (error as { response?: { data?: { error?: string } } }).response
              ?.data?.error
          : 'Please try again'
      toast.error('Failed to send broadcast', {
        description: errorMessage || 'Please try again',
      })
    },
  })

  // Delete broadcast mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/broadcasts/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] })
      toast.success('Broadcast deleted')
      setDetailsOpen(false)
    },
  })

  const resetForm = () => {
    setTitle('')
    setBody('')
    setType('MARKETING')
    setTargetAudience('ALL')
  }

  const handleCreate = () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    createMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      type,
      targetAudience,
      metadata: {},
    })
  }

  const getBroadcastTypeInfo = (type: string) => {
    return BROADCAST_TYPES.find((t) => t.value === type) || BROADCAST_TYPES[0]
  }

  const getAudienceInfo = (audience: string) => {
    return (
      TARGET_AUDIENCES.find((a) => a.value === audience) || TARGET_AUDIENCES[0]
    )
  }

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Broadcast Notifications
            </h1>
            <p className='text-muted-foreground'>
              Send marketing campaigns and announcements to your users
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} size='lg'>
            <Plus className='mr-2 h-4 w-4' />
            New Broadcast
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className='mb-6 grid gap-4 md:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Broadcasts
              </CardTitle>
              <Megaphone className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {analytics.totalBroadcasts}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Total Sent</CardTitle>
              <Send className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {analytics.totalSent?.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Avg Delivery Rate
              </CardTitle>
              <CheckCircle className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {analytics.avgDeliveryRate}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Avg Open Rate
              </CardTitle>
              <Eye className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{analytics.avgOpenRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Broadcasts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Broadcast History</CardTitle>
            <CardDescription>
              View and manage your notification campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='flex h-40 items-center justify-center'>
                <div className='text-muted-foreground'>
                  Loading broadcasts...
                </div>
              </div>
            ) : broadcasts.length === 0 ? (
              <div className='flex h-40 flex-col items-center justify-center'>
                <Megaphone className='text-muted-foreground mb-2 h-12 w-12' />
                <p className='text-muted-foreground'>No broadcasts sent yet</p>
                <Button variant='link' onClick={() => setCreateOpen(true)}>
                  Send your first broadcast
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcasts.map((broadcast) => {
                    const typeInfo = getBroadcastTypeInfo(broadcast.type)
                    const audienceInfo = getAudienceInfo(
                      broadcast.targetAudience
                    )
                    return (
                      <TableRow key={broadcast.id}>
                        <TableCell>
                          <Badge className={typeInfo.color}>
                            {typeInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className='font-medium'>{broadcast.title}</div>
                            <div className='text-muted-foreground line-clamp-1 text-sm'>
                              {broadcast.body}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline'>{audienceInfo.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center'>
                            <CheckCircle className='mr-1 h-4 w-4 text-green-500' />
                            {broadcast.sentCount.toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          {broadcast.failureCount > 0 ? (
                            <div className='flex items-center'>
                              <XCircle className='mr-1 h-4 w-4 text-red-500' />
                              {broadcast.failureCount}
                            </div>
                          ) : (
                            <span className='text-muted-foreground'>-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center text-sm'>
                            <Clock className='mr-1 h-3 w-3' />
                            {format(
                              new Date(broadcast.sentAt || broadcast.createdAt),
                              'MMM dd, HH:mm'
                            )}
                          </div>
                        </TableCell>
                        <TableCell className='text-right'>
                          <div className='flex justify-end gap-2'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => {
                                setSelectedBroadcast(broadcast)
                                setDetailsOpen(true)
                              }}
                            >
                              <Eye className='h-4 w-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() =>
                                deleteMutation.mutate(broadcast.id)
                              }
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Broadcast Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className='max-w-2xl'>
            <DialogHeader>
              <DialogTitle>Create New Broadcast</DialogTitle>
              <DialogDescription>
                Send a notification to your users. Choose your audience and
                craft your message.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-4'>
              {/* Broadcast Type */}
              <div className='space-y-2'>
                <Label htmlFor='type'>Broadcast Type *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BROADCAST_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Audience */}
              <div className='space-y-2'>
                <Label htmlFor='audience'>Target Audience *</Label>
                <Select
                  value={targetAudience}
                  onValueChange={setTargetAudience}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_AUDIENCES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        <div>
                          <div className='font-medium'>{a.label}</div>
                          <div className='text-muted-foreground text-xs'>
                            {a.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className='space-y-2'>
                <Label htmlFor='title'>Notification Title *</Label>
                <Input
                  id='title'
                  placeholder='e.g., 🎉 Flash Sale: 30% Off All Orders!'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
                <p className='text-muted-foreground text-xs'>
                  {title.length}/100 characters
                </p>
              </div>

              {/* Body */}
              <div className='space-y-2'>
                <Label htmlFor='body'>Notification Message *</Label>
                <Textarea
                  id='body'
                  placeholder='e.g., Limited time only! Get 30% off your order. Use code FLASH30 at checkout. Hurry, ends tonight!'
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={200}
                />
                <p className='text-muted-foreground text-xs'>
                  {body.length}/200 characters
                </p>
              </div>

              {/* Preview */}
              {title && body && (
                <div className='bg-muted/50 rounded-lg border p-4'>
                  <p className='text-muted-foreground mb-2 text-sm font-medium'>
                    Preview:
                  </p>
                  <div className='bg-background rounded-md p-3 shadow-sm'>
                    <div className='flex items-start gap-3'>
                      <div className='bg-primary rounded-full p-2'>
                        <Megaphone className='text-primary-foreground h-4 w-4' />
                      </div>
                      <div className='flex-1'>
                        <p className='font-semibold'>{title}</p>
                        <p className='text-muted-foreground mt-1 text-sm'>
                          {body}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant='outline' onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  createMutation.isPending || !title.trim() || !body.trim()
                }
              >
                {createMutation.isPending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className='mr-2 h-4 w-4' />
                    Send Broadcast
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Broadcast Details Dialog */}
        {selectedBroadcast && (
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Broadcast Details</DialogTitle>
              </DialogHeader>

              <div className='space-y-4'>
                <div>
                  <Label>Type</Label>
                  <Badge
                    className={
                      getBroadcastTypeInfo(selectedBroadcast.type).color
                    }
                  >
                    {getBroadcastTypeInfo(selectedBroadcast.type).label}
                  </Badge>
                </div>

                <div>
                  <Label>Target Audience</Label>
                  <p className='text-sm'>
                    {getAudienceInfo(selectedBroadcast.targetAudience).label}
                  </p>
                </div>

                <div>
                  <Label>Title</Label>
                  <p className='text-sm'>{selectedBroadcast.title}</p>
                </div>

                <div>
                  <Label>Message</Label>
                  <p className='text-sm'>{selectedBroadcast.body}</p>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <Label>Sent</Label>
                    <p className='text-2xl font-bold text-green-600'>
                      {selectedBroadcast.sentCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label>Failed</Label>
                    <p className='text-2xl font-bold text-red-600'>
                      {selectedBroadcast.failureCount}
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Sent At</Label>
                  <p className='text-sm'>
                    {format(
                      new Date(
                        selectedBroadcast.sentAt || selectedBroadcast.createdAt
                      ),
                      'PPpp'
                    )}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant='outline' onClick={() => setDetailsOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </Main>
    </>
  )
}

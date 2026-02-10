import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Clock,
  CheckCircle,
  XCircle,
  Users,
  FileText,
  RefreshCw,
  Search,
  Eye,
  Building2,
  Mail,
  Phone,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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

interface VendorApplication {
  id: string
  businessName: string
  businessType: 'RESTAURANT' | 'SHOP' | 'PHARMACY'
  description?: string
  businessAddress: string
  businessPhone?: string
  businessEmail?: string
  experience?: string
  documents?: Record<string, unknown>
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WAITING_LIST'
  reviewNotes?: string
  createdAt: string
  updatedAt: string
  reviewedAt?: string
  user: {
    id: string
    fullName: string | null
    email: string | null
    phone: string
  }
  category?: {
    id: string
    name: string
  } | null
}

interface ApplicationStats {
  total: number
  pending: number
  approved: number
  rejected: number
  waitingList: number
}

export const Route = createFileRoute(
  '/_authenticated/admin/vendor-applications/'
)({
  component: VendorApplicationsPage,
})

function VendorApplicationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedApplication, setSelectedApplication] =
    useState<VendorApplication | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject'
    applicationId: string
    businessName: string
  } | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const queryClient = useQueryClient()

  const {
    data: applicationsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['vendor-applications', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all')
        params.append('status', statusFilter.toUpperCase())
      params.append('limit', '100')

      const response = await api.get(
        `/api/vendor-applications/admin/all?${params}`
      )
      return response.data.applications as VendorApplication[]
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['vendor-applications-stats'],
    queryFn: async () => {
      try {
        const response = await api.get(`/api/vendor-applications/admin/stats`)
        return response.data.stats as ApplicationStats
      } catch {
        // Fallback to calculated stats from applications
        const apps = applicationsData || []
        return {
          total: apps.length,
          pending: apps.filter((a) => a.status === 'PENDING').length,
          approved: apps.filter((a) => a.status === 'APPROVED').length,
          rejected: apps.filter((a) => a.status === 'REJECTED').length,
          waitingList: apps.filter((a) => a.status === 'WAITING_LIST').length,
        }
      }
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      applicationId,
      status,
      notes,
    }: {
      applicationId: string
      status: VendorApplication['status']
      notes?: string
    }) => {
      const response = await api.patch(
        `/api/vendor-applications/admin/${applicationId}/status`,
        { status, reviewNotes: notes }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-applications'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-applications-stats'] })
      toast.success('Application status updated successfully')
      setShowDetailsDialog(false)
      setShowConfirmDialog(false)
      setReviewNotes('')
      setConfirmAction(null)
    },
    onError: () => {
      toast.error('Failed to update application status')
      setShowConfirmDialog(false)
    },
  })

  const filteredApplications = applicationsData?.filter((app) => {
    const matchesSearch =
      app.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.user.fullName &&
        app.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.user.email &&
        app.user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      app.businessType.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === 'all' || app.status === statusFilter.toUpperCase()

    return matchesSearch && matchesStatus
  })

  const handleApprove = (application: VendorApplication) => {
    setConfirmAction({
      type: 'approve',
      applicationId: application.id,
      businessName: application.businessName,
    })
    setShowConfirmDialog(true)
  }

  const handleReject = (application: VendorApplication) => {
    setConfirmAction({
      type: 'reject',
      applicationId: application.id,
      businessName: application.businessName,
    })
    setShowConfirmDialog(true)
  }

  const handleWaitingList = (application: VendorApplication) => {
    updateStatusMutation.mutate({
      applicationId: application.id,
      status: 'WAITING_LIST',
      notes: reviewNotes || 'Moved to waiting list',
    })
  }

  const handleConfirmAction = () => {
    if (!confirmAction) return

    const { type, applicationId } = confirmAction

    if (type === 'approve') {
      updateStatusMutation.mutate({
        applicationId,
        status: 'APPROVED',
        notes: reviewNotes || 'Application approved',
      })
    } else if (type === 'reject') {
      updateStatusMutation.mutate({
        applicationId,
        status: 'REJECTED',
        notes: reviewNotes || 'Application rejected',
      })
    }
  }

  const getStatusBadge = (status: VendorApplication['status']) => {
    const variants = {
      APPROVED: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      REJECTED: { color: 'bg-red-100 text-red-700', icon: XCircle },
      WAITING_LIST: { color: 'bg-blue-100 text-blue-700', icon: Eye },
      PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    }

    const variant = variants[status]
    const Icon = variant.icon

    return (
      <Badge className={`${variant.color} flex items-center gap-1`}>
        <Icon className='h-3 w-3' />
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  const getBusinessTypeIcon = (type: string) => {
    if (type === 'RESTAURANT') return '🍽️'
    if (type === 'SHOP') return '🛍️'
    if (type === 'PHARMACY') return '💊'
    return '🏢'
  }

  if (isLoading) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <div className='text-center'>
          <div className='border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2'></div>
          <p className='text-muted-foreground'>Loading applications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='container mx-auto space-y-6 p-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Vendor Applications</h1>
          <p className='text-muted-foreground'>
            Review and manage vendor applications
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          variant='outline'
          className='flex items-center gap-2'
        >
          <RefreshCw className='h-4 w-4' />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 gap-6 md:grid-cols-5'>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-muted-foreground text-sm font-medium'>
                  Total
                </p>
                <p className='text-2xl font-bold'>{stats?.total || 0}</p>
              </div>
              <div className='rounded-full bg-gray-100 p-3'>
                <FileText className='h-6 w-6 text-gray-600' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-yellow-600'>Pending</p>
                <p className='text-2xl font-bold text-yellow-700'>
                  {stats?.pending || 0}
                </p>
              </div>
              <div className='rounded-full bg-yellow-100 p-3'>
                <Clock className='h-6 w-6 text-yellow-600' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-blue-600'>
                  Waiting List
                </p>
                <p className='text-2xl font-bold text-blue-700'>
                  {stats?.waitingList || 0}
                </p>
              </div>
              <div className='rounded-full bg-blue-100 p-3'>
                <Eye className='h-6 w-6 text-blue-600' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-green-600'>Approved</p>
                <p className='text-2xl font-bold text-green-700'>
                  {stats?.approved || 0}
                </p>
              </div>
              <div className='rounded-full bg-green-100 p-3'>
                <CheckCircle className='h-6 w-6 text-green-600' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-red-600'>Rejected</p>
                <p className='text-2xl font-bold text-red-700'>
                  {stats?.rejected || 0}
                </p>
              </div>
              <div className='rounded-full bg-red-100 p-3'>
                <XCircle className='h-6 w-6 text-red-600' />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div className='relative flex-1'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
              <Input
                placeholder='Search by business name, applicant, email...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10'
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-[200px]'>
                <SelectValue placeholder='Filter by status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Applications</SelectItem>
                <SelectItem value='pending'>Pending</SelectItem>
                <SelectItem value='waiting_list'>Waiting List</SelectItem>
                <SelectItem value='approved'>Approved</SelectItem>
                <SelectItem value='rejected'>Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications && filteredApplications.length > 0 ? (
                filteredApplications.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <span className='text-2xl'>
                          {getBusinessTypeIcon(application.businessType)}
                        </span>
                        <div>
                          <p className='font-medium'>
                            {application.businessName}
                          </p>
                          {application.category && (
                            <p className='text-muted-foreground text-xs'>
                              {application.category.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline'>
                        {application.businessType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className='font-medium'>
                          {application.user.fullName || 'N/A'}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {application.user.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='text-sm'>
                        {application.businessEmail && (
                          <div className='text-muted-foreground flex items-center gap-1'>
                            <Mail className='h-3 w-3' />
                            {application.businessEmail}
                          </div>
                        )}
                        {application.businessPhone && (
                          <div className='text-muted-foreground flex items-center gap-1'>
                            <Phone className='h-3 w-3' />
                            {application.businessPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(application.status)}</TableCell>
                    <TableCell>
                      <p className='text-sm'>
                        {new Date(application.createdAt).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                          setSelectedApplication(application)
                          setReviewNotes(application.reviewNotes || '')
                          setShowDetailsDialog(true)
                        }}
                      >
                        <Eye className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className='text-muted-foreground py-8 text-center'
                  >
                    No applications found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>
              Review and manage vendor application
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className='space-y-6'>
              {/* Status Badge */}
              <div className='flex items-center justify-between'>
                {getStatusBadge(selectedApplication.status)}
                <p className='text-muted-foreground text-sm'>
                  Applied:{' '}
                  {new Date(selectedApplication.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Business Info */}
              <div className='space-y-4'>
                <div>
                  <h3 className='mb-2 flex items-center gap-2 font-semibold'>
                    <Building2 className='h-4 w-4' />
                    Business Information
                  </h3>
                  <div className='grid grid-cols-2 gap-4 text-sm'>
                    <div>
                      <p className='text-muted-foreground'>Business Name</p>
                      <p className='font-medium'>
                        {selectedApplication.businessName}
                      </p>
                    </div>
                    <div>
                      <p className='text-muted-foreground'>Type</p>
                      <p className='font-medium'>
                        {selectedApplication.businessType}
                      </p>
                    </div>
                    <div className='col-span-2'>
                      <p className='text-muted-foreground'>Description</p>
                      <p className='font-medium'>
                        {selectedApplication.description || 'N/A'}
                      </p>
                    </div>
                    <div className='col-span-2'>
                      <p className='text-muted-foreground'>Address</p>
                      <p className='font-medium'>
                        {selectedApplication.businessAddress}
                      </p>
                    </div>
                    {selectedApplication.experience && (
                      <div className='col-span-2'>
                        <p className='text-muted-foreground'>Experience</p>
                        <p className='font-medium'>
                          {selectedApplication.experience}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Applicant Info */}
                <div>
                  <h3 className='mb-2 flex items-center gap-2 font-semibold'>
                    <Users className='h-4 w-4' />
                    Applicant Information
                  </h3>
                  <div className='grid grid-cols-2 gap-4 text-sm'>
                    <div>
                      <p className='text-muted-foreground'>Name</p>
                      <p className='font-medium'>
                        {selectedApplication.user.fullName || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className='text-muted-foreground'>Phone</p>
                      <p className='font-medium'>
                        {selectedApplication.user.phone}
                      </p>
                    </div>
                    {selectedApplication.user.email && (
                      <div className='col-span-2'>
                        <p className='text-muted-foreground'>Email</p>
                        <p className='font-medium'>
                          {selectedApplication.user.email}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Notes */}
                <div>
                  <h3 className='mb-2 font-semibold'>Review Notes</h3>
                  <Textarea
                    placeholder='Add notes about this application...'
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={4}
                  />
                  {selectedApplication.reviewNotes && (
                    <p className='text-muted-foreground mt-2 text-sm'>
                      Previous notes: {selectedApplication.reviewNotes}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                {selectedApplication.status !== 'APPROVED' && (
                  <div className='flex gap-2'>
                    <Button
                      onClick={() => handleApprove(selectedApplication)}
                      className='flex-1 bg-green-600 hover:bg-green-700'
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle className='mr-2 h-4 w-4' />
                      Approve
                    </Button>
                    {selectedApplication.status !== 'WAITING_LIST' && (
                      <Button
                        onClick={() => handleWaitingList(selectedApplication)}
                        variant='outline'
                        className='flex-1'
                        disabled={updateStatusMutation.isPending}
                      >
                        <Eye className='mr-2 h-4 w-4' />
                        Waiting List
                      </Button>
                    )}
                    {selectedApplication.status !== 'REJECTED' && (
                      <Button
                        onClick={() => handleReject(selectedApplication)}
                        variant='destructive'
                        className='flex-1'
                        disabled={updateStatusMutation.isPending}
                      >
                        <XCircle className='mr-2 h-4 w-4' />
                        Reject
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              {confirmAction?.type === 'approve' ? (
                <>
                  <CheckCircle className='h-5 w-5 text-green-600' />
                  Confirm Approval
                </>
              ) : (
                <>
                  <XCircle className='h-5 w-5 text-red-600' />
                  Confirm Rejection
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className='space-y-4'>
            <div
              className={`rounded-lg border-2 p-4 ${
                confirmAction?.type === 'approve'
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <p className='text-sm font-medium text-gray-900'>
                {confirmAction?.businessName}
              </p>
              <p className='mt-1 text-sm text-gray-600'>
                {confirmAction?.type === 'approve'
                  ? 'You are about to approve this vendor application. The vendor will be granted access to the platform.'
                  : 'You are about to reject this vendor application. This action cannot be undone.'}
              </p>
            </div>

            {reviewNotes && (
              <div className='rounded-lg bg-gray-50 p-3'>
                <p className='text-xs font-medium text-gray-700'>Review Notes:</p>
                <p className='mt-1 text-sm text-gray-600'>{reviewNotes}</p>
              </div>
            )}

            <div className='flex gap-3'>
              <Button
                onClick={() => {
                  setShowConfirmDialog(false)
                  setConfirmAction(null)
                }}
                variant='outline'
                className='flex-1'
                disabled={updateStatusMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAction}
                className={`flex-1 ${
                  confirmAction?.type === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending
                  ? 'Processing...'
                  : confirmAction?.type === 'approve'
                    ? 'Yes, Approve'
                    : 'Yes, Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

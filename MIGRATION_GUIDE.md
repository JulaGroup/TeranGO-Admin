# 🎯 TeranGO Admin Panel Migration Guide

## Overview

This guide documents the complete migration from the Next.js Vendor-Management admin panel to the new Vite + TanStack Router admin panel with modern shadcn/ui components.

## ✅ Completed Setup

### 1. Environment Configuration

- ✅ Created `.env` file with API configuration
- ✅ Updated `vite-env.d.ts` with proper TypeScript definitions

### 2. Core Infrastructure

- ✅ Created `src/lib/api.ts` - Axios client with interceptors
- ✅ Created `src/lib/types.ts` - All TypeScript interfaces
- ✅ Created `src/lib/auth.ts` - Zustand auth store
- ✅ Created `src/routes/(auth)/login.tsx` - Login page

### 3. API Endpoints Configured

All admin API endpoints are configured in `api.ts`:

- Dashboard & Analytics
- Users Management
- Vendors Management
- Vendor Applications
- Orders Management
- Drivers Management
- Categories & Subcategories
- Promo Codes
- Notifications
- Reports

## 📋 Pages to Migrate

### Priority 1 - Core Features

1. ✅ **Dashboard** (`/_authenticated/index.tsx`)
   - Dashboard stats display
   - Recent orders
   - Revenue charts

2. **Orders** (`/_authenticated/orders/index.tsx`)
   - [ ] Order list with filters
   - [ ] Order details dialog
   - [ ] Status updates
   - [ ] Driver assignment

3. **Vendors** (`/_authenticated/vendors/index.tsx`)
   - [ ] Vendor list with search/filter
   - [ ] Approve/reject actions
   - [ ] Vendor details view

4. **Vendor Applications** (`/_authenticated/vendor-applications/index.tsx`)
   - [ ] Application list
   - [ ] Approve/reject workflow
   - [ ] Application details

### Priority 2 - User & Driver Management

5. **Users** (`/_authenticated/users/index.tsx`)
   - [ ] User list with pagination
   - [ ] User roles management
   - [ ] User details/edit

6. **Drivers** (`/_authenticated/drivers/index.tsx`)
   - [ ] Driver list
   - [ ] Online/offline status
   - [ ] Performance metrics

### Priority 3 - Catalog Management

7. **Categories** (`/_authenticated/categories/index.tsx`)
   - [ ] Category CRUD
   - [ ] Image upload
   - [ ] Display order

8. **Subcategories** (`/_authenticated/subcategories/index.tsx`)
   - [ ] Subcategory CRUD
   - [ ] Category association

### Priority 4 - Marketing & Analytics

9. **Promo Codes** (`/_authenticated/promocodes/index.tsx`)
   - [ ] Promo code list
   - [ ] Create/edit promo codes
   - [ ] Usage statistics

10. **Analytics** (`/_authenticated/analytics/index.tsx`)
    - [ ] Revenue charts
    - [ ] Order analytics
    - [ ] User growth
    - [ ] Top vendors

11. **Notifications** (`/_authenticated/notifications/index.tsx`)
    - [ ] Send broadcast notifications
    - [ ] Notification history
    - [ ] Target selection

12. **Reports** (`/_authenticated/reports/index.tsx`)
    - [ ] Generate reports
    - [ ] Download exports
    - [ ] Scheduled reports

### Priority 5 - Settings

13. **Settings** (`/_authenticated/settings/index.tsx`)
    - [ ] App configuration
    - [ ] Admin preferences
    - [ ] System settings

## 🎨 UI Components to Use

### Data Display

- `Table` - For all list views
- `Card` - For stat cards and sections
- `Badge` - For status indicators
- `Avatar` - For user/vendor images

### Forms

- `Form` + `Input` - Text inputs
- `Select` - Dropdowns
- `Checkbox` / `Switch` - Boolean values
- `DatePicker` - Date selection
- `Textarea` - Long text
- `Button` - All actions

### Dialogs & Modals

- `Dialog` - For forms and details
- `AlertDialog` - For confirmations
- `Sheet` - For sliding panels
- `Popover` - For quick actions

### Feedback

- `toast` (from sonner) - For notifications
- `Skeleton` - For loading states
- `Progress` - For progress indicators

## 🔄 Migration Pattern

For each page, follow this pattern:

```typescript
// 1. Import required components
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
// ... other imports

// 2. Create route with metadata
export const Route = createFileRoute('/_authenticated/page-name')({
  component: PageComponent,
})

// 3. Define the component
function PageComponent() {
  // 4. Fetch data with React Query
  const { data, isLoading } = useQuery({
    queryKey: ['key'],
    queryFn: () => adminApi.getData(),
  })

  // 5. Mutations for actions
  const mutation = useMutation({
    mutationFn: (data) => adminApi.updateData(data),
    onSuccess: () => {
      toast.success('Success!')
      queryClient.invalidateQueries({ queryKey: ['key'] })
    },
  })

  // 6. Render with shadcn components
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Page Title</h1>
        <p className="text-muted-foreground">Description</p>
      </div>

      {/* Content */}
      <Card>
        {/* Use shadcn components here */}
      </Card>
    </div>
  )
}
```

## 📦 Key Dependencies

Already installed in the new admin panel:

- ✅ `@tanstack/react-router` - Routing
- ✅ `@tanstack/react-query` - Data fetching
- ✅ `shadcn/ui` - UI components
- ✅ `tailwindcss` - Styling
- ✅ `zustand` - State management
- ✅ `axios` - HTTP client
- ✅ `sonner` - Toast notifications
- ✅ `lucide-react` - Icons

Need to add:

- [ ] `axios` - Add to package.json
- [ ] `zustand` - Add to package.json

## 🚀 Next Steps

1. Install missing dependencies:

```bash
cd "complete admin panel"
pnpm add axios zustand
```

2. Start migrating pages in priority order

3. Test each page thoroughly

4. Update navigation sidebar with all pages

5. Deploy to production

## 📝 Notes

- Use TypeScript strictly
- All API calls through `adminApi` from `lib/api.ts`
- Use React Query for all data fetching
- Toast notifications for user feedback
- Proper error handling on all API calls
- Loading states with Skeleton components
- Responsive design (mobile-first)

## 🔗 Resources

- [TanStack Router Docs](https://tanstack.com/router)
- [TanStack Query Docs](https://tanstack.com/query)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com)

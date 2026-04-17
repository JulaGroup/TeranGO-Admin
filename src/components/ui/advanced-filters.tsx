// @ts-nocheck
import * as React from 'react'
import { useSearchParams } from '@tanstack/react-router'
import { X, Filter, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { DateRangePicker } from './form-enhanced'

export interface FilterOption {
  label: string
  value: string
  count?: number
}

export interface FilterConfig {
  id: string
  label: string
  type: 'select' | 'multi-select' | 'date-range' | 'number-range' | 'boolean'
  options?: FilterOption[]
  placeholder?: string
}

export interface ActiveFilter {
  filterId: string
  label: string
  value: any
  displayValue: string
}

export interface AdvancedFilterSystemProps {
  filters: FilterConfig[]
  value?: Record<string, any>
  onChange?: (filters: Record<string, any>) => void
  presets?: {
    name: string
    filters: Record<string, any>
  }[]
  onSavePreset?: (name: string, filters: Record<string, any>) => void
  persistToUrl?: boolean
  className?: string
}

export function AdvancedFilterSystem({
  filters,
  value = {},
  onChange,
  presets = [],
  onSavePreset,
  persistToUrl = true,
  className,
}: AdvancedFilterSystemProps) {
  const [searchParams, setSearchParams] = persistToUrl ? useSearchParams() : [null, null]
  const [localFilters, setLocalFilters] = React.useState<Record<string, any>>(value)
  const [showSavePreset, setShowSavePreset] = React.useState(false)
  const [presetName, setPresetName] = React.useState('')

  // Load from URL on mount
  React.useEffect(() => {
    if (persistToUrl && searchParams) {
      const urlFilters: Record<string, any> = {}
      filters.forEach(filter => {
        const paramValue = searchParams[filter.id]
        if (paramValue) {
          if (filter.type === 'multi-select') {
            urlFilters[filter.id] = paramValue.split(',')
          } else if (filter.type === 'date-range') {
            const [from, to] = paramValue.split('~')
            urlFilters[filter.id] = { from, to }
          } else {
            urlFilters[filter.id] = paramValue
          }
        }
      })
      if (Object.keys(urlFilters).length > 0) {
        setLocalFilters(urlFilters)
        onChange?.(urlFilters)
      }
    }
  }, [])

  const updateFilters = (newFilters: Record<string, any>) => {
    setLocalFilters(newFilters)
    onChange?.(newFilters)

    // Persist to URL
    if (persistToUrl && setSearchParams) {
      const params: Record<string, string> = {}
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            params[key] = value.join(',')
          } else if (typeof value === 'object' && value.from) {
            params[key] = `${value.from}~${value.to || ''}`
          } else {
            params[key] = String(value)
          }
        }
      })
      setSearchParams(params)
    }
  }

  const handleFilterChange = (filterId: string, value: any) => {
    const newFilters = { ...localFilters }
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[filterId]
    } else {
      newFilters[filterId] = value
    }
    updateFilters(newFilters)
  }

  const handleClearAll = () => {
    updateFilters({})
    if (persistToUrl && setSearchParams) {
      setSearchParams({})
    }
  }

  const handleApplyPreset = (preset: { filters: Record<string, any> }) => {
    updateFilters(preset.filters)
  }

  const handleSavePreset = () => {
    if (presetName && onSavePreset) {
      onSavePreset(presetName, localFilters)
      setPresetName('')
      setShowSavePreset(false)
    }
  }

  const activeFilters: ActiveFilter[] = React.useMemo(() => {
    return Object.entries(localFilters)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([filterId, value]) => {
        const filter = filters.find(f => f.id === filterId)
        if (!filter) return null

        let displayValue = ''
        if (filter.type === 'multi-select' && Array.isArray(value)) {
          displayValue = value.map(v => 
            filter.options?.find(o => o.value === v)?.label || v
          ).join(', ')
        } else if (filter.type === 'date-range' && value.from) {
          displayValue = `${value.from}${value.to ? ` - ${value.to}` : ''}`
        } else if (filter.type === 'select') {
          displayValue = filter.options?.find(o => o.value === value)?.label || value
        } else {
          displayValue = String(value)
        }

        return {
          filterId,
          label: filter.label,
          value,
          displayValue
        }
      })
      .filter(Boolean) as ActiveFilter[]
  }, [localFilters, filters])

  return (
    <div className={cn('space-y-3', className)}>
      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map(filter => (
          <FilterControl
            key={filter.id}
            filter={filter}
            value={localFilters[filter.id]}
            onChange={(value) => handleFilterChange(filter.id, value)}
          />
        ))}

        {/* Presets */}
        {presets.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="mr-2 h-4 w-4" />
                Presets
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64">
              <div className="space-y-2">
                <p className="text-sm font-medium">Saved Filters</p>
                {presets.map((preset, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Save Preset */}
        {onSavePreset && Object.keys(localFilters).length > 0 && (
          <Popover open={showSavePreset} onOpenChange={setShowSavePreset}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64">
              <div className="space-y-3">
                <Label>Preset Name</Label>
                <Input
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="My filter preset"
                />
                <Button onClick={handleSavePreset} size="sm" className="w-full">
                  Save Preset
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Clear All */}
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
          >
            Clear All
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active:</span>
          {activeFilters.map(filter => (
            <Badge
              key={filter.filterId}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="font-medium">{filter.label}:</span>
              <span>{filter.displayValue}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => handleFilterChange(filter.filterId, undefined)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// Individual Filter Control
interface FilterControlProps {
  filter: FilterConfig
  value: any
  onChange: (value: any) => void
}

function FilterControl({ filter, value, onChange }: FilterControlProps) {
  switch (filter.type) {
    case 'select':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options?.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
                {option.count !== undefined && (
                  <span className="ml-2 text-muted-foreground">({option.count})</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case 'multi-select':
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 border-dashed">
              <Filter className="mr-2 h-4 w-4" />
              {filter.label}
              {value && value.length > 0 && (
                <>
                  <Separator orientation="vertical" className="mx-2 h-4" />
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {value.length}
                  </Badge>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-2">
              {filter.options?.map(option => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={value?.includes(option.value)}
                    onCheckedChange={(checked) => {
                      const newValue = value ? [...value] : []
                      if (checked) {
                        newValue.push(option.value)
                      } else {
                        const index = newValue.indexOf(option.value)
                        if (index > -1) newValue.splice(index, 1)
                      }
                      onChange(newValue.length > 0 ? newValue : undefined)
                    }}
                  />
                  <label className="text-sm cursor-pointer flex-1">
                    {option.label}
                    {option.count !== undefined && (
                      <span className="ml-2 text-muted-foreground">({option.count})</span>
                    )}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )

    case 'date-range':
      return (
        <DateRangePicker
          from={value?.from ? new Date(value.from) : undefined}
          to={value?.to ? new Date(value.to) : undefined}
          onChange={(from, to) => {
            if (from || to) {
              onChange({
                from: from?.toISOString().split('T')[0],
                to: to?.toISOString().split('T')[0]
              })
            } else {
              onChange(undefined)
            }
          }}
          className="h-8 w-[250px]"
        />
      )

    case 'boolean':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={value === true}
            onCheckedChange={(checked) => onChange(checked || undefined)}
          />
          <Label className="text-sm cursor-pointer">{filter.label}</Label>
        </div>
      )

    default:
      return null
  }
}

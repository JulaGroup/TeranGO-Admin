import * as React from 'react'
import { Search, Clock, X, Loader2 } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface SearchResult {
  id: string
  title: string
  description?: string
  category: string
  url: string
  icon?: React.ReactNode
}

export interface AdvancedSearchProps {
  onSearch?: (query: string) => Promise<SearchResult[]>
  placeholder?: string
  shortcuts?: string[]
  recentSearches?: string[]
  onRecentSearchRemove?: (query: string) => void
  className?: string
}

export function AdvancedSearch({
  onSearch,
  placeholder = 'Search...',
  shortcuts = ['⌘', 'K'],
  recentSearches = [],
  onRecentSearchRemove,
  className,
}: AdvancedSearchProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const navigate = useNavigate()

  // Keyboard shortcut (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Debounced search
  React.useEffect(() => {
    if (!query || !onSearch) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const searchResults = await onSearch(query)
        setResults(searchResults)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, onSearch])

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    navigate({ to: result.url })
  }

  const handleRecentSelect = (search: string) => {
    setQuery(search)
  }

  const groupedResults = React.useMemo(() => {
    return results.reduce((acc, result) => {
      if (!acc[result.category]) {
        acc[result.category] = []
      }
      acc[result.category].push(result)
      return acc
    }, {} as Record<string, SearchResult[]>)
  }, [results])

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'relative h-9 w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64',
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">{placeholder}</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          {shortcuts.map((key, i) => (
            <span key={i}>{key}</span>
          ))}
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={placeholder}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isSearching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="py-6 text-center text-sm">
                {query ? 'No results found.' : 'Start typing to search...'}
              </div>
            )}
          </CommandEmpty>

          {!query && recentSearches.length > 0 && (
            <>
              <CommandGroup heading="Recent Searches">
                {recentSearches.map((search, index) => (
                  <CommandItem
                    key={index}
                    onSelect={() => handleRecentSelect(search)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4" />
                      <span>{search}</span>
                    </div>
                    {onRecentSearchRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRecentSearchRemove(search)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {Object.entries(groupedResults).map(([category, items]) => (
            <CommandGroup key={category} heading={category}>
              {items.map((result) => (
                <CommandItem
                  key={result.id}
                  onSelect={() => handleSelect(result)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {result.icon && (
                      <div className="flex h-6 w-6 items-center justify-center">
                        {result.icon}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span>{result.title}</span>
                      {result.description && (
                        <span className="text-xs text-muted-foreground">
                          {result.description}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {category}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}

// Simpler inline search variant (without modal)
export interface InlineSearchProps {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  placeholder?: string
  className?: string
  debounce?: number
}

export function InlineSearch({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search...',
  className,
  debounce = 300,
}: InlineSearchProps) {
  const [internalValue, setInternalValue] = React.useState(value)

  React.useEffect(() => {
    setInternalValue(value)
  }, [value])

  React.useEffect(() => {
    if (!onChange) return

    const timer = setTimeout(() => {
      onChange(internalValue)
    }, debounce)

    return () => clearTimeout(timer)
  }, [internalValue, onChange, debounce])

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      {internalValue && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          onClick={() => {
            setInternalValue('')
            onClear?.()
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

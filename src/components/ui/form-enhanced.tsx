// @ts-nocheck
import * as React from "react";
import { useForm, type UseFormReturn, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type z } from "zod";
import { Upload, X, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

// Enhanced Form Field with Error Display
export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  error,
  required,
  description,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {description && !error && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  );
}

// File Upload with Preview
export interface FileUploadProps {
  value?: File | string | null;
  onChange?: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  preview?: boolean;
  className?: string;
}

export function FileUpload({
  value,
  onChange,
  accept = "image/*",
  maxSize = 5,
  preview = true,
  className,
}: FileUploadProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (value instanceof File) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof value === "string") {
      setPreviewUrl(value);
    } else {
      setPreviewUrl(null);
    }
  }, [value]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size must be less than ${maxSize}MB`);
      return;
    }

    onChange?.(file);
  };

  const handleRemove = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onChange?.(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        title="fileupload"
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {previewUrl && preview ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Preview"
            className="h-32 w-32 rounded-lg border object-cover"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload File
        </Button>
      )}
    </div>
  );
}

// Date Range Picker
export interface DateRangePickerProps {
  from?: Date;
  to?: Date;
  onChange?: (from: Date | undefined, to: Date | undefined) => void;
  className?: string;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  className,
}: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !from && !to && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {from ? (
            to ? (
              <>
                {format(from, "LLL dd, y")} - {format(to, "LLL dd, y")}
              </>
            ) : (
              format(from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={from}
          selected={{ from, to }}
          onSelect={(range) => {
            onChange?.(range?.from, range?.to);
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

// Multi-Select with Tags
export interface MultiSelectProps {
  options: { label: string; value: string }[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Select items...",
  className,
}: MultiSelectProps) {
  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange?.(newValue);
  };

  const handleRemove = (optionValue: string) => {
    onChange?.(value.filter((v) => v !== optionValue));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            {value.length > 0 ? (
              <span className="text-sm">{value.length} selected</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-2" align="start">
          <div className="space-y-1">
            {options.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-2 rounded-sm p-2 hover:bg-accent cursor-pointer"
                onClick={() => handleToggle(option.value)}
              >
                <Checkbox
                  checked={value.includes(option.value)}
                  onCheckedChange={() => handleToggle(option.value)}
                />
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => {
            const option = options.find((o) => o.value === v);
            return (
              <Badge key={v} variant="secondary" className="gap-1">
                {option?.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleRemove(v)}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Auto-Complete Input
export interface AutoCompleteProps {
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AutoComplete({
  options,
  value = "",
  onChange,
  placeholder = "Type to search...",
  className,
}: AutoCompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState(value);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter((option) =>
      option.toLowerCase().includes(search.toLowerCase()),
    );
  }, [options, search]);

  const handleSelect = (option: string) => {
    setSearch(option);
    onChange?.(option);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onChange?.(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full" align="start">
        <div className="max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No results found
            </div>
          ) : (
            filteredOptions.map((option, index) => (
              <div
                key={index}
                className="cursor-pointer px-4 py-2 text-sm hover:bg-accent"
                onClick={() => handleSelect(option)}
              >
                {option}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Form with Zod validation
export interface FormWithValidationProps<T extends FieldValues> {
  schema: z.ZodSchema<T>;
  onSubmit: (data: T) => void | Promise<void>;
  defaultValues?: Partial<T>;
  children: (form: UseFormReturn<T>) => React.ReactNode;
  className?: string;
}

export function FormWithValidation<T extends FieldValues>({
  schema,
  onSubmit,
  defaultValues,
  children,
  className,
}: FormWithValidationProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
      {children(form)}
    </form>
  );
}

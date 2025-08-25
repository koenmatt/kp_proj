'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface InlineEditableTextProps {
  value: string
  onSave: (value: string) => Promise<void>
  className?: string
  placeholder?: string
  textClassName?: string
  inputClassName?: string
}

export function InlineEditableText({ 
  value, 
  onSave, 
  className,
  placeholder = "Click to edit",
  textClassName = "",
  inputClassName = ""
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(editValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Save failed:', error)
      toast.error('Failed to save changes')
      setEditValue(value) // Reset to original value
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div className={className}>
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className={cn(
            "bg-transparent border-none outline-none resize-none p-0 m-0 w-full",
            "focus:outline-none focus:ring-0 focus:border-none",
            textClassName,
            inputClassName
          )}
          placeholder={placeholder}
          style={{
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            lineHeight: 'inherit',
            letterSpacing: 'inherit',
          }}
        />
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "cursor-text hover:bg-muted/30 rounded px-1 transition-colors min-h-[1em]",
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      <span className={cn("select-none", textClassName)}>
        {value || placeholder}
      </span>
    </div>
  )
}

interface InlineEditableSelectProps {
  value: string
  options: string[]
  onSave: (value: string) => Promise<void>
  className?: string
  placeholder?: string
  displayClassName?: string
}

export function InlineEditableSelect({ 
  value, 
  options,
  onSave, 
  className,
  placeholder = "Click to edit",
  displayClassName = ""
}: InlineEditableSelectProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (newValue: string) => {
    if (newValue === value) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(newValue)
      setIsEditing(false)
    } catch (error) {
      console.error('Save failed:', error)
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  if (isEditing) {
    return (
      <div className={className}>
        <Select 
          value={value} 
          onValueChange={handleSave}
          disabled={isSaving}
          open={isEditing}
          onOpenChange={setIsEditing}
        >
          <SelectTrigger className={cn(
            "bg-transparent border-none outline-none p-0 h-auto min-w-0 w-auto",
            "focus:outline-none focus:ring-0 focus:border-none shadow-none",
            "text-inherit font-inherit gap-1",
            displayClassName
          )}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "cursor-pointer hover:bg-muted/30 rounded transition-colors inline-block",
        className
      )}
      onClick={() => setIsEditing(true)}
    >
      <span className={cn("select-none", displayClassName)}>
        {value || placeholder}
      </span>
    </div>
  )
} 
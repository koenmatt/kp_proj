'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { ClientOnly } from "@/components/client-only"
import { useWorkflow } from "@/hooks/use-workflow"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Check, Clock, User, Calendar as CalendarIcon, ChevronRight, GripVertical, Trash2, ArrowUp, ArrowDown, Move, Users, Shield, DollarSign, FileText, Building2, UserCheck, Upload, BarChart3, TrendingUp, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// Helper function to format date in readable format
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }
  
  const formatted = date.toLocaleDateString('en-US', options)
  
  // Add ordinal suffix to day
  const day = date.getDate()
  const suffix = day === 1 || day === 21 || day === 31 ? 'st' :
                day === 2 || day === 22 ? 'nd' :
                day === 3 || day === 23 ? 'rd' : 'th'
  
  return formatted.replace(/(\d+),/, `$1${suffix},`)
}

interface ApprovalStep {
  id: string
  title: string
  assignee: string
  assignee_avatar?: string
  status: 'completed' | 'ready' | 'pending' | 'overdue'
  due_date?: string
  completed_date?: string
  description?: string
  layer_index: number
  position_in_layer: number
  persona?: PersonaType
}

type PersonaType = 'ae' | 'deal-desk' | 'cro' | 'legal' | 'finance' | 'customer'

const personas = {
  ae: {
    name: 'Account Executive',
    description: 'Creates the quote',
    icon: Users,
    color: 'text-blue-600 bg-blue-50'
  },
  'deal-desk': {
    name: 'Deal Desk',
    description: 'Approves quotes with modest discounts (up to 15%)',
    icon: Shield,
    color: 'text-green-600 bg-green-50'
  },
  cro: {
    name: 'Chief Revenue Officer',
    description: 'Approves quotes with larger discounts (15–40%)',
    icon: DollarSign,
    color: 'text-purple-600 bg-purple-50'
  },
  legal: {
    name: 'Legal',
    description: 'Reviews quotes for contractual language',
    icon: FileText,
    color: 'text-orange-600 bg-orange-50'
  },
  finance: {
    name: 'Finance',
    description: 'Approves edge-case deals (>40% discounts, bespoke terms)',
    icon: Building2,
    color: 'text-red-600 bg-red-50'
  },
  customer: {
    name: 'Customer',
    description: 'Receives the final approved quote',
    icon: UserCheck,
    color: 'text-gray-600 bg-gray-50'
  }
}



const StatusBadge = ({ status }: { status: ApprovalStep['status'] }) => {
  const configs = {
    completed: {
      icon: <Check size={14} />,
      label: 'Completed',
      className: 'bg-green-500 hover:bg-green-600 text-white'
    },
    ready: {
      icon: <Clock size={14} />,
      label: 'Ready to start',
      className: 'bg-yellow-500 hover:bg-yellow-600 text-white'
    },
    pending: {
      icon: <Clock size={14} />,
      label: 'Pending',
      className: 'bg-gray-400 hover:bg-gray-500 text-white'
    },
    overdue: {
      icon: <Clock size={14} />,
      label: 'Overdue',
      className: 'bg-red-500 hover:bg-red-600 text-white'
    }
  }

  const config = configs[status]
  
  return (
    <Button size="sm" className={`${config.className} h-7 text-xs font-medium`}>
      {config.icon}
      <span className="ml-1">{config.label}</span>
    </Button>
  )
}

const StartNode = () => {
  return (
    <div className="relative border border-green-200 rounded-lg p-4 min-w-[280px] shadow-sm bg-green-50">
      {/* Status Badge */}
      <div className="mb-3 pt-2 flex items-center gap-2">
        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white h-7 text-xs font-medium">
          <Check size={14} />
          <span className="ml-1">Completed</span>
        </Button>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 mb-2 pr-4">
        Quote Created
      </h3>

      {/* Assignee */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
            AE
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-gray-600">Account Executive</span>
      </div>

      {/* Persona */}
      <div className="flex items-center gap-2 mb-2 px-2 py-1 rounded-md text-blue-600 bg-blue-50">
        <Users size={14} />
        <span className="text-xs font-medium">Account Executive</span>
      </div>

      {/* Date */}
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
        <CalendarIcon size={12} />
        <span>Quote initiated</span>
      </div>
    </div>
  )
}

const StepCard = ({ 
  step, 
  onEdit, 
  onDelete,
  onAddAbove,
  onAddBelow,
  isDragging,
  dragHandleProps,
  isLastInLayer,
  isCurrent,
  onSetCurrent
}: { 
  step: ApprovalStep
  onEdit: () => void
  onDelete: () => void
  onAddAbove: () => void
  onAddBelow: () => void
  isDragging?: boolean
  dragHandleProps?: any
  isLastInLayer?: boolean
  isCurrent?: boolean
  onSetCurrent: (stepId: string | null) => void
}) => {
  const persona = step.persona ? personas[step.persona] : null
  const PersonaIcon = persona?.icon

  return (
    <div className={`relative border border-gray-200 rounded-lg p-4 min-w-[280px] shadow-sm hover:shadow-md transition-all ${
      isDragging ? 'opacity-50 rotate-2 scale-105' : ''
    } ${
      isCurrent ? 'bg-red-50 border-red-200' : 'bg-white'
    }`}>
      {/* Drag Handle */}
      <div 
        {...dragHandleProps}
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing opacity-30 hover:opacity-60"
      >
        <GripVertical size={16} />
      </div>

      {/* Current Step Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSetCurrent(isCurrent ? null : step.id)}
        title={isCurrent ? "Remove as current step" : "Set as current step"}
        className={`absolute top-2 right-8 h-6 w-6 p-0 transition-all ${
          isCurrent 
            ? 'opacity-100 bg-red-100 text-red-600 hover:bg-red-200' 
            : 'opacity-30 hover:opacity-60 hover:bg-red-50 hover:text-red-600'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-red-500' : 'bg-gray-400'}`} />
      </Button>

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-30 hover:opacity-60 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={12} />
      </Button>

      {/* Add Above/Below Buttons */}
      <div className="absolute top-2 right-10 flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddAbove}
          title="Add parallel step above"
          className="h-6 w-6 p-0 opacity-30 hover:opacity-60 hover:bg-blue-50 hover:text-blue-600"
        >
          <ArrowUp size={10} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddBelow}
          title="Add parallel step below"
          className="h-6 w-6 p-0 opacity-30 hover:opacity-60 hover:bg-blue-50 hover:text-blue-600"
        >
          <ArrowDown size={10} />
        </Button>
      </div>

      {/* Status Badge */}
      <div className="mb-3 pt-2 flex items-center gap-2">
        <StatusBadge status={step.status} />
        {isCurrent && (
          <Badge variant="destructive" className="text-xs px-2 py-0.5">
            Current
          </Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 mb-2 pr-16" onClick={onEdit} style={{ cursor: 'pointer' }}>
        {step.title}
      </h3>

      {/* Assignee */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-5 w-5">
          <AvatarImage src={step.assignee_avatar} />
          <AvatarFallback className="text-xs bg-gray-100">
            {step.assignee.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-gray-600">{step.assignee}</span>
      </div>

      {/* Persona */}
      {persona && PersonaIcon && (
        <div className={`flex items-center gap-2 mb-2 px-2 py-1 rounded-md ${persona.color}`}>
          <PersonaIcon size={14} />
          <span className="text-xs font-medium">{persona.name}</span>
        </div>
      )}

      {/* Date */}
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
        <CalendarIcon size={12} />
        {step.status === 'completed' && step.completed_date && (
          <span>Completed {step.completed_date}</span>
        )}
        {step.status !== 'completed' && step.due_date && (
          <span>Due {formatDate(step.due_date)}</span>
        )}
        {!step.completed_date && !step.due_date && (
          <span>Not set</span>
        )}
      </div>

      {/* Connector line for parallel steps */}
      {!isLastInLayer && (
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-px h-6 bg-gray-300"></div>
      )}
    </div>
  )
}



interface ApprovalFlowChartProps {
  className?: string
  quoteId: number
}

export function ApprovalFlowChart({ className, quoteId }: ApprovalFlowChartProps) {
  const { 
    workflow, 
    steps, 
    loading, 
    error, 
    createStep, 
    updateStep: updateStepApi, 
    deleteStep: deleteStepApi, 
    updateCurrentStage, 
    reorderSteps 
  } = useWorkflow(quoteId)
  
  const [selectedStep, setSelectedStep] = useState<ApprovalStep | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [draggedStep, setDraggedStep] = useState<ApprovalStep | null>(null)
  const [draggedColumn, setDraggedColumn] = useState<number | null>(null)
  const [dragType, setDragType] = useState<'step' | 'column' | null>(null)
  const [currentStepId, setCurrentStepId] = useState<string | null>(null)
  
  // Debounce refs for text inputs
  const updateTimeouts = useRef<Record<string, NodeJS.Timeout>>({})

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(updateTimeouts.current).forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  // Group steps by layer
  const stepsByLayer = steps.reduce((acc, step) => {
    if (!acc[step.layer_index]) {
      acc[step.layer_index] = []
    }
    acc[step.layer_index].push(step)
    return acc
  }, {} as Record<number, ApprovalStep[]>)

  // Sort each layer by position
  Object.keys(stepsByLayer).forEach(layerKey => {
    stepsByLayer[parseInt(layerKey)].sort((a, b) => a.position_in_layer - b.position_in_layer)
  })

  const layers = Object.keys(stepsByLayer).map(k => parseInt(k)).sort((a, b) => a - b)

  const addNewStep = useCallback(() => {
    if (!workflow) return
    const maxLayerIndex = steps.length > 0 ? Math.max(...steps.map(s => s.layer_index)) : -1
    
    // Create step optimistically - this will update UI immediately
    createStep({
      title: 'New Approval Step',
      assignee: 'Unassigned',
      status: 'pending',
      description: '',
      layer_index: maxLayerIndex + 1,
      position_in_layer: 0,
      persona: 'deal-desk'
            }).then(newStep => {
          if (newStep) {
            setSelectedStep(newStep)
            setSidebarOpen(true)
            toast.success('Parallel step created')
          }
        }).catch(error => {
      console.error('Failed to create step:', error)
      toast.error('Failed to create step')
    })
  }, [workflow, steps, createStep])

  const addParallelStep = useCallback((sourceStep: ApprovalStep, position: 'above' | 'below') => {
    if (!workflow) return
    const layerSteps = stepsByLayer[sourceStep.layer_index] || []
    const newPositionInLayer = position === 'above' 
      ? sourceStep.position_in_layer 
      : sourceStep.position_in_layer + 1

    // First, shift existing steps if needed
    const stepsToUpdate = steps
      .filter(step => step.layer_index === sourceStep.layer_index && step.position_in_layer >= newPositionInLayer)
      .map(step => ({
        id: step.id,
        layer_index: step.layer_index,
        position_in_layer: step.position_in_layer + 1
      }))

    const createNewStep = () => {
      createStep({
        title: 'Parallel Approval',
        assignee: 'Unassigned',
        status: 'pending',
        description: '',
        layer_index: sourceStep.layer_index,
        position_in_layer: newPositionInLayer,
        persona: sourceStep.persona || 'deal-desk'
           }).then(newStep => {
       if (newStep) {
         setSelectedStep(newStep)
         setSidebarOpen(true)
         toast.success('Approval step created')
       }
     }).catch(error => {
          console.error('Failed to create parallel step:', error)
          toast.error('Failed to create parallel step')
       })
    }

    if (stepsToUpdate.length > 0) {
      reorderSteps(stepsToUpdate).then(createNewStep).catch(createNewStep)
    } else {
      createNewStep()
    }
  }, [workflow, steps, stepsByLayer, createStep, reorderSteps])

    // Immediate update for non-text fields (dropdowns, checkboxes, etc.)
  const updateStep = useCallback((stepId: string, updates: Partial<ApprovalStep>) => {
    // Update optimistically - UI updates immediately
    updateStepApi(stepId, updates).then(updatedStep => {
      if (selectedStep?.id === stepId && updatedStep) {
        setSelectedStep(updatedStep)
      }
    }).catch(error => {
      console.error('Failed to update step:', error)
      toast.error('Failed to update step')
    })
  }, [selectedStep, updateStepApi])

  // Debounced update for text fields (title, assignee, description)
  const updateStepDebounced = useCallback((stepId: string, updates: Partial<ApprovalStep>) => {
    // Update local state immediately for responsive UI
    if (selectedStep?.id === stepId) {
      setSelectedStep(prev => prev ? { ...prev, ...updates } : null)
    }

    // Clear existing timeout for this step+field combination
    const timeoutKey = `${stepId}-${Object.keys(updates)[0]}`
    if (updateTimeouts.current[timeoutKey]) {
      clearTimeout(updateTimeouts.current[timeoutKey])
    }

    // Set new timeout to update API after user stops typing
    updateTimeouts.current[timeoutKey] = setTimeout(() => {
      updateStepApi(stepId, updates).then(realUpdatedStep => {
        // Sync with real server data if this step is still selected
        if (selectedStep?.id === stepId && realUpdatedStep) {
          setSelectedStep(realUpdatedStep)
        }
      }).catch(error => {
        console.error('Failed to update step:', error)
        toast.error('Failed to update step')
        // Revert local state on error
        if (selectedStep?.id === stepId) {
          const originalStep = steps.find(s => s.id === stepId)
          if (originalStep) {
            setSelectedStep(originalStep)
          }
        }
      })
      delete updateTimeouts.current[timeoutKey]
    }, 500) // 500ms delay
  }, [selectedStep, updateStepApi, steps])

  const deleteStep = useCallback((stepId: string) => {
    // Handle UI state immediately
    if (selectedStep?.id === stepId) {
      setSidebarOpen(false)
      setSelectedStep(null)
    }
    if (currentStepId === stepId) {
      setCurrentStepId(null)
      updateCurrentStage(null) // Fire and forget
    }

    // Delete optimistically - UI updates immediately
         deleteStepApi(stepId).catch(error => {
       console.error('Failed to delete step:', error)
       toast.error('Failed to delete step')
     })
  }, [selectedStep, currentStepId, deleteStepApi, updateCurrentStage])

  const setCurrentStep = useCallback((stepId: string | null) => {
    // Update UI immediately
    setCurrentStepId(stepId)
    // Update database in background
    updateCurrentStage(stepId)
  }, [updateCurrentStage])

  // Simplified drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, item: ApprovalStep | number, type: 'step' | 'column') => {
    setDragType(type)
    if (type === 'step') {
      setDraggedStep(item as ApprovalStep)
      e.dataTransfer.setData('text/plain', `step:${(item as ApprovalStep).id}`)
    } else {
      setDraggedColumn(item as number)
      e.dataTransfer.setData('text/plain', `column:${item}`)
    }
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedStep(null)
    setDraggedColumn(null)
    setDragType(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetLayerIndex: number, dropType: 'step' | 'column' | 'new') => {
    e.preventDefault()
    const data = e.dataTransfer.getData('text/plain')
    const [type, id] = data.split(':')
    
    if (type === 'step' && draggedStep) {
      if (dropType === 'new') {
        // Create new layer - update optimistically
        updateStepApi(draggedStep.id, { 
          layer_index: layers.length > 0 ? Math.max(...layers) + 1 : 0, 
          position_in_layer: 0 
                 }).catch(error => {
           console.error('Failed to move step to new layer:', error)
           toast.error('Failed to move step')
         })
      } else {
        // Move to existing layer - update optimistically
        const targetStepsCount = stepsByLayer[targetLayerIndex]?.length || 0
        updateStepApi(draggedStep.id, { 
          layer_index: targetLayerIndex, 
          position_in_layer: targetStepsCount 
        }).catch(error => {
          console.error('Failed to move step to layer:', error)
          toast.error('Failed to move step')
        })
      }
    } else if (type === 'column' && draggedColumn !== null && draggedColumn !== targetLayerIndex) {
      // Column reordering - swap all steps between the two layers
      const stepUpdates = steps
        .filter(step => step.layer_index === draggedColumn || step.layer_index === targetLayerIndex)
        .map(step => ({
          id: step.id,
          layer_index: step.layer_index === draggedColumn ? targetLayerIndex : draggedColumn,
          position_in_layer: step.position_in_layer
        }))

      if (stepUpdates.length > 0) {
        reorderSteps(stepUpdates).catch(error => {
          console.error('Failed to reorder columns:', error)
          toast.error('Failed to reorder columns')
        })
      }
    }
    
    handleDragEnd()
  }, [draggedStep, draggedColumn, layers, stepsByLayer, handleDragEnd, updateStepApi, reorderSteps, steps])

  // Calculate dynamic height based on number of layers and max steps per layer
  const maxStepsInLayer = layers.length > 0 ? Math.max(...layers.map(layer => stepsByLayer[layer]?.length || 0)) : 0
  const containerHeight = Math.max(300, layers.length * 100 + maxStepsInLayer * 50)

  if (loading) {
    return (
      <div className={`w-full bg-gray-50 border rounded-lg flex items-center justify-center ${className}`} style={{ height: 400 }}>
        <div className="space-y-4 text-center">
          <Skeleton className="w-full h-[200px]" />
          <p className="text-sm text-muted-foreground">Loading approval flow...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`w-full bg-gray-50 border rounded-lg flex items-center justify-center ${className}`} style={{ height: 400 }}>
        <div className="space-y-4 text-center">
          <p className="text-sm text-red-600">Error loading workflow: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative space-y-8">
      {/* Approval Flow Chart */}
      <div>
    <ClientOnly
      fallback={
            <div className={`w-full bg-gray-50 border rounded-lg flex items-center justify-center ${className}`} style={{ height: containerHeight }}>
          <div className="space-y-4 text-center">
                <Skeleton className="w-full h-[200px]" />
            <p className="text-sm text-muted-foreground">Loading approval flow...</p>
          </div>
        </div>
      }
    >
          <div 
            className={`w-full border rounded-lg p-6 ${className}`}
            style={{ 
              minHeight: containerHeight,
              background: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              backgroundColor: '#f9fafb'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Approval Workflow</h2>
              <Button
                onClick={addNewStep}
                size="sm"
                variant="outline"
                className="shadow-sm"
              >
                <Plus size={16} className="mr-1" />
                Add Step
              </Button>
            </div>

            {/* Workflow Steps */}
            <div className="flex items-start gap-4 overflow-x-auto pb-4">
              {/* Start Node */}
              <div className="flex items-start">
                <div className="flex flex-col">
                  {/* Start Node Header */}
                  <div className="flex items-center justify-center mb-3 p-2 rounded-lg bg-green-100 border border-green-200 w-8 h-8">
                    <div className="opacity-60" title="Quote start">
                      <Check size={14} />
                    </div>
                  </div>

                  {/* Start Node */}
                  <div className="min-h-[100px]">
                    <StartNode />
                  </div>
                </div>

                {/* Arrow Connector to first layer */}
                {layers.length > 0 && (
                  <div className="flex items-center justify-center w-8 text-gray-400 mt-12">
                    <ChevronRight size={20} />
                  </div>
                )}
              </div>

              {layers.map((layerIndex, index) => (
                <div key={layerIndex} className="flex items-start">
                  {/* Layer Column */}
                  <div className={`flex flex-col ${draggedColumn === layerIndex ? 'opacity-50 rotate-1 scale-95' : ''} transition-all`}>
                    {/* Column Header with Drag Handle */}
                    <div 
                      className="flex items-center justify-center mb-3 p-2 rounded-lg bg-gray-100 border border-gray-200 cursor-grab active:cursor-grabbing hover:bg-gray-200 w-8 h-8"
                      draggable
                      onDragStart={(e) => handleDragStart(e, layerIndex, 'column')}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, layerIndex, 'column')}
                    >
                      <div 
                        className="opacity-50 hover:opacity-80"
                        title="Drag to reorder stage"
                      >
                        <Move size={14} />
                      </div>
                    </div>

                    {/* Steps in Layer */}
                    <div 
                      className="flex flex-col gap-3 min-h-[100px] p-2 rounded"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, layerIndex, 'step')}
                    >
                      {stepsByLayer[layerIndex].map((step, stepIndex) => (
                        <div
                          key={step.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, step, 'step')}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <StepCard
                            step={step}
                            onEdit={() => {
                              setSelectedStep(step)
                              setSidebarOpen(true)
                            }}
                            onDelete={() => deleteStep(step.id)}
                            onAddAbove={() => addParallelStep(step, 'above')}
                            onAddBelow={() => addParallelStep(step, 'below')}
                            isDragging={draggedStep?.id === step.id}
                            isLastInLayer={stepIndex === stepsByLayer[layerIndex].length - 1}
                            dragHandleProps={{}}
                            isCurrent={currentStepId === step.id}
                            onSetCurrent={setCurrentStep}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Arrow Connector between layers */}
                  {index < layers.length - 1 && (
                    <div className="flex items-center justify-center w-8 text-gray-400 mt-12">
                      <ChevronRight size={20} />
                    </div>
                  )}
                </div>
              ))}

              {/* Add Step Drop Zone */}
              <div className="flex items-center">
                <div
                  className="min-w-[280px] h-[200px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors mt-12"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, -1, 'new')}
                >
                  <button onClick={addNewStep} className="flex flex-col items-center">
                    <Plus size={24} className="mb-2" />
                    <span className="text-sm font-medium">Add Step</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ClientOnly>
      </div>

      {/* Upload and Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Team Members Section */}
        <div className="bg-white border rounded-lg p-6">
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">Project Team</h3>
              <p className="text-sm text-muted-foreground">Key team members assigned to this project</p>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-blue-100 text-blue-700">SA</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">Sarah Anderson</p>
                          <p className="text-xs text-muted-foreground">sarah.a@company.com</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">Project Manager</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">8 years</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Available</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-purple-100 text-purple-700">MC</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">Michael Chen</p>
                          <p className="text-xs text-muted-foreground">m.chen@company.com</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">Lead Developer</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">6 years</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Available</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-orange-100 text-orange-700">ER</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">Emily Rodriguez</p>
                          <p className="text-xs text-muted-foreground">e.rodriguez@company.com</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">UX Designer</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">5 years</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Busy</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-green-100 text-green-700">DJ</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">David Johnson</p>
                          <p className="text-xs text-muted-foreground">d.johnson@company.com</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">DevOps Engineer</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">7 years</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Available</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-pink-100 text-pink-700">LW</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">Lisa Wang</p>
                          <p className="text-xs text-muted-foreground">l.wang@company.com</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">QA Specialist</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">4 years</TableCell>
                    <TableCell className="text-right">
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Available</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white border rounded-lg p-6">
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-gray-900">Workflow Stats</h3>
              <p className="text-sm text-muted-foreground">Overview of this approval process</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <BarChart3 size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Total Steps</p>
                    <p className="text-2xl font-bold text-blue-600">{steps.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-900">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {steps.filter(step => step.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Clock size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {steps.filter(step => step.status === 'pending' || step.status === 'ready').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <AlertCircle size={16} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-900">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">
                      {steps.filter(step => step.status === 'overdue').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated completion:</span>
                <span className="text-gray-900 font-medium">3-5 business days</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Created:</span>
                <span className="text-gray-900 font-medium">Dec 15th, 2024</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="space-y-1 pb-8 border-b px-6">
            <SheetTitle className="text-lg font-semibold">Edit Approval Step</SheetTitle>
            <p className="text-sm text-muted-foreground">Configure the details for this approval step</p>
          </SheetHeader>
          
          {selectedStep && (
            <div className="py-6 px-6 space-y-8">
              {/* Basic Information Section */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="stepTitle" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Step Title
                  </Label>
                  <Input
                    id="stepTitle"
                    value={selectedStep.title}
                    onChange={(e) => updateStepDebounced(selectedStep.id, { title: e.target.value })}
                    className="h-10"
                    placeholder="Enter step title"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="stepAssignee" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Assignee
                  </Label>
                  <Input
                    id="stepAssignee"
                    value={selectedStep.assignee}
                    onChange={(e) => updateStepDebounced(selectedStep.id, { assignee: e.target.value })}
                    className="h-10"
                    placeholder="Enter assignee name"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="stepPersona" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Persona
                  </Label>
                  <Select 
                    value={selectedStep.persona || ''} 
                    onValueChange={(value: PersonaType) => updateStep(selectedStep.id, { persona: value })}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select a persona">
                        {selectedStep.persona && personas[selectedStep.persona] && (
                          <div className="flex items-center gap-2">
                            {React.createElement(personas[selectedStep.persona].icon, { size: 16, className: personas[selectedStep.persona].color.split(' ')[0] })}
                            <span className="font-medium">{personas[selectedStep.persona].name}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {Object.entries(personas).map(([key, persona]) => {
                        const Icon = persona.icon
                        return (
                          <SelectItem key={key} value={key} className="py-3">
                            <div className="flex items-start gap-3">
                              <div className={`p-1.5 rounded-md ${persona.color}`}>
                                <Icon size={16} />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-sm">{persona.name}</span>
                                <span className="text-xs text-muted-foreground leading-relaxed">{persona.description}</span>
                              </div>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Current Step Section */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Current Step</h4>
                  <div className="h-px bg-border"></div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${currentStepId === selectedStep.id ? 'bg-red-500' : 'bg-gray-300'}`} />
                    <span className="text-sm font-medium">
                      {currentStepId === selectedStep.id ? 'This is the current step' : 'Not current step'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(currentStepId === selectedStep.id ? null : selectedStep.id)}
                    className="h-8"
                  >
                    {currentStepId === selectedStep.id ? 'Remove' : 'Set as current'}
                  </Button>
                </div>
              </div>

              {/* Status & Schedule Section */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Status & Schedule</h4>
                  <div className="h-px bg-border"></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="stepStatus" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Status
                    </Label>
                    <Select 
                      value={selectedStep.status} 
                      onValueChange={(value: ApprovalStep['status']) => updateStep(selectedStep.id, { status: value })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                            <span>Pending</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="ready">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                            <span>Ready to start</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="completed">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>Completed</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="overdue">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span>Overdue</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="stepDueDate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Due Date
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-10 w-full pl-3 text-left font-normal",
                            !selectedStep.due_date && "text-muted-foreground"
                          )}
                        >
                          {selectedStep.due_date ? (
                            <CalendarIcon className="mr-2 h-4 w-4" />
                          ) : (
                            <CalendarIcon className="mr-2 h-4 w-4" />
                          )}
                          {selectedStep.due_date ? (
                            formatDate(selectedStep.due_date)
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedStep.due_date ? new Date(selectedStep.due_date) : undefined}
                          onSelect={(date: Date | undefined) => {
                            if (date) {
                              updateStep(selectedStep.id, { due_date: date.toISOString().slice(0, 10) })
                            } else {
                              updateStep(selectedStep.id, { due_date: undefined })
                            }
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              {/* Additional Details Section */}
              <div className="space-y-6">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Additional Details</h4>
                  <div className="h-px bg-border"></div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="stepDescription" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Description
                  </Label>
                  <Input
                    id="stepDescription"
                    placeholder="Optional description or notes"
                    value={selectedStep.description || ''}
                    onChange={(e) => updateStepDebounced(selectedStep.id, { description: e.target.value })}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Danger Zone */}
              <div className="space-y-6 pt-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-destructive uppercase tracking-wide">Danger Zone</h4>
                  <div className="h-px bg-destructive/20"></div>
                </div>
                
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h5 className="text-sm font-medium text-destructive">Delete this step</h5>
                      <p className="text-xs text-muted-foreground">This action cannot be undone. This will permanently delete the approval step.</p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => deleteStep(selectedStep.id)}
                    className="w-full mt-4 h-10"
                    size="sm"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete Step
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
} 
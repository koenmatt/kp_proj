'use client'

import React, { useState, useCallback } from 'react'
import { ClientOnly } from "@/components/client-only"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, Check, Clock, User, Calendar, ChevronRight, GripVertical, Trash2, ArrowUp, ArrowDown } from "lucide-react"

interface ApprovalStep {
  id: string
  title: string
  assignee: string
  assigneeAvatar?: string
  status: 'completed' | 'ready' | 'pending' | 'overdue'
  dueDate?: string
  completedDate?: string
  description?: string
  layerIndex: number
  positionInLayer: number
}

const initialSteps: ApprovalStep[] = [
  {
    id: '1',
    title: 'Quote Created',
    assignee: 'System',
    status: 'completed',
    completedDate: 'Sep 10',
    description: 'Initial quote generation',
    layerIndex: 0,
    positionInLayer: 0
  }
]

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

const StepCard = ({ 
  step, 
  onEdit, 
  onDelete,
  onAddAbove,
  onAddBelow,
  isDragging,
  dragHandleProps,
  isLastInLayer
}: { 
  step: ApprovalStep
  onEdit: () => void
  onDelete: () => void
  onAddAbove: () => void
  onAddBelow: () => void
  isDragging?: boolean
  dragHandleProps?: any
  isLastInLayer?: boolean
}) => {
  return (
    <div className={`relative bg-white border border-gray-200 rounded-lg p-4 min-w-[280px] shadow-sm hover:shadow-md transition-all ${isDragging ? 'opacity-50 rotate-2 scale-105' : ''}`}>
      {/* Drag Handle */}
      <div 
        {...dragHandleProps}
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing opacity-30 hover:opacity-60"
      >
        <GripVertical size={16} />
      </div>

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
      <div className="mb-3 pt-2">
        <StatusBadge status={step.status} />
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 mb-2 pr-16" onClick={onEdit} style={{ cursor: 'pointer' }}>
        {step.title}
      </h3>

      {/* Assignee */}
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-5 w-5">
          <AvatarImage src={step.assigneeAvatar} />
          <AvatarFallback className="text-xs bg-gray-100">
            {step.assignee.split(' ').map(n => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-gray-600">{step.assignee}</span>
      </div>

      {/* Date */}
      <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
        <Calendar size={12} />
        {step.status === 'completed' && step.completedDate && (
          <span>Completed {step.completedDate}</span>
        )}
        {step.status !== 'completed' && step.dueDate && (
          <span>Due {step.dueDate}</span>
        )}
        {!step.completedDate && !step.dueDate && (
          <span>Not set</span>
        )}
      </div>

      {/* Action Buttons */}
      {step.status === 'ready' && (
        <div className="flex gap-2">
          <Button className="flex-1 bg-black hover:bg-gray-800 text-white h-8 text-xs">
            Approve
          </Button>
          <Button variant="outline" size="sm" className="px-2">
            ⋯
          </Button>
        </div>
      )}

      {/* Connector line for parallel steps */}
      {!isLastInLayer && (
        <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-px h-6 bg-gray-300"></div>
      )}
    </div>
  )
}

interface ApprovalFlowChartProps {
  className?: string
}

export function ApprovalFlowChart({ className }: ApprovalFlowChartProps) {
  const [steps, setSteps] = useState<ApprovalStep[]>(initialSteps)
  const [selectedStep, setSelectedStep] = useState<ApprovalStep | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stepCounter, setStepCounter] = useState(2)
  const [draggedStep, setDraggedStep] = useState<ApprovalStep | null>(null)

  // Group steps by layer
  const stepsByLayer = steps.reduce((acc, step) => {
    if (!acc[step.layerIndex]) {
      acc[step.layerIndex] = []
    }
    acc[step.layerIndex].push(step)
    return acc
  }, {} as Record<number, ApprovalStep[]>)

  // Sort each layer by position
  Object.keys(stepsByLayer).forEach(layerKey => {
    stepsByLayer[parseInt(layerKey)].sort((a, b) => a.positionInLayer - b.positionInLayer)
  })

  const layers = Object.keys(stepsByLayer).map(k => parseInt(k)).sort((a, b) => a - b)

  const addNewStep = useCallback(() => {
    const maxLayerIndex = Math.max(...steps.map(s => s.layerIndex))
    const newStep: ApprovalStep = {
      id: stepCounter.toString(),
      title: 'New Approval Step',
      assignee: 'Unassigned',
      status: 'pending',
      description: '',
      layerIndex: maxLayerIndex + 1,
      positionInLayer: 0
    }
    setSteps((prev) => [...prev, newStep])
    setStepCounter((count) => count + 1)
    setSelectedStep(newStep)
    setSidebarOpen(true)
  }, [stepCounter, steps])

  const addParallelStep = useCallback((sourceStep: ApprovalStep, position: 'above' | 'below') => {
    const layerSteps = stepsByLayer[sourceStep.layerIndex] || []
    const newPositionInLayer = position === 'above' 
      ? sourceStep.positionInLayer 
      : sourceStep.positionInLayer + 1

    // Shift positions of steps that need to move down
    const updatedSteps = steps.map(step => {
      if (step.layerIndex === sourceStep.layerIndex && step.positionInLayer >= newPositionInLayer) {
        return { ...step, positionInLayer: step.positionInLayer + 1 }
      }
      return step
    })

    const newStep: ApprovalStep = {
      id: stepCounter.toString(),
      title: 'Parallel Approval',
      assignee: 'Unassigned',
      status: 'pending',
      description: '',
      layerIndex: sourceStep.layerIndex,
      positionInLayer: newPositionInLayer
    }

    setSteps([...updatedSteps, newStep])
    setStepCounter((count) => count + 1)
    setSelectedStep(newStep)
    setSidebarOpen(true)
  }, [stepCounter, steps, stepsByLayer])

  const updateStep = useCallback((stepId: string, updates: Partial<ApprovalStep>) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    )
    if (selectedStep?.id === stepId) {
      setSelectedStep((prev) => prev ? { ...prev, ...updates } : null)
    }
  }, [selectedStep])

  const deleteStep = useCallback((stepId: string) => {
    const stepToDelete = steps.find(s => s.id === stepId)
    if (!stepToDelete) return

    // Remove the step and adjust positions
    const updatedSteps = steps
      .filter((step) => step.id !== stepId)
      .map(step => {
        if (step.layerIndex === stepToDelete.layerIndex && step.positionInLayer > stepToDelete.positionInLayer) {
          return { ...step, positionInLayer: step.positionInLayer - 1 }
        }
        return step
      })

    setSteps(updatedSteps)
    if (selectedStep?.id === stepId) {
      setSidebarOpen(false)
      setSelectedStep(null)
    }
  }, [selectedStep, steps])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, step: ApprovalStep) => {
    setDraggedStep(step)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', step.id)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedStep(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetLayerIndex: number, position?: 'before' | 'after') => {
    e.preventDefault()
    if (!draggedStep) return

    const targetLayer = targetLayerIndex
    let newPosition = 0

    if (position === 'after') {
      const layerSteps = stepsByLayer[targetLayer] || []
      newPosition = layerSteps.length
    }

    // Update the dragged step's position
    setSteps(prev => prev.map(step => {
      if (step.id === draggedStep.id) {
        return {
          ...step,
          layerIndex: targetLayer,
          positionInLayer: newPosition
        }
      }
      return step
    }))

    setDraggedStep(null)
  }, [draggedStep, stepsByLayer])

  // Calculate dynamic height based on number of layers and max steps per layer
  const maxStepsInLayer = Math.max(...layers.map(layer => stepsByLayer[layer]?.length || 0))
  const containerHeight = Math.max(300, layers.length * 100 + maxStepsInLayer * 50)

  return (
    <div className="relative">
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
          className={`w-full bg-gray-50 border rounded-lg p-6 ${className}`}
          style={{ minHeight: containerHeight }}
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
            {layers.map((layerIndex, index) => (
              <div key={layerIndex} className="flex items-center">
                {/* Layer Column */}
                <div 
                  className="flex flex-col gap-3"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, layerIndex)}
                >
                  {stepsByLayer[layerIndex].map((step, stepIndex) => (
                    <div
                      key={step.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, step)}
                      onDragEnd={handleDragEnd}
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
                      />
                    </div>
                  ))}
                </div>

                {/* Arrow Connector between layers */}
                {index < layers.length - 1 && (
                  <div 
                    className="flex items-center justify-center w-8 text-gray-400"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, layerIndex, 'after')}
                  >
                    <ChevronRight size={20} />
                  </div>
                )}
              </div>
            ))}

            {/* Add Step Drop Zone */}
            <div className="flex items-center">
              <div
                className="min-w-[280px] h-[200px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  const maxLayer = Math.max(...layers)
                  handleDrop(e, maxLayer + 1)
                }}
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

      {/* Side Panel */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Approval Step</SheetTitle>
          </SheetHeader>
          
          {selectedStep && (
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="stepTitle">Step Title</Label>
                <Input
                  id="stepTitle"
                  value={selectedStep.title}
                  onChange={(e) => updateStep(selectedStep.id, { title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="stepAssignee">Assignee</Label>
                <Input
                  id="stepAssignee"
                  value={selectedStep.assignee}
                  onChange={(e) => updateStep(selectedStep.id, { assignee: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="stepStatus">Status</Label>
                <Select 
                  value={selectedStep.status} 
                  onValueChange={(value: ApprovalStep['status']) => updateStep(selectedStep.id, { status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="ready">Ready to start</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="stepDueDate">Due Date</Label>
                <Input
                  id="stepDueDate"
                  placeholder="e.g., Sep 20"
                  value={selectedStep.dueDate || ''}
                  onChange={(e) => updateStep(selectedStep.id, { dueDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="stepDescription">Description</Label>
                <Input
                  id="stepDescription"
                  placeholder="Optional description"
                  value={selectedStep.description || ''}
                  onChange={(e) => updateStep(selectedStep.id, { description: e.target.value })}
                />
              </div>

              <div className="pt-4">
                <Button
                  variant="destructive"
                  onClick={() => deleteStep(selectedStep.id)}
                  className="w-full"
                >
                  Delete Step
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
} 
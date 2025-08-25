import { useState, useEffect, useCallback, useRef } from 'react'
import { WorkflowStep } from '@/lib/supabase/workflows'
import { toast } from 'sonner'

interface Workflow {
  id: string
  quote_id: number
  name: string
  status: string
}

export function useWorkflow(quoteId: number | null) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

    // Load workflow and steps (workflow should always exist now)
  const loadWorkflow = useCallback(async () => {
    if (!quoteId || loading || loadingRef.current) return

    loadingRef.current = true
    setLoading(true)
    setError(null)

    try {
      // Get workflow (should always exist)
      const workflowResponse = await fetch(`/api/quotes/${quoteId}/workflow`)
      const workflowData = await workflowResponse.json()

      if (!workflowResponse.ok) {
        throw new Error(workflowData.error || 'Failed to fetch workflow')
      }

      let currentWorkflow = workflowData.workflow

      // If no workflow exists, try to create one (fallback for existing quotes)
      if (!currentWorkflow) {
        console.log('No workflow found, attempting to create one...')
        const createResponse = await fetch(`/api/quotes/${quoteId}/workflow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Approval Workflow' })
        })

        if (createResponse.ok) {
          currentWorkflow = await createResponse.json()
        } else {
          throw new Error('No workflow found for this quote and failed to create one. Please refresh the page.')
        }
      }

      setWorkflow(currentWorkflow)

      // Load steps
      const stepsResponse = await fetch(`/api/workflows/${currentWorkflow.id}/steps`)
      const stepsData = await stepsResponse.json()

      if (!stepsResponse.ok) {
        throw new Error(stepsData.error || 'Failed to fetch steps')
      }

      setSteps(stepsData.steps || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error loading workflow:', err)
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [quoteId])

  // Create step with optimistic update
  const createStep = useCallback(async (stepData: Omit<WorkflowStep, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>) => {
    if (!workflow) return null

    // Generate optimistic ID and create optimistic step
    const optimisticId = `temp-${Date.now()}-${Math.random()}`
    const optimisticStep: WorkflowStep = {
      id: optimisticId,
      workflow_id: workflow.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...stepData
    }

    // Optimistic update - add immediately to UI
    setSteps(prev => [...prev, optimisticStep])

    try {
      const response = await fetch(`/api/workflows/${workflow.id}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stepData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create step')
      }

      const realStep = await response.json()
      
      // Replace optimistic step with real step
      setSteps(prev => prev.map(step => 
        step.id === optimisticId ? realStep : step
      ))
      
      return realStep
    } catch (err) {
      // Rollback optimistic update
      setSteps(prev => prev.filter(step => step.id !== optimisticId))
      const errorMessage = err instanceof Error ? err.message : 'Failed to create step'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    }
  }, [workflow])

  // Update step with optimistic update
  const updateStep = useCallback(async (stepId: string, updates: Partial<WorkflowStep>) => {
    if (!workflow) return null

    // Store original step for rollback
    const originalStep = steps.find(step => step.id === stepId)
    if (!originalStep) return null

    // Optimistic update - apply immediately to UI
    const optimisticStep = { ...originalStep, ...updates }
    setSteps(prev => prev.map(step => step.id === stepId ? optimisticStep : step))

    try {
      const response = await fetch(`/api/workflows/${workflow.id}/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update step')
      }

      const realUpdatedStep = await response.json()
      setSteps(prev => prev.map(step => step.id === stepId ? realUpdatedStep : step))
      return realUpdatedStep
    } catch (err) {
      // Rollback optimistic update
      setSteps(prev => prev.map(step => step.id === stepId ? originalStep : step))
      const errorMessage = err instanceof Error ? err.message : 'Failed to update step'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    }
  }, [workflow, steps])

  // Delete step with optimistic update
  const deleteStep = useCallback(async (stepId: string) => {
    if (!workflow) return

    // Store original steps for rollback
    const originalSteps = [...steps]
    const stepToDelete = steps.find(s => s.id === stepId)
    if (!stepToDelete) return

    // Optimistic update - remove immediately from UI
    const updatedSteps = steps
      .filter((step) => step.id !== stepId)
      .map(step => {
        // Adjust positions of steps in same layer that come after deleted step
        if (step.layer_index === stepToDelete.layer_index && step.position_in_layer > stepToDelete.position_in_layer) {
          return { ...step, position_in_layer: step.position_in_layer - 1 }
        }
        return step
      })

    setSteps(updatedSteps)

    try {
      const response = await fetch(`/api/workflows/${workflow.id}/steps/${stepId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete step')
      }

      // Also update positions in backend if needed
      const stepsToUpdate = updatedSteps
        .filter(step => 
          step.layer_index === stepToDelete.layer_index && 
          step.position_in_layer < stepToDelete.position_in_layer
        )
        .map(step => ({
          id: step.id,
          layer_index: step.layer_index,
          position_in_layer: step.position_in_layer
        }))

      if (stepsToUpdate.length > 0) {
        // Fire and forget - positions already updated optimistically
        fetch(`/api/workflows/${workflow.id}/steps/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepUpdates: stepsToUpdate })
        }).catch(console.error)
      }

    } catch (err) {
      // Rollback optimistic update
      setSteps(originalSteps)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete step'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    }
  }, [workflow, steps])

  // Update current stage (fire and forget - no rollback needed)
  const updateCurrentStage = useCallback(async (currentStepId: string | null) => {
    if (!quoteId) return

    // Fire and forget - this doesn't affect local UI state
    fetch(`/api/quotes/${quoteId}/current-stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStepId })
    }).catch(err => {
      console.error('Failed to update current stage:', err)
      const errorMessage = 'Failed to update current stage'
      setError(errorMessage)
      toast.error(errorMessage)
    })
  }, [quoteId])

  // Reorder steps with optimistic update
  const reorderSteps = useCallback(async (stepUpdates: Array<{ id: string; layer_index: number; position_in_layer: number }>) => {
    if (!workflow) return

    // Store original state for rollback
    const originalSteps = [...steps]

    // Optimistic update - apply immediately to UI
    const optimisticSteps = steps.map(step => {
      const update = stepUpdates.find(u => u.id === step.id)
      if (update) {
        return { ...step, layer_index: update.layer_index, position_in_layer: update.position_in_layer }
      }
      return step
    })

    setSteps(optimisticSteps)

    try {
      const response = await fetch(`/api/workflows/${workflow.id}/steps/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepUpdates })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reorder steps')
      }

      // Success - keep the optimistic update
    } catch (err) {
      // Rollback optimistic update
      setSteps(originalSteps)
      const errorMessage = err instanceof Error ? err.message : 'Failed to reorder steps'
      setError(errorMessage)
      toast.error(errorMessage)
      throw err
    }
  }, [workflow, steps])

  // Load workflow on mount and when quoteId changes
  useEffect(() => {
    // Reset state when quoteId changes
    setWorkflow(null)
    setSteps([])
    setError(null)
    loadingRef.current = false
    
    if (quoteId) {
      loadWorkflow()
    }
  }, [quoteId]) // Remove loadWorkflow from dependencies to prevent infinite loops

  return {
    workflow,
    steps,
    loading,
    error,
    createStep,
    updateStep,
    deleteStep,
    updateCurrentStage,
    reorderSteps,
    refetch: loadWorkflow
  }
} 
'use client'

import React, { useCallback, useMemo, useState } from 'react'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Connection,
  ConnectionMode,
  MarkerType,
  NodeMouseHandler,
  Handle,
  Position,
  EdgeMouseHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { ClientOnly } from "@/components/client-only"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Link, X } from "lucide-react"

// Custom Node Component with hover plus button
function CustomNode({ data, id, selected }: { data: any, id: string, selected?: boolean }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`relative px-4 py-2 bg-white border-2 rounded-lg transition-all ${
        selected ? 'border-blue-500 shadow-lg' : 'border-gray-300'
      } ${isHovered ? 'shadow-md' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 border-2 border-gray-400 bg-white hover:border-blue-500 hover:bg-blue-100" 
      />
      <div className="text-sm font-medium text-gray-800">{data.label}</div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 border-2 border-gray-400 bg-white hover:border-blue-500 hover:bg-blue-100" 
      />
      
      {isHovered && (
        <button
          className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            // Get the addNewNode function from the parent context
            const event = new CustomEvent('addNodeFromPlus', { detail: { sourceNodeId: id } })
            window.dispatchEvent(event)
          }}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}

// Input Node Component
function InputNode({ data, id, selected }: { data: any, id: string, selected?: boolean }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`relative px-4 py-2 bg-green-50 border-2 rounded-lg transition-all ${
        selected ? 'border-green-500 shadow-lg' : 'border-green-300'
      } ${isHovered ? 'shadow-md' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="text-sm font-medium text-green-800">{data.label}</div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 border-2 border-green-400 bg-white hover:border-blue-500 hover:bg-blue-100" 
      />
      
      {isHovered && (
        <button
          className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            const event = new CustomEvent('addNodeFromPlus', { detail: { sourceNodeId: id } })
            window.dispatchEvent(event)
          }}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}

// Output Node Component
function OutputNode({ data, id, selected }: { data: any, id: string, selected?: boolean }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className={`relative px-4 py-2 bg-red-50 border-2 rounded-lg transition-all ${
        selected ? 'border-red-500 shadow-lg' : 'border-red-300'
      } ${isHovered ? 'shadow-md' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 border-2 border-red-400 bg-white hover:border-blue-500 hover:bg-blue-100" 
      />
      <div className="text-sm font-medium text-red-800">{data.label}</div>
      
      {isHovered && (
        <button
          className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
          onClick={(e) => {
            e.stopPropagation()
            const event = new CustomEvent('addNodeFromPlus', { detail: { sourceNodeId: id } })
            window.dispatchEvent(event)
          }}
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}

const initialNodes: Node[] = [
  {
    id: '1',
    position: { x: 100, y: 100 },
    data: { label: 'Quote Created' },
    type: 'input',
  },
]

const initialEdges: Edge[] = []

interface ApprovalFlowChartProps {
  className?: string
}

export function ApprovalFlowChart({ className }: ApprovalFlowChartProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [nodeCounter, setNodeCounter] = useState(2) // Start from 2 since we have node 1
  const [connectionMode, setConnectionMode] = useState(false)
  const [pendingConnection, setPendingConnection] = useState<string | null>(null)

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}-${Date.now()}`,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#64748b', strokeWidth: 2 },
        label: '',
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges],
  )

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    if (connectionMode) {
      if (!pendingConnection) {
        // First node selected - start connection
        setPendingConnection(node.id)
        // Highlight the node
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            style: n.id === node.id 
              ? { ...n.style, border: '3px solid #3b82f6' }
              : n.style
          }))
        )
      } else if (pendingConnection !== node.id) {
        // Second node selected - complete connection
        const newEdge: Edge = {
          id: `e${pendingConnection}-${node.id}-${Date.now()}`,
          source: pendingConnection,
          target: node.id,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#64748b', strokeWidth: 2 },
          label: '',
        }
        setEdges((eds) => [...eds, newEdge])
        setPendingConnection(null)
        // Remove highlighting
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            style: { ...n.style, border: undefined }
          }))
        )
      }
    } else {
      setSelectedNode(node)
      setSelectedEdge(null)
    }
  }, [connectionMode, pendingConnection, setNodes, setEdges])

  const onNodeDoubleClick: NodeMouseHandler = useCallback((event, node) => {
    if (!connectionMode) {
      setSelectedNode(node)
      setSelectedEdge(null)
      setSidebarOpen(true)
    }
  }, [connectionMode])

  const onEdgeClick: EdgeMouseHandler = useCallback((event, edge) => {
    if (!connectionMode) {
      setSelectedEdge(edge)
      setSelectedNode(null)
      setSidebarOpen(true)
    }
  }, [connectionMode])

  const updateNodeLabel = useCallback((nodeId: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label: newLabel } }
          : node
      )
    )
  }, [setNodes])

  const updateEdgeLabel = useCallback((edgeId: string, newLabel: string) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? { ...edge, label: newLabel }
          : edge
      )
    )
  }, [setEdges])

  const addNewNode = useCallback((sourceNodeId?: string, openSidePanel: boolean = false) => {
    const sourceNode = sourceNodeId ? nodes.find(n => n.id === sourceNodeId) : null
    const newNode: Node = {
      id: nodeCounter.toString(),
      position: sourceNode 
        ? { x: sourceNode.position.x + 200, y: sourceNode.position.y }
        : { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: { label: `New Node` },
      type: 'custom',
    }
    setNodes((nds) => [...nds, newNode])
    setNodeCounter((count) => count + 1)

    // If created from a plus button, automatically connect them
    if (sourceNodeId) {
      const newEdge: Edge = {
        id: `e${sourceNodeId}-${nodeCounter}`,
        source: sourceNodeId,
        target: nodeCounter.toString(),
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        style: { stroke: '#64748b', strokeWidth: 2 },
        label: '',
      }
      setEdges((eds) => [...eds, newEdge])
    }

    // Open side panel to configure the new node if requested
    if (openSidePanel) {
      setSelectedNode(newNode)
      setSelectedEdge(null)
      setSidebarOpen(true)
    }
  }, [nodes, setNodes, nodeCounter, setEdges])

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId))
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    setSidebarOpen(false)
    setSelectedNode(null)
  }, [setNodes, setEdges])

  const deleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId))
    setSidebarOpen(false)
    setSelectedEdge(null)
  }, [setEdges])

  const toggleConnectionMode = useCallback(() => {
    setConnectionMode(!connectionMode)
    setPendingConnection(null)
    // Clear any node highlighting
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: { ...n.style, border: undefined }
      }))
    )
  }, [connectionMode, setNodes])

  // Listen for custom events from plus buttons
  React.useEffect(() => {
    const handleAddNodeFromPlus = (event: CustomEvent) => {
      addNewNode(event.detail.sourceNodeId, true) // Open side panel for plus button clicks
    }
    window.addEventListener('addNodeFromPlus', handleAddNodeFromPlus as EventListener)
    return () => {
      window.removeEventListener('addNodeFromPlus', handleAddNodeFromPlus as EventListener)
    }
  }, [addNewNode])

  const nodeTypes = useMemo(() => ({
    custom: CustomNode,
    input: InputNode,
    output: OutputNode,
  }), [])

  return (
    <div className="relative">
      <ClientOnly
        fallback={
          <div className={`w-full h-[600px] bg-background border rounded-lg flex items-center justify-center ${className}`}>
            <div className="space-y-4 text-center">
              <Skeleton className="w-full h-[500px]" />
              <p className="text-sm text-muted-foreground">Loading approval flow...</p>
            </div>
          </div>
        }
      >
        <div className={`w-full h-[600px] bg-background border rounded-lg ${className}`}>
          {/* Top Controls */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              onClick={toggleConnectionMode}
              size="sm"
              variant={connectionMode ? "default" : "outline"}
              className="shadow-lg"
            >
              <Link size={16} className="mr-1" />
              {connectionMode ? 'Exit Connect' : 'Connect Mode'}
            </Button>
            <Button
              onClick={() => addNewNode()}
              size="sm"
              variant="outline"
              className="shadow-lg"
            >
              <Plus size={16} className="mr-1" />
              New Node
            </Button>
          </div>

          {connectionMode && pendingConnection && (
            <div className="absolute top-16 right-4 z-10 bg-blue-100 border border-blue-300 rounded-lg p-2 shadow-lg">
              <p className="text-sm text-blue-800">Click another node to connect</p>
              <Button
                onClick={() => {
                  setPendingConnection(null)
                  setNodes((nds) =>
                    nds.map((n) => ({
                      ...n,
                      style: { ...n.style, border: undefined }
                    }))
                  )
                }}
                size="sm"
                variant="ghost"
                className="mt-1 text-blue-600 hover:text-blue-800"
              >
                <X size={14} className="mr-1" />
                Cancel
              </Button>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeClick={onEdgeClick}
            connectionMode={ConnectionMode.Loose}
            fitView
            attributionPosition="top-right"
            nodeTypes={nodeTypes}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            selectNodesOnDrag={false}
          >
            <Controls />
            <Background variant={'dots' as any} gap={20} size={2} color="#e2e8f0" />
          </ReactFlow>
        </div>
      </ClientOnly>

      {/* Side Panel */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedNode ? 'Edit Node' : 'Edit Connection'}</SheetTitle>
          </SheetHeader>
          
          {selectedNode && (
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="nodeLabel">Node Label</Label>
                <Input
                  id="nodeLabel"
                  value={selectedNode.data.label}
                  onChange={(e) => {
                    const newLabel = e.target.value
                    setSelectedNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, label: newLabel }
                    })
                    updateNodeLabel(selectedNode.id, newLabel)
                  }}
                />
              </div>
              <div>
                <Label>Node ID</Label>
                <Input value={selectedNode.id} disabled />
              </div>
              <div>
                <Label>Node Type</Label>
                <Input value={selectedNode.type || 'custom'} disabled />
              </div>
              <div className="pt-4">
                <Button
                  variant="destructive"
                  onClick={() => deleteNode(selectedNode.id)}
                  className="w-full"
                >
                  Delete Node
                </Button>
              </div>
            </div>
          )}

          {selectedEdge && (
            <div className="mt-6 space-y-4">
              <div>
                <Label htmlFor="edgeLabel">Connection Description</Label>
                <Input
                  id="edgeLabel"
                  placeholder="e.g., Approved, Rejected, Next Step..."
                  value={String(selectedEdge.label || '')}
                  onChange={(e) => {
                    const newLabel = e.target.value
                    setSelectedEdge({
                      ...selectedEdge,
                      label: newLabel
                    })
                    updateEdgeLabel(selectedEdge.id, newLabel)
                  }}
                />
              </div>
              <div>
                <Label>From Node</Label>
                <Input value={selectedEdge.source} disabled />
              </div>
              <div>
                <Label>To Node</Label>
                <Input value={selectedEdge.target} disabled />
              </div>
              <div className="pt-4">
                <Button
                  variant="destructive"
                  onClick={() => deleteEdge(selectedEdge.id)}
                  className="w-full"
                >
                  Delete Connection
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
} 
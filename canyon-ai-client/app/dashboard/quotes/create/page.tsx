"use client"

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Bot, User, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface Message {
  id: string
  messageId?: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  toolStatuses?: ToolStatus[]
}

interface ToolStatus {
  id: string
  tool_name: string
  status: string
  message: string
  timestamp: Date
  completed?: boolean
  file_path?: string
  data?: any
}

export default function CreateQuotePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentResponse, setCurrentResponse] = useState("")
  const [currentToolStatuses, setCurrentToolStatuses] = useState<ToolStatus[]>([])
  const [approvingQuotes, setApprovingQuotes] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const websocketRef = useRef<WebSocket | null>(null)
  const clientIdRef = useRef(crypto.randomUUID())
  const router = useRouter()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, currentResponse])

  // Maintain focus on input after messages update
  useEffect(() => {
    if (inputRef.current && !isStreaming && document.hasFocus()) {
      // Small delay to ensure DOM updates complete
      const timeoutId = setTimeout(() => {
        // Only focus if the user isn't actively interacting with other elements
        if (document.activeElement === document.body || document.activeElement === inputRef.current) {
          inputRef.current?.focus()
        }
      }, 50)
      
      return () => clearTimeout(timeoutId)
    }
  }, [messages, isStreaming])

  useEffect(() => {
    // Initialize WebSocket connection
    const connectWebSocket = () => {
      const ws = new WebSocket(`wss://kp-proj.onrender.com/ws/${clientIdRef.current}`)
      
      ws.onopen = () => {
        console.log("WebSocket connected")
        setIsConnected(true)
      }
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'response_start':
            setIsStreaming(true)
            setCurrentResponse("")
            
            // Create a new assistant message placeholder linked to message_id
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              messageId: data.message_id,
              content: "",
              role: "assistant",
              timestamp: new Date(),
              toolStatuses: []
            }])
            break
            
          case 'response_chunk':
            // Append chunk to the specific message by message_id
            setMessages(prev => {
              const updated = [...prev]
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].messageId === data.message_id) {
                  updated[i] = { ...updated[i], content: (updated[i].content || "") + data.content }
                  break
                }
              }
              return updated
            })
            setCurrentResponse(prev => prev + data.content)
            break
            
          case 'response_complete':
            setIsStreaming(false)
            
            // Finalize the specific message by message_id
            setMessages(prev => {
              const updated = [...prev]
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].messageId === data.message_id) {
                  updated[i] = { ...updated[i], content: data.content }
                  break
                }
              }
              return updated
            })
            setCurrentResponse("")
            break
            
          case 'error':
            setIsStreaming(false)
            console.error("WebSocket error:", data.message)
            const errorMessage: Message = {
              id: crypto.randomUUID(),
              content: `Error: ${data.message}`,
              role: "assistant",
              timestamp: new Date(),
            }
            setMessages(prev => [...prev, errorMessage])
            setCurrentResponse("")
            break
            
          case 'pong':
            console.log("Received pong")
            break
            
          case 'tool_call':
            // Tool call detected - this is for backend processing (hidden from user)
            break
            
          case 'tool_status':
            // Tool status update - attach to the specific message by message_id
            const statusUpdate: ToolStatus = {
              id: crypto.randomUUID(),
              tool_name: data.tool_name,
              status: data.status,
              message: data.message,
              timestamp: new Date(),
            }
            
            setMessages(prev => {
              const updated = [...prev]
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].messageId === data.message_id) {
                  const existing = updated[i].toolStatuses || []
                  const exists = existing.some(s => s.tool_name === data.tool_name && s.status === data.status)
                  if (!exists) {
                    updated[i] = { ...updated[i], toolStatuses: [...existing, statusUpdate] }
                  }
                  break
                }
              }
              return updated
            })
            break
            
          case 'tool_complete':
            // Tool completed successfully - attach to the specific message by message_id
            console.log('tool_complete received:', data.message_id, data.tool_name)
            const completionUpdate: ToolStatus = {
              id: crypto.randomUUID(),
              tool_name: data.tool_name,
              status: "Complete",
              message: `${data.tool_name} completed successfully`,
              timestamp: new Date(),
              completed: true,
              file_path: data.file_path,
              data: data.data,
            }
            
            setMessages(prev => {
              const updated = [...prev]
              let idx = updated.findIndex(m => m.messageId === data.message_id)
              
              // Fallback: if not found by id, find the last assistant message that already shows this tool
              if (idx === -1) {
                for (let i = updated.length - 1; i >= 0; i--) {
                  if (updated[i].role === 'assistant' && (updated[i].toolStatuses || []).some(s => s.tool_name === data.tool_name)) {
                    idx = i
                    break
                  }
                }
              }
              
              if (idx !== -1) {
                const existing = updated[idx].toolStatuses || []
                let replaced = false
                const updatedStatuses = existing.map(s => {
                  if (s.tool_name === data.tool_name) {
                    replaced = true
                    return completionUpdate
                  }
                  return s
                })
                if (!replaced) updatedStatuses.push(completionUpdate)
                updated[idx] = { ...updated[idx], toolStatuses: updatedStatuses }
              } else {
                console.warn('tool_complete: no target message found for message_id', data.message_id)
              }
              return updated
            })
            break
            
          case 'tool_error':
            // Tool execution failed - update the current tool statuses and latest message
            const errorUpdate: ToolStatus = {
              id: crypto.randomUUID(),
              tool_name: data.tool_name,
              status: "Error",
              message: `Error: ${data.error}`,
              timestamp: new Date(),
              completed: true,
            }
            
            // Update current tool statuses
            setCurrentToolStatuses(prev => 
              prev.map(status => 
                status.tool_name === data.tool_name ? errorUpdate : status
              )
            )
            
            // Also update the latest assistant message if it exists
            setMessages(prev => {
              const updatedMessages = [...prev]
              // Find the latest assistant message and update its tool status
              for (let i = updatedMessages.length - 1; i >= 0; i--) {
                if (updatedMessages[i].role === "assistant") {
                  const existingStatuses = updatedMessages[i].toolStatuses || []
                  // Replace the matching tool status with the error update
                  const updatedStatuses = existingStatuses.map(status => 
                    status.tool_name === data.tool_name ? errorUpdate : status
                  )
                  // If no matching status found, add the error update
                  if (!existingStatuses.some(status => status.tool_name === data.tool_name)) {
                    updatedStatuses.push(errorUpdate)
                  }
                  
                  updatedMessages[i] = {
                    ...updatedMessages[i],
                    toolStatuses: updatedStatuses
                  }
                  break
                }
              }
              return updatedMessages
            })
            break
        }
      }
      
      ws.onclose = () => {
        console.log("WebSocket disconnected")
        setIsConnected(false)
        setIsStreaming(false)
        
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          if (websocketRef.current?.readyState === WebSocket.CLOSED) {
            connectWebSocket()
          }
        }, 3000)
      }
      
      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        setIsConnected(false)
        setIsStreaming(false)
      }
      
      websocketRef.current = ws
    }
    
    connectWebSocket()
    
    // Cleanup on unmount
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close()
      }
    }
  }, [])

  const handleSendMessage = () => {
    if (!inputValue.trim() || !isConnected || isStreaming) return

    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: inputValue,
      role: "user",
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, newMessage])
    
    // Clear any previous tool statuses when starting a new conversation
    setCurrentToolStatuses([])
    
    // Send message to WebSocket with conversation history
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      const messageData = {
        type: "chat_message",
        message: newMessage,
        history: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      }
      
      websocketRef.current.send(JSON.stringify(messageData))
    }
    
    setInputValue("")
    
    // Maintain focus on input after sending
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleFileClick = (filePath: string) => {
    console.log("Downloading file:", filePath)
    
    // Check if it's a real URL (from Supabase) or a mock path
    if (filePath.startsWith('http')) {
      // Real presigned URL - create download link with proper filename
      const filename = filePath.split('/').pop()?.split('?')[0] || 'quote.pdf'
      
      const link = document.createElement('a')
      link.href = filePath
      link.download = filename
      link.target = '_blank'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log(`Download initiated from URL: ${filePath}`)
    } else {
      // Fallback for mock paths
      const filename = filePath.split('/').pop() || 'document.pdf'
      
      // Create a temporary download link (simulated download)
      const link = document.createElement('a')
      link.href = '#' // Mock download
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      console.log(`Mock download initiated for: ${filename}`)
    }
  }

  const handleApproveQuote = async (toolStatus: ToolStatus) => {
    if (!toolStatus.file_path || !toolStatus.data) {
      console.error("Missing required data for quote approval")
      return
    }

    const statusId = toolStatus.id
    setApprovingQuotes(prev => new Set(prev).add(statusId))

    try {
      // Create quote in Supabase
      const quoteData = {
        customer_name: toolStatus.data.customer_name || 'Unknown Customer',
        quote_name: toolStatus.data.quote_name || 'Quote',
        total_amount: toolStatus.data.total_amount || 0,
        generated_order_form_url: toolStatus.file_path,
        status: 'approved',
        created_at: new Date().toISOString()
      }

      console.log("Creating quote with data:", quoteData)

      // Make API call to create quote (you'll need to create this API endpoint)
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData),
      })

      if (!response.ok) {
        throw new Error(`Failed to create quote: ${response.statusText}`)
      }

      const createdQuote = await response.json()
      console.log("Quote created successfully:", createdQuote)

      // Navigate to the quote page
      router.push(`/dashboard/quotes/${createdQuote.id}`)

    } catch (error) {
      console.error("Error approving quote:", error)
      alert("Failed to approve quote. Please try again.")
    } finally {
      setApprovingQuotes(prev => {
        const newSet = new Set(prev)
        newSet.delete(statusId)
        return newSet
      })
    }
  }

  // Render messages directly; streaming updates are applied to the existing message via messageId
  const displayMessages = messages

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] -my-4 md:-my-6">
      {/* Header with Breadcrumbs */}
      <div className="px-4 lg:px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard/quotes">Quotes</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>AI Assistant</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        
        {/* Connection Status */}
        <div className="mt-2 flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-muted-foreground">
            {isConnected ? 'Connected to AI' : 'Disconnected'}
          </span>
          {isStreaming && (
            <span className="text-blue-500 animate-pulse">• Responding...</span>
          )}
        </div>
      </div>



      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 min-h-0">
        <div className="max-w-4xl mx-auto space-y-4 h-full">
          {displayMessages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Welcome to Canyon AI</h3>
              <p className="text-muted-foreground">
                Chat with the AI assistant to generate a quote.
              </p>
            </div>
          ) : (
            displayMessages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback>
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <Card className={`max-w-[80%] p-4 ${
                    message.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  } ${message.id === "streaming" ? "animate-pulse" : ""}`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.id !== "streaming" && (
                      <p className={`text-xs mt-2 ${
                        message.role === "user" 
                          ? "text-primary-foreground/70" 
                          : "text-muted-foreground"
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    )}
                  </Card>

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>

                {/* Tool Status Display for Assistant Messages - positioned below the message */}
                {message.role === "assistant" && message.toolStatuses && message.toolStatuses.length > 0 && (
                  <div className="flex justify-start">
                    <div className="ml-11 space-y-2 max-w-md"> {/* ml-11 to align with message content (avatar + gap) */}
                      {message.toolStatuses.map((status) => (
                        <div
                          key={status.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            status.completed
                              ? status.status === "Error"
                                ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                                : "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                              : "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                          }`}
                        >
                          {status.completed ? (
                            status.status === "Error" ? (
                              <>
                                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                    {status.status}
                                  </p>
                                  <p className="text-xs text-red-600 dark:text-red-400">
                                    {status.message}
                                  </p>
                                </div>
                              </>
                            ) : status.file_path ? (
                              <div className="flex flex-col items-center gap-3 w-full">
                                <div 
                                  className="flex flex-col items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 group"
                                  onClick={() => handleFileClick(status.file_path!)}
                                >
                                  <FileText className="h-8 w-8 text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors" />
                                  <p className="text-xs text-center text-gray-700 dark:text-gray-300 font-medium max-w-[120px] truncate">
                                    {status.file_path.split('/').pop()}
                                  </p>
                                </div>
                                {status.tool_name === 'generate_quote' && (
                                  <Button
                                    onClick={() => handleApproveQuote(status)}
                                    disabled={approvingQuotes.has(status.id)}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-xs"
                                  >
                                    {approvingQuotes.has(status.id) ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                        Approving...
                                      </>
                                    ) : (
                                      'Approve Quote'
                                    )}
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                                    {status.status}
                                  </p>
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    {status.message}
                                  </p>
                                </div>
                              </>
                            )
                          ) : (
                            <>
                              <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                  {status.status}
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                  {status.message}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 lg:px-6 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? "Type your message..." : "Connecting to AI..."}
              disabled={!isConnected || isStreaming}
              className="flex-1 min-h-[2.5rem] max-h-32 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={1}
              style={{
                height: 'auto',
                minHeight: '2.5rem'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || !isConnected || isStreaming}
              size="icon"
              className="h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
} 
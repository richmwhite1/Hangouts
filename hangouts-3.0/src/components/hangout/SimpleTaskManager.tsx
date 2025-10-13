'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { CheckCircle, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { logger } from '@/lib/logger'
interface Task {
  id: string
  text: string
  assignedTo: Array<{
    id: string
    name: string
    username: string
    avatar?: string
  }>
  createdBy: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  createdAt: string
}
interface SimpleTaskManagerProps {
  hangoutId: string
  currentUser: {
    id: string
    name: string
    username: string
  }
  isHost: boolean
}
export default function SimpleTaskManager({ hangoutId, currentUser, isHost }: SimpleTaskManagerProps) {
  const { getToken } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskText, setNewTaskText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Load tasks from API
  const fetchTasks = async () => {
    try {
      setIsLoading(true)
      const token = await getToken()
      const response = await fetch(`/api/hangouts/${hangoutId}/tasks`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTasks(data.data.tasks)
        }
      }
    } catch (error) {
      logger.error('Error fetching tasks:', error);
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => {
    fetchTasks()
  }, [hangoutId])
  // Auto-expand when tasks are loaded and there are tasks
  useEffect(() => {
    if (tasks.length > 0) {
      setIsExpanded(true)
    }
  }, [tasks])
  const addTask = async () => {
    if (!newTaskText.trim()) return
    try {
      setIsLoading(true)
      const token = await getToken()
      const response = await fetch(`/api/hangouts/${hangoutId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ text: newTaskText.trim() })
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTasks(prev => [...prev, data.data.task])
          setNewTaskText('')
          // Keep expanded when adding new tasks
          setIsExpanded(true)
        }
      }
    } catch (error) {
      logger.error('Error adding task:', error);
    } finally {
      setIsLoading(false)
    }
  }
  const toggleTaskAssignment = async (taskId: string) => {
    try {
      const token = await getToken()
      const response = await fetch(`/api/hangouts/${hangoutId}/tasks/${taskId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Update the task in the local state
          setTasks(prev => prev.map(task =>
            task.id === taskId ? data.data.task : task
          ))
        }
      }
    } catch (error) {
      logger.error('Error toggling task assignment:', error);
    }
  }
  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask()
    }
  }
  return (
    <div className="bg-gray-900/30 border border-gray-700/50 rounded-md p-3">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          Tasks ({tasks.length})
          {tasks.length === 0 && (
            <span className="text-xs text-gray-500 ml-1">(click to add tasks)</span>
          )}
        </h3>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </div>
      {isExpanded && (
        <>
          {/* Add new task - only for host/co-host */}
          {isHost && (
            <div className="mb-3 mt-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add task..."
                  className="flex-1 bg-gray-800/50 border border-gray-600/50 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                  maxLength={100}
                />
                <button
                  onClick={addTask}
                  disabled={!newTaskText.trim() || isLoading}
                  className="px-2 py-1.5 bg-purple-600/80 text-white text-xs rounded hover:bg-purple-700/80 disabled:bg-gray-700/50 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {isLoading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          )}
          {/* Tasks list */}
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                {isHost ? (
                  <div>
                    <p>No tasks yet. Add one above to get started!</p>
                  </div>
                ) : (
                  <div>
                    <p>No tasks yet. The host will add tasks soon.</p>
                  </div>
                )}
              </div>
            ) : (
              tasks.map((task) => (
            <div
              key={task.id}
              className="bg-gray-800/30 border border-gray-600/30 rounded p-2 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm leading-relaxed">{task.text}</p>
                  {/* Assigned users */}
                  {task.assignedTo.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.assignedTo.map((user, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-600/20 text-green-400"
                        >
                          {user.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {/* Checkbox for assignment */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={task.assignedTo.some(user => user.id === currentUser.id)}
                      onChange={() => toggleTaskAssignment(task.id)}
                      className="w-3.5 h-3.5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-1"
                    />
                  </div>
                  {/* Delete button - only for host/co-host */}
                  {isHost && (
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-0.5 text-gray-500 hover:text-red-400 transition-colors"
                      title="Delete task"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
          </div>
        </>
      )}
    </div>
  )
}
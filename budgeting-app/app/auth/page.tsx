"use client"

import { useState } from "react"
import { Users } from "lucide-react"
import { AuthForm } from "@/components/auth/auth-form"

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login")

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md space-y-6">
        {mode === "register" && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <Users className="w-4 h-4" />
              <span>This app is designed for small groups to manage finances together</span>
            </div>
          </div>
        )}
        
        <AuthForm mode={mode} onToggleMode={toggleMode} />
      </div>
    </div>
  )
} 
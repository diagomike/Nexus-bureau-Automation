"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { type Personnel, storageService } from "@/lib/storage"

interface AuthContextType {
  user: Personnel | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Personnel | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Initialize sample data
    storageService.initializeSampleData()

    // Check for existing session
    const savedUserId = localStorage.getItem("nexus_current_user")
    if (savedUserId) {
      const savedUser = storageService.getPersonnelById(savedUserId)
      if (savedUser) {
        setUser(savedUser)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    const personnel = storageService.authenticatePersonnel(email, password)
    if (personnel) {
      setUser(personnel)
      localStorage.setItem("nexus_current_user", personnel.id)
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("nexus_current_user")
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

import { storageService, type Personnel } from "./storage"

export class AuthService {
  private static readonly SESSION_KEY = "nexus_session"

  static getCurrentUser(): Personnel | null {
    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      if (!sessionData) return null

      const userData = JSON.parse(sessionData)
      // Verify user still exists in storage
      const currentUser = storageService.getPersonnelById(userData.id)
      if (!currentUser) {
        this.logout()
        return null
      }
      return currentUser
    } catch (error) {
      this.logout()
      return null
    }
  }

  static async login(email: string, password: string): Promise<Personnel | null> {
    const personnel = storageService.authenticatePersonnel(email, password)
    if (personnel) {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(personnel))
      return personnel
    }
    return null
  }

  static logout(): void {
    localStorage.removeItem(this.SESSION_KEY)
  }

  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null
  }

  static updateSession(user: Personnel): void {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(user))
  }
}

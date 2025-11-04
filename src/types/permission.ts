interface User {
  id: string
  username: string
  email: string
  role: "admin" | "kitchen" | "customer"
  createdAt: string
}

interface Permission {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface UserPermission {
  id: string
  userId: string
  permissionId: string
  assignedBy: string
  assignedAt: string
  createdAt: string
  updatedAt: string
}
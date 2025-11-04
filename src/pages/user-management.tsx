"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Search, Plus, Trash2, Edit2, Users, ShieldCheck } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { apiRequest } from "@/lib/queryClient"

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

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [permissionsLoading, setPermissionsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userPermissions, setUserPermissions] = useState<Record<string, string[]>>({})

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"admin" | "kitchen" | "customer">("customer")
  const [showPassword, setShowPassword] = useState(false)
  const [editUsername, setEditUsername] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRole, setEditRole] = useState<"admin" | "kitchen" | "customer">("customer")
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<string[]>([])

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users

    const term = searchTerm.toLowerCase()
    return users.filter((user) => user.username.toLowerCase().includes(term) || user.email.toLowerCase().includes(term))
  }, [users, searchTerm])

  const { toast } = useToast()

  useEffect(() => {
    fetchUsers()
    fetchPermissions()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await apiRequest("GET", "/api/users")
      const data = await response.json()
      setUsers(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      setPermissionsLoading(true)
      const response = await apiRequest("GET", "/api/users-permissions")
      const data = await response.json()
      setPermissions(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch permissions",
        variant: "destructive",
      })
    } finally {
      setPermissionsLoading(false)
    }
  }

  const fetchUserPermissions = async (userId: string) => {
    try {
      const response = await apiRequest("GET", `/api/users/${userId}/permissions`)
      const data = await response.json()
      return data.map((perm: Permission) => perm.name)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to fetch permissions for user ${userId}`,
        variant: "destructive",
      })
      return []
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await apiRequest("POST", "/api/users", {
        username,
        email,
        password,
        role,
      })

      toast({
        title: "Success",
        description: "User created successfully",
      })

      setUsername("")
      setEmail("")
      setPassword("")
      setRole("customer")
      setShowCreateModal(false)

      fetchUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return
    }

    try {
      await apiRequest("DELETE", `/api/users/${userId}`)

      toast({
        title: "Success",
        description: "User deleted successfully",
      })

      fetchUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleEditUser = async (user: User) => {
    setEditingUser(user)
    setEditUsername(user.username)
    setEditEmail(user.email)
    setEditRole(user.role)
    
    // Fetch user's current permissions
    const userPerms = await fetchUserPermissions(user.id)
    setSelectedUserPermissions(userPerms)
    setShowEditModal(true)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingUser) return

    try {
      await apiRequest("PATCH", `/api/users/${editingUser.id}`, {
        username: editUsername,
        email: editEmail,
        role: editRole,
      })

      // Update user permissions
      await updatePermissions(editingUser.id, selectedUserPermissions)

      toast({
        title: "Success",
        description: "User updated successfully",
      })

      setShowEditModal(false)
      setEditingUser(null)
      setEditUsername("")
      setEditEmail("")
      setEditRole("customer")
      setSelectedUserPermissions([])

      fetchUsers()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      })
    }
  }

  const updatePermissions = async (userId: string, newPermissions: string[]) => {
    if (!editingUser) return;

    // Get current permissions for this user
    const currentPermissions = await fetchUserPermissions(userId)

    // Find permissions to add
    const permissionsToAdd = newPermissions.filter(perm => !currentPermissions.includes(perm))

    // Find permissions to remove
    const permissionsToRemove = currentPermissions.filter(perm => !newPermissions.includes(perm))

    // Add new permissions
    for (const permissionName of permissionsToAdd) {
      try {
        await apiRequest("POST", `/api/users/${userId}/permissions`, {
          permissionName
        })
      } catch (error) {
        console.error(`Failed to add permission ${permissionName} to user ${userId}:`, error)
      }
    }

    // Remove permissions
    for (const permissionName of permissionsToRemove) {
      try {
        await apiRequest("DELETE", `/api/users/${userId}/permissions`, {
          permissionName
        })
      } catch (error) {
        console.error(`Failed to remove permission ${permissionName} from user ${userId}:`, error)
      }
    }
  }

  const handlePermissionChange = (permissionName: string) => {
    setSelectedUserPermissions(prev => {
      if (prev.includes(permissionName)) {
        return prev.filter(p => p !== permissionName)
      } else {
        return [...prev, permissionName]
      }
    })
  }

  // Function to check if a permission is currently assigned to the user
  const isPermissionSelected = (permissionName: string) => {
    return selectedUserPermissions.includes(permissionName);
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-blue-500/15 text-blue-600 border border-blue-200"
      case "kitchen":
        return "bg-[#50BAA8]/15 text-[#50BAA8] border border-[#50BAA8]/30"
      case "customer":
        return "bg-green-500/15 text-green-600 border border-green-200"
      default:
        return "bg-gray-500/15 text-gray-600 border border-gray-200"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#50BAA8]/10 rounded-lg">
              <Users className="w-6 h-6 text-[#50BAA8]" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900">User Management</h1>
          </div>
          <p className="text-slate-600 ml-11">Manage users, roles, and permissions across your system</p>
        </div>

        {/* Search and Action Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by username or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-11 bg-white border-slate-200 focus:border-[#50BAA8] focus:ring-[#50BAA8]/20"
            />
          </div>

          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="bg-[#50BAA8] hover:bg-[#3d9a8f] text-white h-11 gap-2">
                <Plus className="w-5 h-5" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl">Create New User</DialogTitle>
                <DialogDescription>Add a new user to the system with their credentials and role</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateUser} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-slate-700 font-medium">
                    Username
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    required
                    className="border-slate-200 focus:border-[#50BAA8] focus:ring-[#50BAA8]/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                    className="border-slate-200 focus:border-[#50BAA8] focus:ring-[#50BAA8]/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="pr-10 border-slate-200 focus:border-[#50BAA8] focus:ring-[#50BAA8]/20"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-700"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-slate-700 font-medium">
                    Role
                  </Label>
                  <Select value={role} onValueChange={(value: any) => setRole(value)}>
                    <SelectTrigger className="border-slate-200 focus:border-[#50BAA8] focus:ring-[#50BAA8]/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-[#50BAA8] hover:bg-[#3d9a8f] text-white">
                    Create User
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Users Table Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle className="text-xl text-slate-900">Users List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-[#50BAA8] rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-slate-600">Loading users...</p>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No users found</p>
                  <p className="text-slate-500 text-sm">Try adjusting your search or create a new user</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-4 px-6 font-semibold text-slate-700">Username</th>
                      <th className="text-left py-4 px-6 font-semibold text-slate-700">Email</th>
                      <th className="text-left py-4 px-6 font-semibold text-slate-700">Role</th>
                      <th className="text-left py-4 px-6 font-semibold text-slate-700">Created</th>
                      <th className="text-right py-4 px-6 font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr
                        key={user.id}
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                      >
                        <td className="py-4 px-6">
                          <span className="font-medium text-slate-900">{user.username}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-600">{user.email}</td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                          >
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-600 text-sm">
                          {new Date(user.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="border-slate-200 hover:bg-slate-100 gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="border-red-200 text-red-600 hover:bg-red-50 gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Edit User</DialogTitle>
              <DialogDescription>Update user details and permissions</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateUser} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="edit-username" className="text-slate-700 font-medium">
                  Username
                </Label>
                <Input
                  id="edit-username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  className="border-slate-200 focus:border-[#50BAA8] focus:ring-[#50BAA8]/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-slate-700 font-medium">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                  className="border-slate-200 focus:border-[#50BAA8] focus:ring-[#50BAA8]/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-slate-700 font-medium">
                  Role
                </Label>
                <Select value={editRole} onValueChange={(value: any) => setEditRole(value)}>
                  <SelectTrigger className="border-slate-200 focus:border-[#50BAA8] focus:ring-[#50BAA8]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="kitchen">Kitchen</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Permissions Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-slate-600" />
                  <Label className="text-slate-700 font-medium">
                    Permissions
                  </Label>
                </div>
                
                {permissionsLoading ? (
                  <div className="flex items-center justify-center h-24">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-[#50BAA8] rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-slate-600 text-sm">Loading permissions...</p>
                    </div>
                  </div>
                ) : permissions.length === 0 ? (
                  <p className="text-slate-500 text-sm">No permissions available</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 border border-slate-200 rounded-md">
                    {permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded">
                        <Checkbox
                          id={`perm-${permission.id}`}
                          checked={isPermissionSelected(permission.name)}
                          onCheckedChange={() => handlePermissionChange(permission.name)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <Label
                            htmlFor={`perm-${permission.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {permission.name}
                          </Label>
                          {permission.description && (
                            <p className="text-xs text-slate-500">
                              {permission.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#50BAA8] hover:bg-[#3d9a8f] text-white">
                  Update User
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

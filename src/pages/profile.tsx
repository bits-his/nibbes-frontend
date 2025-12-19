import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Loader2, 
  User, 
  Mail, 
  UserRoundPen, 
  Save, 
  Lock, 
  Calendar,
  Shield,
  Trash2,
  Camera,
  CheckCircle,
  Eye,
  EyeOff,
  Key,
  Bell,
  Palette
} from 'lucide-react';
import { apiRequest, BACKEND_URL } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
  phone?: string;
  avatar?: string;
  notificationsEnabled?: boolean;
  theme?: 'light' | 'dark' | 'system';
}

const ProfilePage: React.FC = () => {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (user) {
      const userProfile: UserProfile = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || new Date().toISOString(),
        phone: user.phone || '',
        avatar: user.avatar,
        notificationsEnabled: user.notificationsEnabled ?? true,
        theme: user.theme || 'system'
      };
      
      setProfile(userProfile);
      setFormData({
        username: user.username,
        email: user.email,
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    
    try {
      const response = await apiRequest('PATCH', '/api/auth/me', {
        username: formData.username,
        email: formData.email,
        phone: formData.phone
      });

      if (response.ok) {
        const data = await response.json();
        const updatedProfile = {
          ...profile,
          username: data.user.username,
          email: data.user.email,
          phone: data.user.phone,
          updatedAt: data.user.updatedAt
        };
        setProfile(updatedProfile);

        login(updatedProfile, localStorage.getItem('token') || '');

        toast({
          title: 'Profile Updated',
          description: 'Your profile has been updated successfully.',
          action: <CheckCircle className="h-5 w-5 text-green-500" />
        });
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        toast({
          title: 'Update Failed',
          description: errorData.error || 'Failed to update profile',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    
    try {
      const response = await apiRequest('POST', '/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });

      if (response.ok) {
        toast({
          title: 'Password Updated',
          description: 'Your password has been changed successfully.',
          action: <CheckCircle className="h-5 w-5 text-green-500" />
        });
        setShowChangePassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Update Failed',
          description: errorData.error || 'Failed to update password',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        username: profile.username,
        email: profile.email,
        phone: profile.phone || ''
      });
    }
    setIsEditing(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Add file validation here (size, type, etc.)
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/auth/avatar`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(prev => prev ? { ...prev, avatar: data.avatarUrl } : null);
        toast({
          title: 'Avatar Updated',
          description: 'Your profile picture has been updated.',
          action: <CheckCircle className="h-5 w-5 text-green-500" />
        });
      }
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload avatar. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'kitchen': return 'default';
      case 'customer': return 'secondary';
      default: return 'outline';
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#50BAA8] mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#50BAA8] to-[#3A8E7D] bg-clip-text text-transparent">
          Profile Settings
        </h1>
        <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
          Manage your account settings, security preferences, and personal information
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto bg-gray-100/50 p-1 rounded-2xl">
          <TabsTrigger 
            value="profile" 
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger 
            value="preferences" 
            className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Palette className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#50BAA8] to-[#3A8E7D] text-white pb-8">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">Personal Information</CardTitle>
                  <CardDescription className="text-white/80">
                    Update your personal details and profile information
                  </CardDescription>
                </div>
                <Badge variant={getRoleBadgeVariant(profile.role)} className="capitalize">
                  {profile.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Avatar Section */}
                <div className="lg:col-span-1 flex flex-col items-center space-y-4">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[#50BAA8] to-[#3A8E7D] flex items-center justify-center text-white text-4xl font-bold shadow-lg border-4 border-white">
                      {profile.avatar ? (
                        <img 
                          src={profile.avatar} 
                          alt={profile.username}
                          className="w-full h-full rounded-2xl object-cover"
                        />
                      ) : (
                        profile.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <label htmlFor="avatar-upload" className="absolute bottom-2 right-2 bg-white rounded-full p-2 border-2 border-[#50BAA8] shadow-lg cursor-pointer transition-all hover:scale-110">
                      <Camera className="h-4 w-4 text-[#50BAA8]" />
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </label>
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-gray-800">{profile.username}</h3>
                    <p className="text-sm text-gray-600">{profile.email}</p>
                  </div>
                </div>

                {/* Form Section */}
                <div className="lg:col-span-3 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-gray-700 font-medium">Username</Label>
                      {isEditing ? (
                        <Input
                          id="username"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className="bg-gray-50 border-gray-200 focus:ring-2 focus:ring-[#50BAA8] focus:border-[#50BAA8] transition-colors"
                          placeholder="Enter your username"
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center">
                          <User className="h-4 w-4 mr-3 text-gray-500" />
                          <span className="text-gray-900">{profile.username}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                      {isEditing ? (
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="bg-gray-50 border-gray-200 focus:ring-2 focus:ring-[#50BAA8] focus:border-[#50BAA8] transition-colors"
                          placeholder="Enter your email"
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center">
                          <Mail className="h-4 w-4 mr-3 text-gray-500" />
                          <span className="text-gray-900">{profile.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-700 font-medium">Phone Number</Label>
                      {isEditing ? (
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="bg-gray-50 border-gray-200 focus:ring-2 focus:ring-[#50BAA8] focus:border-[#50BAA8] transition-colors"
                          placeholder="Enter your phone number"
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <span className="text-gray-900">{profile.phone || 'Not provided'}</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Member Since</Label>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center">
                        <Calendar className="h-4 w-4 mr-3 text-gray-500" />
                        <span className="text-gray-900">
                          {new Date(profile.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end space-x-3">
                    {isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                          className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-gradient-to-r from-[#50BAA8] to-[#3A8E7D] hover:from-[#4aa595] hover:to-[#357d6d] text-white px-6 shadow-lg shadow-[#50BAA8]/25"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-gradient-to-r from-[#50BAA8] to-[#3A8E7D] hover:from-[#4aa595] hover:to-[#357d6d] text-white px-6 shadow-lg shadow-[#50BAA8]/25"
                      >
                        <UserRoundPen className="mr-2 h-4 w-4" />
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#50BAA8] to-[#3A8E7D] text-white">
              <CardTitle className="text-2xl font-bold">Security Settings</CardTitle>
              <CardDescription className="text-white/80">
                Manage your password and account security
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              {!showChangePassword ? (
                <div className="space-y-6 max-w-2xl">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <Key className="h-5 w-5 text-gray-600" />
                      <div>
                        <h4 className="font-semibold text-gray-800">Password</h4>
                        <p className="text-sm text-gray-600">Last changed 2 months ago</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setShowChangePassword(true)}
                      className="bg-[#50BAA8] hover:bg-[#4aa595] text-white"
                    >
                      Change Password
                    </Button>
                  </div>

                  <Separator />

                  <div className="p-6 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-red-800 mb-2 flex items-center">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Danger Zone
                    </h4>
                    <p className="text-red-600 text-sm mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
                      Delete Account
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 max-w-2xl">
                  <h3 className="text-lg font-semibold text-gray-800">Change Password</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-gray-700">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          name="currentPassword"
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="bg-gray-50 border-gray-200 focus:ring-2 focus:ring-[#50BAA8] pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('current')}
                        >
                          {showPasswords.current ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-gray-700">New Password</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="bg-gray-50 border-gray-200 focus:ring-2 focus:ring-[#50BAA8] pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('new')}
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className="bg-gray-50 border-gray-200 focus:ring-2 focus:ring-[#50BAA8] pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('confirm')}
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4 text-gray-500" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowChangePassword(false)}
                      className="border-gray-300 text-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePasswordUpdate}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-[#50BAA8] to-[#3A8E7D] hover:from-[#4aa595] hover:to-[#357d6d] text-white"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#50BAA8] to-[#3A8E7D] text-white">
              <CardTitle className="text-2xl font-bold">Preferences</CardTitle>
              <CardDescription className="text-white/80">
                Customize your experience and notification settings
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-5 w-5 text-gray-600" />
                    <div>
                      <h4 className="font-semibold text-gray-800">Email Notifications</h4>
                      <p className="text-sm text-gray-600">Receive updates about your orders and account</p>
                    </div>
                  </div>
                  {/* <Switch 
                    checked={profile.notificationsEnabled} 
                    onCheckedChange={(checked) => setProfile(prev => prev ? {...prev, notificationsEnabled: checked} : null)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Palette className="h-5 w-5 text-gray-600" />
                    <div>
                      <h4 className="font-semibold text-gray-800">Dark Mode</h4>
                      <p className="text-sm text-gray-600">Switch between light and dark themes</p>
                    </div>
                  </div>
                  <Switch /> */}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, User, Mail, UserRoundPen, Save, Lock } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'kitchen' | 'customer';
  createdAt: string;
  updatedAt: string;
}

const ProfilePage: React.FC = () => {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: ''
  });

  useEffect(() => {
    if (user) {
      setProfile({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || new Date().toISOString()
      });
      setFormData({
        username: user.username,
        email: user.email
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

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    
    try {
      const response = await fetch('/api/users/' + profile.id, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email
        })
      });

      if (response.ok) {
        const result = await response.json();
        setProfile(result.user);
        toast({
          title: 'Profile Updated',
          description: 'Your profile has been updated successfully.',
        });
        setIsEditing(false);
      } else {
        const error = await response.json();
        toast({
          title: 'Update Failed',
          description: error.error || 'Failed to update profile',
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

  const handleCancel = () => {
    if (profile) {
      setFormData({
        username: profile.username,
        email: profile.email
      });
    }
    setIsEditing(false);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Card className="shadow-xl border-0 bg-gradient-to-br from-[#50BAA8] to-[#4aa595] text-white">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="bg-white/20 p-4 rounded-full">
              <User className="h-12 w-12" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">User Profile</CardTitle>
          <CardDescription className="text-white/80">
            Manage your account information
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-white rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Picture Section */}
            <div className="md:col-span-1 flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#50BAA8] to-[#4aa595] flex items-center justify-center text-white text-4xl font-bold border-4 border-white shadow-lg">
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute bottom-2 right-2 bg-[#50BAA8] rounded-full p-2 border-2 border-white">
                  <UserRoundPen className="h-4 w-4" />
                </div>
              </div>
              <Button variant="outline" className="mt-4 border-[#50BAA8] text-[#50BAA8] hover:bg-[#50BAA8] hover:text-white">
                Change Photo
              </Button>
            </div>

            {/* User Information Section */}
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-gray-600">Username</Label>
                  {isEditing ? (
                    <Input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="mt-1 bg-gray-50 border-gray-300 focus:ring-[#50BAA8] focus:border-[#50BAA8]"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-200 flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{profile.username}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="text-gray-600">Email</Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="mt-1 bg-gray-50 border-gray-300 focus:ring-[#50BAA8] focus:border-[#50BAA8]"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-200 flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{profile.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-gray-600">Role</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-200 flex items-center">
                    <Lock className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="capitalize">{profile.role}</span>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-600">Member Since</Label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-200">
                    {new Date(profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                {isEditing ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-[#50BAA8] hover:bg-[#4aa595] text-white"
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
                    className="bg-[#50BAA8] hover:bg-[#4aa595] text-white"
                  >
                    <UserRoundPen className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Security</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="border-[#50BAA8] text-[#50BAA8] hover:bg-[#50BAA8] hover:text-white">
                Change Password
              </Button>
              <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
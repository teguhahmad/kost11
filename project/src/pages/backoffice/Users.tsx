import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Plus, Search, Edit, Trash, Loader2, X, Eye, EyeOff, CheckCircle, CreditCard, Phone, Mail, Calendar, Building2, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/formatters';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import SubscriptionForm from '../../components/backoffice/SubscriptionForm';

interface User {
  id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'support';
  name: string;
  created_at: string;
  last_login?: string;
  status: 'active' | 'inactive';
  phone?: string;
  address?: string;
  city?: string;
  company?: string;
  position?: string;
  subscription?: {
    id: string;
    status: 'active' | 'cancelled' | 'expired';
    plan_name: string;
    plan_price: number;
    created_at: string;
  };
}

const BackofficeUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showSubscriptionForm, setShowSubscriptionForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'admin' as const,
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    city: '',
    company: '',
    position: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error('Not authenticated');

      // Get users from the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
        {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to load users');
      }

      const users = await response.json();

      // Get subscriptions for all users
      const { data: subscriptions, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          user_id,
          status,
          created_at,
          subscription_plans (
            name,
            price
          )
        `)
        .order('created_at', { ascending: false });

      if (subscriptionError) throw subscriptionError;

      // Get user profiles
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*');

      if (profileError) throw profileError;

      // Combine user data with subscription and profile data
      const usersWithData = users.map(user => {
        const subscription = subscriptions?.find(s => s.user_id === user.id);
        const profile = profiles?.find(p => p.user_id === user.id);
        
        return {
          ...user,
          subscription: subscription 
            ? {
                id: subscription.id,
                status: subscription.status,
                plan_name: subscription.subscription_plans.name,
                plan_price: subscription.subscription_plans.price,
                created_at: subscription.created_at
              }
            : undefined,
          phone: profile?.phone || '',
          address: profile?.address || '',
          city: profile?.city || '',
          company: profile?.company || '',
          position: profile?.position || ''
        };
      });

      setUsers(usersWithData);
    } catch (err) {
      console.error('Error loading users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
        {
          method: editingUser ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            ...(editingUser ? { userId: editingUser.id } : {}),
            email: formData.email,
            password: formData.password || undefined,
            name: formData.name,
            role: formData.role,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            company: formData.company,
            position: formData.position
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${editingUser ? 'update' : 'create'} user`);
      }

      await loadUsers();
      setShowForm(false);
      setEditingUser(null);
      setFormData({
        email: '',
        name: '',
        role: 'admin',
        password: '',
        confirmPassword: '',
        phone: '',
        address: '',
        city: '',
        company: '',
        position: ''
      });
    } catch (err) {
      console.error('Error managing user:', err);
      setError(err instanceof Error ? err.message : 'Failed to manage user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      password: '',
      confirmPassword: '',
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      company: user.company || '',
      position: user.position || ''
    });
    setShowForm(true);
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ userId: id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      await loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (user: User, newStatus: 'active' | 'inactive') => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('backoffice_users')
        .update({ status: newStatus })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // If activating user, also update auth.users status
      if (newStatus === 'active') {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) throw new Error('Not authenticated');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({ 
              userId: user.id,
              status: newStatus
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update user status');
        }
      }

      await loadUsers();
    } catch (err) {
      console.error('Error updating user status:', err);
      setError('Failed to update user status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = (userId: string) => {
    setSelectedUserId(userId);
    setShowSubscriptionForm(true);
  };

  const handleSubscriptionFormSubmit = async () => {
    await loadUsers();
    setShowSubscriptionForm(false);
    setSelectedUserId(null);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">User Management</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Users</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            <Button 
              icon={<Plus size={16} />}
              onClick={() => {
                setEditingUser(null);
                setFormData({
                  email: '',
                  name: '',
                  role: 'admin',
                  password: '',
                  confirmPassword: '',
                  phone: '',
                  address: '',
                  city: '',
                  company: '',
                  position: ''
                });
                setShowForm(true);
              }}
              disabled={isLoading}
            >
              Add User
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role & Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <Loader2 className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-lg">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="flex items-center text-gray-900">
                            <Phone size={14} className="mr-1" /> {user.phone || '-'}
                          </div>
                          <div className="flex items-center text-gray-500 mt-1">
                            <MapPin size={14} className="mr-1" /> {user.city || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{user.company || '-'}</div>
                          <div className="text-gray-500">{user.position || '-'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-2">
                          <Badge className={
                            user.role === 'superadmin' 
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'admin'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }>
                            {user.role}
                          </Badge>
                          <Badge className={
                            user.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }>
                            {user.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.subscription ? (
                          <div>
                            <Badge className={
                              user.subscription.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : user.subscription.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }>
                              {user.subscription.plan_name}
                            </Badge>
                            <div className="text-sm text-gray-500 mt-1">
                              {formatCurrency(user.subscription.plan_price)}/month
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">No subscription</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {user.last_login ? (
                            format(new Date(user.last_login), 'dd MMM yyyy HH:mm', { locale: id })
                          ) : (
                            'Never'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          {user.role !== 'superadmin' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Eye size={14} />}
                                onClick={() => handleViewDetails(user)}
                                disabled={isLoading}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<Edit size={14} />}
                                onClick={() => handleEditUser(user)}
                                disabled={isLoading}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<CreditCard size={14} />}
                                onClick={() => handleManageSubscription(user.id)}
                                disabled={isLoading}
                              >
                                {user.subscription ? 'Update Plan' : 'Add Plan'}
                              </Button>
                              {user.status === 'active' ? (
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() => handleUpdateStatus(user, 'inactive')}
                                  disabled={isLoading}
                                >
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={() => handleUpdateStatus(user, 'active')}
                                  disabled={isLoading}
                                >
                                  Activate
                                </Button>
                              )}
                              <Button
                                variant="danger"
                                size="sm"
                                icon={<Trash size={14} />}
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={isLoading}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
                  setFormData({
                    email: '',
                    name: '',
                    role: 'admin',
                    password: '',
                    confirmPassword: '',
                    phone: '',
                    address: '',
                    city: '',
                    company: '',
                    position: ''
                  });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!!editingUser}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      role: e.target.value as 'admin' | 'support'
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="admin">Admin</option>
                    <option value="support">Support</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {(!editingUser || formData.password) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {editingUser ? 'New Password (leave blank to keep current)' : 'Password'}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        {...(!editingUser && { required: true })}
                        minLength={8}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        {...(!editingUser && { required: true })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    setFormData({
                      email: '',
                      name: '',
                      role: 'admin',
                      password: '',
                      confirmPassword: '',
                      phone: '',
                      address: '',
                      city: '',
                      company: '',
                      position: ''
                    });
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  icon={isLoading ? <Loader2 className="animate-spin" size={16} /> : undefined}
                >
                  {isLoading ? 'Saving...' : editingUser ? 'Save Changes' : 'Add User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">User Details</h2>
              <button
                onClick={() => {
                  setShowUserDetails(false);
                  setSelectedUser(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="mt-1">{selectedUser.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Email</label>
                      <p className="mt-1">{selectedUser.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="mt-1">{selectedUser.phone || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Address</label>
                      <p className="mt-1">{selectedUser.address || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">City</label>
                      <p className="mt-1">{selectedUser.city || '-'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Role</label>
                      <p className="mt-1">
                        <Badge className={
                          selectedUser.role === 'superadmin' 
                            ? 'bg-purple-100 text-purple-800'
                            : selectedUser.role === 'admin'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }>
                          {selectedUser.role}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p className="mt-1">
                        <Badge className={
                          selectedUser.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }>
                          {selectedUser.status}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Company</label>
                      <p className="mt-1">{selectedUser.company || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Position</label>
                      <p className="mt-1">{selectedUser.position || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created At</label>
                      <p className="mt-1">
                        {format(new Date(selectedUser.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Login</label>
                      <p className="mt-1">
                        {selectedUser.last_login
                          ? format(new Date(selectedUser.last_login), 'dd MMM yyyy HH:mm', { locale: id })
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedUser.subscription && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Plan</label>
                        <p className="mt-1">
                          <Badge className={
                            selectedUser.subscription.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : selectedUser.subscription.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }>
                            {selectedUser.subscription.plan_name}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Price</label>
                        <p className="mt-1">{formatCurrency(selectedUser.subscription.plan_price)}/month</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Started On</label>
                        <p className="mt-1">
                          {format(new Date(selectedUser.subscription.created_at), 'dd MMM yyyy', { locale: id })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUserDetails(false);
                  setSelectedUser(null);
                }}
              >
                Close
              </Button>
              <Button
                variant="outline"
                icon={<Edit size={16} />}
                onClick={() => {
                  setShowUserDetails(false);
                  handleEditUser(selectedUser);
                }}
              >
                Edit User
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Form Modal */}
      {showSubscriptionForm && selectedUserId && (
        <SubscriptionForm
          userId={selectedUserId}
          onClose={() => {
            setShowSubscriptionForm(false);
            setSelectedUserId(null);
          }}
          onSuccess={handleSubscriptionFormSubmit}
        />
      )}
    </div>
  );
};

export default BackofficeUsers;
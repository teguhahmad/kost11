import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Plus, Search, Edit, Trash, Loader2, X, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RolePermission {
  id: string;
  role: string;
  resource: string;
  action: string;
  created_at: string;
}

const RolePermissions: React.FC = () => {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPermission, setEditingPermission] = useState<RolePermission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    role: '',
    resource: '',
    action: ''
  });

  const resources = [
    'users',
    'properties',
    'rooms',
    'tenants',
    'payments',
    'maintenance_requests',
    'reports',
    'settings',
    'notifications'
  ];

  const actions = ['create', 'read', 'update', 'delete'];
  const roles = ['admin', 'manager', 'staff'];

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role');

      if (fetchError) throw fetchError;
      setPermissions(data || []);
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError('Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError(null);

      if (editingPermission) {
        const { error: updateError } = await supabase
          .from('role_permissions')
          .update(formData)
          .eq('id', editingPermission.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert([formData]);

        if (insertError) throw insertError;
      }

      await loadPermissions();
      setShowForm(false);
      setEditingPermission(null);
      setFormData({ role: '', resource: '', action: '' });
    } catch (err) {
      console.error('Error saving permission:', err);
      setError('Failed to save permission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (permission: RolePermission) => {
    if (!confirm('Are you sure you want to delete this permission?')) return;

    try {
      setIsLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('role_permissions')
        .delete()
        .eq('id', permission.id);

      if (deleteError) throw deleteError;

      await loadPermissions();
    } catch (err) {
      console.error('Error deleting permission:', err);
      setError('Failed to delete permission');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPermissions = permissions.filter(permission =>
    permission.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    permission.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
    permission.action.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Role & Permissions</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Permissions</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search permissions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
            </div>
            <Button 
              icon={<Plus size={16} />}
              onClick={() => {
                setEditingPermission(null);
                setFormData({ role: '', resource: '', action: '' });
                setShowForm(true);
              }}
              disabled={isLoading}
            >
              Add Permission
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
              <p className="mt-2 text-gray-500">Loading permissions...</p>
            </div>
          ) : filteredPermissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPermissions.map((permission) => (
                <div
                  key={permission.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <Shield className="text-blue-500 mr-2" size={20} />
                      <Badge className="bg-blue-100 text-blue-800">
                        {permission.role}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Edit size={14} />}
                        onClick={() => {
                          setEditingPermission(permission);
                          setFormData({
                            role: permission.role,
                            resource: permission.resource,
                            action: permission.action
                          });
                          setShowForm(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash size={14} />}
                        onClick={() => handleDelete(permission)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Resource:</span>
                      <span className="ml-2 text-gray-900">{permission.resource}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Action:</span>
                      <span className="ml-2 text-gray-900">{permission.action}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No permissions found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Permission Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingPermission ? 'Edit Permission' : 'Add Permission'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingPermission(null);
                  setFormData({ role: '', resource: '', action: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select role</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resource
                </label>
                <select
                  name="resource"
                  value={formData.resource}
                  onChange={(e) => setFormData(prev => ({ ...prev, resource: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select resource</option>
                  {resources.map(resource => (
                    <option key={resource} value={resource}>{resource}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  name="action"
                  value={formData.action}
                  onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select action</option>
                  {actions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPermission(null);
                    setFormData({ role: '', resource: '', action: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPermission ? 'Save Changes' : 'Add Permission'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolePermissions;
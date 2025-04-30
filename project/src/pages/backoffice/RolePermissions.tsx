import React, { useState, useEffect } from 'react';
import Card, { CardHeader, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Shield, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Permission {
  id: string;
  role: string;
  resource: string;
  action: string;
}

interface PermissionGroup {
  [resource: string]: {
    [action: string]: boolean;
  };
}

const RolePermissions: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('admin');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const roles = ['admin', 'staff'];
  
  const resources = {
    users: ['view', 'create', 'edit', 'delete'],
    properties: ['view', 'create', 'edit', 'delete'],
    rooms: ['view', 'create', 'edit', 'delete'],
    tenants: ['view', 'create', 'edit', 'delete'],
    payments: ['view', 'create', 'edit', 'delete'],
    reports: ['view', 'export'],
    settings: ['view', 'edit']
  };

  useEffect(() => {
    loadPermissions();
  }, [selectedRole]);

  const loadPermissions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', selectedRole);

      if (fetchError) throw fetchError;
      setPermissions(data || []);
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError('Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionGroups = (): PermissionGroup => {
    const groups: PermissionGroup = {};
    
    Object.keys(resources).forEach(resource => {
      groups[resource] = {};
      resources[resource].forEach(action => {
        groups[resource][action] = permissions.some(
          p => p.resource === resource && p.action === action
        );
      });
    });

    return groups;
  };

  const handlePermissionChange = async (resource: string, action: string, checked: boolean) => {
    try {
      setIsSaving(true);
      setError(null);

      if (checked) {
        // Add permission
        const { error: insertError } = await supabase
          .from('role_permissions')
          .insert([{ role: selectedRole, resource, action }]);

        if (insertError) throw insertError;
      } else {
        // Remove permission
        const { error: deleteError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role', selectedRole)
          .eq('resource', resource)
          .eq('action', action);

        if (deleteError) throw deleteError;
      }

      await loadPermissions();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating permission:', err);
      setError('Failed to update permission');
    } finally {
      setIsSaving(false);
    }
  };

  const permissionGroups = getPermissionGroups();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Role & Permissions</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {showSuccess && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center z-50">
          <CheckCircle size={20} className="mr-2" />
          Permissions updated successfully!
        </div>
      )}

      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Manage Permissions</h2>
          <div className="flex gap-2">
            {roles.map(role => (
              <Button
                key={role}
                variant={selectedRole === role ? 'primary' : 'outline'}
                onClick={() => setSelectedRole(role)}
                icon={<Shield size={16} />}
                disabled={isLoading || isSaving}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto" />
              <p className="mt-2 text-gray-500">Loading permissions...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(resources).map(([resource, actions]) => (
                <div key={resource} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
                    {resource}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {actions.map(action => (
                      <label
                        key={`${resource}-${action}`}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={permissionGroups[resource][action]}
                          onChange={(e) => handlePermissionChange(resource, action, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={isSaving}
                        />
                        <span className="text-sm text-gray-700 capitalize">{action}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RolePermissions;
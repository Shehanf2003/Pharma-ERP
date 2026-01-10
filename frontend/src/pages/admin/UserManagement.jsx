import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Pencil, Trash, Key, X, Check, Search } from 'lucide-react';
import axios from '../../lib/axios';

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Users
  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Adjusted path to rely on baseURL: http://localhost:5001/api
      // So /admin/users -> http://localhost:5001/api/admin/users
      const res = await axios.get('/admin/users');
      return res.data;
    },
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: async (userId) => {
      await axios.delete(`/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    },
  });

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await axios.patch(`/admin/users/${id}`, data);
    },
    onSuccess: () => {
      setEditingUser(null);
      queryClient.invalidateQueries(['users']);
    },
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }) => {
      await axios.patch(`/admin/users/${id}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      setResetPasswordUser(null);
      alert('Password updated successfully');
    },
    onError: (error) => {
        alert(error.response?.data?.message || 'Failed to update password');
    }
  });

  if (isLoading) return <div className="p-6">Loading users...</div>;
  if (isError) return <div className="p-6 text-red-500">Error loading users.</div>;

  // Filter users
  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
      </div>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="p-4 font-semibold text-gray-600">Name</th>
              <th className="p-4 font-semibold text-gray-600">Email</th>
              <th className="p-4 font-semibold text-gray-600">Modules</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
                <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-500">
                        {users.length === 0 ? "No employees found." : "No users match your search."}
                    </td>
                </tr>
            ) : (
                filteredUsers.map((user) => (
                <UserRow
                    key={user._id}
                    user={user}
                    onEdit={() => setEditingUser(user)}
                    onDelete={() => {
                        if (confirm(`Are you sure you want to delete ${user.name}?`)) {
                            deleteMutation.mutate(user._id);
                        }
                    }}
                    onResetPassword={() => setResetPasswordUser(user)}
                />
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(data) => updateMutation.mutate({ id: editingUser._id, data })}
        />
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSave={(newPassword) => resetPasswordMutation.mutate({ id: resetPasswordUser._id, newPassword })}
        />
      )}
    </div>
  );
};

const UserRow = ({ user, onEdit, onDelete, onResetPassword }) => {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="p-4">{user.name}</td>
      <td className="p-4">{user.email}</td>
      <td className="p-4">
        <div className="flex flex-wrap gap-2">
          {user.allowedModules.map((module) => (
            <span
              key={module}
              className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 rounded-full"
            >
              {module}
            </span>
          ))}
          {user.allowedModules.length === 0 && <span className="text-gray-400 text-sm">No access</span>}
        </div>
      </td>
      <td className="p-4 text-right space-x-2">
        <button
          onClick={onEdit}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title="Edit User"
        >
          <Pencil size={18} />
        </button>
        <button
          onClick={onResetPassword}
          className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-full transition-colors"
          title="Reset Password"
        >
          <Key size={18} />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
          title="Delete User"
        >
          <Trash size={18} />
        </button>
      </td>
    </tr>
  );
};

const EditUserModal = ({ user, onClose, onSave }) => {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name: user.name,
      allowedModules: user.allowedModules,
    },
  });

  const onSubmit = (data) => {
    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Edit User</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              {...register('name')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Modules</label>
            <div className="space-y-2">
              {["INVENTORY", "POS", "FINANCE", "REPORTING"].map((module) => (
                <div key={module} className="flex items-center">
                  <input
                    type="checkbox"
                    value={module}
                    {...register('allowedModules')}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">{module}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ResetPasswordModal = ({ user, onClose, onSave }) => {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = (data) => {
    onSave(data.newPassword);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-xl font-bold">Reset Password</h2>
                <p className="text-sm text-gray-500">For {user.name}</p>
            </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <input
              type="text"
              {...register('newPassword', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 chars' } })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
              placeholder="Enter new password"
            />
            {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md"
            >
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;

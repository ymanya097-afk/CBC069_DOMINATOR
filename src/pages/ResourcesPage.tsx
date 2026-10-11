import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  Plus,
  AlertTriangle,
  Receipt,
  Wrench,
  Sparkles,
  Edit2,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { Resource, ResourceType } from '../types/index.ts';

const RESOURCE_TYPES: ResourceType[] = ['supplies', 'appliances', 'tools', 'bills'];

export const ResourcesPage: React.FC = () => {
  const { member: currentMember } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = currentMember?.role === 'admin';

  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Resource | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>('supplies');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('units');
  const [lowStockThreshold, setLowStockThreshold] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [notes, setNotes] = useState('');

  // Fetch resources
  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ['resources'],
    queryFn: () => apiRequest('/api/resources')
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest('/api/resources', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      success('Resource added', 'Saved');
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to add resource');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      apiRequest(`/api/resources/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      success('Resource updated', 'Saved');
      setEditResource(null);
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to update resource');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/resources/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      success('Resource deleted', 'Removed');
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to delete resource');
    }
  });

  const resetForm = () => {
    setName('');
    setType('supplies');
    setQuantity(1);
    setUnit('units');
    setLowStockThreshold(0);
    setDueDate('');
    setAmount('');
    setNotes('');
  };

  const filteredResources = resources.filter(
    r => selectedType === 'all' || r.type === selectedType
  );

  const lowStockItems = resources.filter(
    r => r.type === 'supplies' && r.low_stock_threshold > 0 && r.quantity <= r.low_stock_threshold
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-semibold text-lg text-[#075985] dark:text-[#FFFFFF]">
            Household Resources &amp; Bills
          </h1>
          <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 font-sans">
            Manage supplies, shared appliances, tools, and recurring household utility bills
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] bg-[#0EA5E9] hover:bg-[#0284C7] text-[#FFFFFF] font-heading font-medium text-xs shadow-none transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Resource</span>
          </button>
        )}
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="p-3 bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] flex items-start gap-3 text-xs"
             style={{ borderLeftWidth: '3px', borderLeftColor: '#075985' }}>
          <AlertTriangle className="w-4 h-4 text-[#075985] dark:text-[#FFFFFF] shrink-0 mt-0.5" />
          <div>
            <span className="font-heading font-bold text-[#075985] dark:text-[#FFFFFF] uppercase tracking-wider block mb-0.5">
              Low Stock Warning ({lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''})
            </span>
            <span className="text-[#075985]/70 dark:text-[#E0F2FE]/75">
              The following supplies are at or below their restock threshold:{' '}
              {lowStockItems.map(i => `${i.name} (${i.quantity} ${i.unit} left)`).join(', ')}.
            </span>
          </div>
        </div>
      )}

      {/* Type Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30 pb-2 text-xs font-heading">
        {['all', 'supplies', 'appliances', 'tools', 'bills'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setSelectedType(t)}
            className={`px-3 py-1.5 rounded-[4px] capitalize transition-colors ${
              selectedType === t
                ? 'bg-[#0EA5E9] text-[#FFFFFF] font-medium'
                : 'text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:bg-[#0EA5E9]/8 dark:hover:bg-[#7DD3FC]/10'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] animate-pulse"
            />
          ))
        ) : filteredResources.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">
            No resources found in this category.
          </div>
        ) : (
          filteredResources.map(res => {
            const isLowStock =
              res.type === 'supplies' &&
              res.low_stock_threshold > 0 &&
              res.quantity <= res.low_stock_threshold;

            return (
              <div
                key={res.id}
                className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] p-4 flex flex-col justify-between shadow-xs"
                style={isLowStock ? { borderLeftWidth: '3px', borderLeftColor: '#075985' } : undefined}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-heading font-medium text-xs text-[#075985] dark:text-[#FFFFFF]">
                      {res.name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-heading capitalize bg-[#FFFFFF] dark:bg-[#082F49] text-[#075985]/70 dark:text-[#E0F2FE]/75 border border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                      {res.type}
                    </span>
                  </div>

                  {res.notes && (
                    <p className="text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75 mb-3">
                      {res.notes}
                    </p>
                  )}

                  {res.type === 'bills' ? (
                    <div className="space-y-1 my-2 p-2 bg-[#FFFFFF] dark:bg-[#082F49] rounded border border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#075985]/70 dark:text-[#E0F2FE]/75">Amount Due:</span>
                        <span className="font-mono font-semibold text-[#075985] dark:text-[#FFFFFF]">
                          ${res.amount !== null && res.amount !== undefined ? res.amount.toFixed(2) : '0.00'}
                        </span>
                      </div>
                      {res.due_date && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[#075985]/70 dark:text-[#E0F2FE]/75">Due Date:</span>
                          <span className="font-mono text-[#075985] dark:text-[#FFFFFF]">
                            {new Date(res.due_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2 my-2">
                      <span className="font-mono text-lg font-semibold text-[#075985] dark:text-[#FFFFFF]">
                        {res.quantity}
                      </span>
                      <span className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75">{res.unit}</span>
                      {isLowStock && (
                        <span className="ml-auto text-[10px] font-heading font-bold text-[#075985] dark:text-[#FFFFFF] uppercase tracking-wider">
                          Low Stock
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#E0F2FE] dark:border-[#7DD3FC]/30 flex items-center justify-between text-[11px] text-[#075985]/70 dark:text-[#E0F2FE]/75">
                  <span>
                    {res.type === 'supplies' && res.low_stock_threshold > 0
                      ? `Alert threshold: ${res.low_stock_threshold} ${res.unit}`
                      : ''}
                  </span>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditResource(res);
                          setName(res.name);
                          setType(res.type);
                          setQuantity(res.quantity);
                          setUnit(res.unit);
                          setLowStockThreshold(res.low_stock_threshold);
                          setDueDate(res.due_date ? res.due_date.slice(0, 10) : '');
                          setAmount(res.amount || '');
                          setNotes(res.notes || '');
                        }}
                        className="p-1 text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:text-[#075985] dark:hover:text-[#FFFFFF]"
                        title="Edit Resource"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(res)}
                        className="p-1 text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:text-[#075985] dark:text-[#FFFFFF]"
                        title="Delete Resource"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE & EDIT RESOURCE MODAL */}
      <AnimatePresence>
        {(showAddModal || editResource) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] max-w-md w-full p-5 shadow-sm"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                <h3 className="font-heading font-semibold text-sm text-[#075985] dark:text-[#FFFFFF]">
                  {editResource ? 'Edit Resource' : 'Add Household Resource'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditResource(null);
                  }}
                  className="p-1 text-[#075985]/70 dark:text-[#E0F2FE]/75 hover:text-[#075985] dark:hover:text-[#FFFFFF]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  const payload = {
                    name,
                    type,
                    quantity: Number(quantity),
                    unit,
                    low_stock_threshold: Number(lowStockThreshold),
                    due_date: type === 'bills' && dueDate ? new Date(dueDate).toISOString() : null,
                    amount: type === 'bills' && amount !== '' ? Number(amount) : null,
                    notes
                  };

                  if (editResource) {
                    updateMutation.mutate({ id: editResource.id, updates: payload });
                  } else {
                    createMutation.mutate(payload);
                  }
                }}
                className="mt-4 space-y-3"
              >
                <div>
                  <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                    Resource Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Dishwasher Pods, Electric Bill"
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                      Resource Type *
                    </label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value as ResourceType)}
                      className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                    >
                      <option value="supplies">Supplies</option>
                      <option value="appliances">Appliances</option>
                      <option value="tools">Tools</option>
                      <option value="bills">Bills</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={quantity}
                      onChange={e => setQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                      Unit of Measure
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={e => setUnit(e.target.value)}
                      placeholder="e.g. bottles, pods, rolls"
                      className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                      Low-Stock Threshold
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={lowStockThreshold}
                      onChange={e => setLowStockThreshold(Number(e.target.value))}
                      placeholder="0 for none"
                      className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                    />
                  </div>
                </div>

                {type === 'bills' && (
                  <div className="grid grid-cols-2 gap-3 p-2.5 rounded bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                    <div>
                      <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                        Bill Amount ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        placeholder="120.50"
                        className="w-full px-3 py-1.5 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-heading font-medium text-[#075985] dark:text-[#FFFFFF] mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Storage location, reorder links, model numbers..."
                    className="w-full px-3 py-2 text-xs rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 bg-[#FFFFFF] dark:bg-[#082F49]"
                  />
                </div>

                <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-[#E0F2FE] dark:border-[#7DD3FC]/30">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditResource(null);
                    }}
                    className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985]/70 dark:text-[#E0F2FE]/75"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-heading rounded-[4px] bg-[#0EA5E9] hover:bg-[#0284C7] text-[#FFFFFF] font-medium"
                  >
                    {editResource ? 'Save Resource' : 'Add Resource'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE RESOURCE MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-[#FFFFFF] dark:bg-[#082F49] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 rounded-[6px] max-w-sm w-full p-5 shadow-sm"
            >
              <h3 className="font-heading font-semibold text-sm text-[#075985] dark:text-[#FFFFFF] mb-2">
                Delete Resource
              </h3>
              <p className="text-xs text-[#075985]/70 dark:text-[#E0F2FE]/75 mb-4">
                Are you sure you want to delete &ldquo;{deleteTarget.name}&rdquo;?
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] border border-[#E0F2FE] dark:border-[#7DD3FC]/30 text-[#075985]/70 dark:text-[#E0F2FE]/75"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                  className="px-3 py-1.5 text-xs font-heading rounded-[4px] bg-[#075985] text-[#FFFFFF] font-medium hover:bg-[#075985]/90"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

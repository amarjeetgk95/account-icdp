import React, { useState } from 'react';
import { Edit2, Trash2, Paperclip, Plus, X } from 'lucide-react';

export interface SubVoucher {
  id: string;
  voucherNo: string;
  payee: string;
  description: string;
  sanctionOrder: string;
  sanctionDate: string;
  amount: number;
}

interface SubVoucherListProps {
  subVouchers: SubVoucher[];
  onAdd: (voucher: SubVoucher) => void;
  onEdit: (id: string, voucher: SubVoucher) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export const SubVoucherList: React.FC<SubVoucherListProps> = ({ 
  subVouchers, 
  onAdd, 
  onEdit, 
  onDelete,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SubVoucher | null>(null);
  const [formData, setFormData] = useState<Partial<SubVoucher>>({});
  
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({});
    setIsModalOpen(true);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Sub-Vouchers Details</h3>
        <button
          onClick={openAddModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Sub-Voucher
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sub-Voucher No</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payee/Vendor</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sanction Order/Date</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (₹)</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subVouchers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <p className="mb-2">No sub-vouchers added yet.</p>
                    <button onClick={() => setIsModalOpen(true)} className="text-blue-600 hover:underline">Add your first sub-voucher</button>
                  </div>
                </td>
              </tr>
            ) : (
              subVouchers.map((sv) => (
                <tr key={sv.id} className="hover:bg-gray-50 transition-colors">
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sv.voucherNo}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sv.payee}</td>
                   <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={sv.description}>{sv.description}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                     <div className="font-medium text-gray-700">{sv.sanctionOrder || '-'}</div>
                     <div className="text-xs text-gray-400 mt-0.5">{sv.sanctionDate}</div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                     {sv.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                     <div className="flex items-center justify-center space-x-3">
                       <button 
                         className="text-gray-400 hover:text-blue-600 transition-colors" 
                         title="Edit"
                         onClick={() => {
                           setEditingItem(sv);
                           setFormData({ ...sv });
                           setIsModalOpen(true);
                         }}
                       >
                         <Edit2 className="w-4 h-4" />
                       </button>
                       <button className="text-gray-400 hover:text-gray-900 transition-colors" title="View Attachment">
                         <Paperclip className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={() => onDelete(sv.id)} 
                         className="text-gray-400 hover:text-red-600 transition-colors" 
                         title="Delete"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                     </div>
                   </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900">
                {editingItem ? 'Edit Sub-Voucher' : 'Add New Sub-Voucher'}
              </h2>
              <button onClick={() => { setIsModalOpen(false); setEditingItem(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Voucher No <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="e.g. SV-2023-001"
                  value={formData.voucherNo || ''}
                  onChange={e => setFormData({...formData, voucherNo: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payee/Vendor</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Vendor Name"
                  value={formData.payee || ''}
                  onChange={e => setFormData({...formData, payee: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  rows={2}
                  placeholder="Brief description of charge..."
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sanction Order</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.sanctionOrder || ''}
                    onChange={e => setFormData({...formData, sanctionOrder: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sanction Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.sanctionDate || ''}
                    onChange={e => setFormData({...formData, sanctionDate: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="0.00"
                  value={formData.amount || ''}
                  onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editingItem) {
                    onEdit(editingItem.id, {
                      id: formData.id || editingItem.id,
                      voucherNo: formData.voucherNo || '',
                      payee: formData.payee || '',
                      description: formData.description || '',
                      sanctionOrder: formData.sanctionOrder || '',
                      sanctionDate: formData.sanctionDate || '',
                      amount: formData.amount || 0,
                    });
                  } else {
                    onAdd({
                      id: Math.random().toString(36).substring(2, 9),
                      voucherNo: formData.voucherNo || '',
                      payee: formData.payee || '',
                      description: formData.description || '',
                      sanctionOrder: formData.sanctionOrder || '',
                      sanctionDate: formData.sanctionDate || '',
                      amount: formData.amount || 0,
                    });
                  }
                  setIsModalOpen(false);
                  setEditingItem(null);
                  setFormData({});
                }}
                disabled={!formData.voucherNo || !formData.amount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingItem ? 'Save Changes' : 'Save Sub-Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

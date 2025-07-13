'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import EnhancedRoleBadge from '../../../components/EnhancedRoleBadge';
import { useSocket } from '../../../components/SocketProvider';
import { useToast } from '../../../components/Toast';

export default function BadgeManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { socket } = useSocket();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [newBadge, setNewBadge] = useState({
    text: '',
    color: 'primary',
    icon: ''
  });
  const [newTitle, setNewTitle] = useState('');
  const [editingTitles, setEditingTitles] = useState([]);
  const [availableTitles] = useState([
    { text: 'ผู้ก่อตั้ง', color: 'error', icon: '👑' },
    { text: 'ผู้ดูแล', color: 'warning', icon: '🛡️' },
    { text: 'ผู้พัฒนา', color: 'secondary', icon: '💻' },
    { text: 'VIP', color: 'accent', icon: '⭐' },
    { text: 'ผู้สนับสนุน', color: 'success', icon: '💎' },
    { text: 'ผู้เชี่ยวชาญ', color: 'info', icon: '🎓' },
    { text: 'ที่ปรึกษา', color: 'primary', icon: '🧠' },
    { text: 'สมาชิกเก่า', color: 'neutral', icon: '🏆' }
  ]);

  const [availableBadges] = useState([
    { text: 'SUPPORTER', color: 'success', icon: '🌟' },
    { text: 'PREMIUM', color: 'warning', icon: '💎' },
    { text: 'VETERAN', color: 'info', icon: '🏆' },
    { text: 'CONTRIBUTOR', color: 'primary', icon: '🎯' },
    { text: 'HELPER', color: 'secondary', icon: '🤝' },
    { text: 'ARTIST', color: 'accent', icon: '🎨' },
    { text: 'WRITER', color: 'neutral', icon: '✍️' },
    { text: 'GAMER', color: 'error', icon: '🎮' }
  ]);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!['admin', 'dev'].includes(session.user.role)) {
      router.push('/');
      return;
    }

    fetchUsers();
  }, [session, status, router]);

  // Listen for user status changes
  useEffect(() => {
    if (!socket) return;

    const handleUserStatusChanged = (data) => {
      setUsers(prev => prev.map(user =>
        user._id === data.userId
          ? { ...user, isOnline: data.isOnline, lastSeen: new Date() }
          : user
      ));
    };

    socket.on('user-status-changed', handleUserStatusChanged);

    return () => {
      socket.off('user-status-changed', handleUserStatusChanged);
    };
  }, [socket]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/badges');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBadge = async () => {
    if (!newBadge.text.trim()) {
      toast.warning('กรุณาใส่ข้อความ badge');
      return;
    }

    try {
      const response = await fetch('/api/admin/badges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          badge: newBadge
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(prev => prev.map(user => 
          user._id === selectedUser._id ? data.user : user
        ));
        setNewBadge({ text: '', color: 'primary', icon: '' });
        setShowAddModal(false);
        toast.success('เพิ่ม badge สำเร็จ');
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการเพิ่ม badge');
      }
    } catch (error) {
      console.error('Error adding badge:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่ม badge');
    }
  };

  const handleRemoveBadge = async (userId, badgeIndex) => {
    try {
      const response = await fetch(`/api/admin/badges?userId=${userId}&badgeIndex=${badgeIndex}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(prev => prev.map(user => 
          user._id === userId ? data.user : user
        ));
        toast.success('ลบ badge สำเร็จ');
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการลบ badge');
      }
    } catch (error) {
      console.error('Error removing badge:', error);
      toast.error('เกิดข้อผิดพลาดในการลบ badge');
    }
  };

  const handleUpdateTitles = async () => {
    try {
      const response = await fetch('/api/admin/titles', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          titles: editingTitles
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(prev => prev.map(user =>
          user._id === selectedUser._id ? data.user : user
        ));
        setEditingTitles([]);
        setShowTitleModal(false);
        toast.success('อัปเดตยศสำเร็จ');
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการอัปเดตยศ');
      }
    } catch (error) {
      console.error('Error updating titles:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตยศ');
    }
  };

  const toggleTitle = (title) => {
    setEditingTitles(prev => {
      const exists = prev.find(t => t.text === title.text);
      if (exists) {
        return prev.filter(t => t.text !== title.text);
      } else {
        return [...prev, title];
      }
    });
  };

  const addCustomTitle = () => {
    if (!newTitle.trim()) return;

    const customTitle = {
      text: newTitle.trim(),
      color: 'accent',
      icon: '👑'
    };

    setEditingTitles(prev => [...prev, customTitle]);
    setNewTitle('');
  };



  const colorOptions = [
    { value: 'primary', label: 'Primary (น้ำเงิน)', class: 'badge-primary' },
    { value: 'secondary', label: 'Secondary (ม่วง)', class: 'badge-secondary' },
    { value: 'accent', label: 'Accent', class: 'badge-accent' },
    { value: 'neutral', label: 'Neutral (เทา)', class: 'badge-neutral' },
    { value: 'info', label: 'Info (ฟ้า)', class: 'badge-info' },
    { value: 'success', label: 'Success (เขียว)', class: 'badge-success' },
    { value: 'warning', label: 'Warning (เหลือง)', class: 'badge-warning' },
    { value: 'error', label: 'Error (แดง)', class: 'badge-error' }
  ];

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">จัดการ Badge ผู้ใช้</h1>
        <div className="breadcrumbs text-sm">
          <ul>
            <li><a href="/admin">Admin</a></li>
            <li>Badge Management</li>
          </ul>
        </div>
      </div>

      <div className="grid gap-6">
        {users.map((user) => (
          <div key={user._id} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="avatar">
                    <div className="w-12 h-12 rounded-full relative">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.displayName} />
                      ) : (
                        <div className="bg-neutral text-neutral-content rounded-full w-12 h-12 flex items-center justify-center">
                          <span className="text-lg">{user.displayName?.charAt(0)}</span>
                        </div>
                      )}
                      {/* Online Status Indicator */}
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-base-100 ${
                        user.isOnline ? 'bg-success' : 'bg-base-300'
                      }`}></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg">{user.displayName}</h3>
                    <p className="text-base-content/70">@{user.username}</p>
                    <p className="text-xs text-base-content/50">
                      {user.isOnline ? (
                        <span className="text-success">🟢 Active</span>
                      ) : (
                        <span className="text-base-content/60">⚫ Offline</span>
                      )}
                    </p>
                  </div>
                  
                  <EnhancedRoleBadge
                    role={user.role}
                    customBadges={user.customBadges || []}
                    publicTitles={user.publicTitles || []}
                    size="sm"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setEditingTitles([...(user.publicTitles || [])]);
                      setShowTitleModal(true);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    จัดการยศ
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setShowAddModal(true);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    เพิ่ม Badge
                  </button>
                </div>
              </div>
              
              {user.customBadges && user.customBadges.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Custom Badges:</h4>
                  <div className="space-y-2">
                    {user.customBadges.map((badge, index) => (
                      <div key={index} className="flex items-center justify-between bg-base-200 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`badge badge-${badge.color} gap-1`}>
                            {badge.icon && <span>{badge.icon}</span>}
                            <span>{badge.text}</span>
                          </div>
                          <span className="text-sm text-base-content/60">
                            สร้างเมื่อ {new Date(badge.createdAt).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveBadge(user._id, index)}
                          className="btn btn-error btn-xs"
                        >
                          ลบ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {user.publicTitles && user.publicTitles.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">ยศสาธารณะ:</h4>
                  <div className="bg-base-200 p-3 rounded-lg">
                    <div className="flex flex-wrap gap-2">
                      {user.publicTitles.map((title, index) => (
                        <div key={index} className={`badge badge-${title.color} gap-1`}>
                          <span>{title.icon}</span>
                          <span>{title.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Badge Modal */}
      {showAddModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              เพิ่ม Badge ให้ {selectedUser?.displayName}
            </h3>
            
            {/* Quick Select Badges */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Badge ที่มีให้เลือก:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availableBadges.map((badge, index) => (
                  <div
                    key={index}
                    className="card cursor-pointer transition-all bg-base-200 hover:bg-primary hover:text-primary-content"
                    onClick={() => setNewBadge(badge)}
                  >
                    <div className="card-body p-2 text-center">
                      <div className={`badge badge-${badge.color} gap-1 mx-auto text-xs`}>
                        <span>{badge.icon}</span>
                        <span>{badge.text}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">ข้อความ Badge (หรือสร้างเอง)</span>
              </label>
              <input
                type="text"
                value={newBadge.text}
                onChange={(e) => setNewBadge(prev => ({ ...prev, text: e.target.value }))}
                className="input input-bordered"
                placeholder="เช่น VIP, SUPPORTER, etc."
                maxLength="20"
              />
              <label className="label">
                <span className="label-text-alt">{newBadge.text.length}/20</span>
              </label>
            </div>
            
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">สี Badge</span>
              </label>
              <select
                value={newBadge.color}
                onChange={(e) => setNewBadge(prev => ({ ...prev, color: e.target.value }))}
                className="select select-bordered"
              >
                {colorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">ไอคอน (ไม่บังคับ)</span>
              </label>
              <input
                type="text"
                value={newBadge.icon}
                onChange={(e) => setNewBadge(prev => ({ ...prev, icon: e.target.value }))}
                className="input input-bordered"
                placeholder="🌟 ⭐ 💎 👑 etc."
                maxLength="2"
              />
            </div>
            
            <div className="mb-4">
              <label className="label">
                <span className="label-text">ตัวอย่าง:</span>
              </label>
              <div className={`badge badge-${newBadge.color} gap-1`}>
                {newBadge.icon && <span>{newBadge.icon}</span>}
                <span>{newBadge.text || 'ตัวอย่าง'}</span>
              </div>
            </div>
            
            <div className="modal-action">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-ghost"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAddBadge}
                className="btn btn-primary"
                disabled={!newBadge.text.trim()}
              >
                เพิ่ม Badge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title Modal */}
      {showTitleModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">
              จัดการยศสาธารณะให้ {selectedUser?.displayName}
            </h3>

            {/* Available Titles */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">ยศที่มีให้เลือก:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableTitles.map((title, index) => {
                  const isSelected = editingTitles.some(t => t.text === title.text);
                  return (
                    <div
                      key={index}
                      className={`card cursor-pointer transition-all ${
                        isSelected ? 'bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'
                      }`}
                      onClick={() => toggleTitle(title)}
                    >
                      <div className="card-body p-3 text-center">
                        <div className={`badge ${isSelected ? 'badge-neutral' : `badge-${title.color}`} gap-1 mx-auto`}>
                          <span>{title.icon}</span>
                          <span className="text-xs">{title.text}</span>
                        </div>
                        {isSelected && (
                          <div className="text-xs mt-1">✓ เลือกแล้ว</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Title */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">เพิ่มยศกำหนดเอง:</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="input input-bordered flex-1"
                  placeholder="ยศกำหนดเอง..."
                  maxLength="30"
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTitle()}
                />
                <button
                  onClick={addCustomTitle}
                  className="btn btn-primary"
                  disabled={!newTitle.trim()}
                >
                  เพิ่ม
                </button>
              </div>
            </div>

            {/* Selected Titles Preview */}
            <div className="mb-6">
              <h4 className="font-semibold mb-3">ยศที่เลือก ({editingTitles.length}):</h4>
              {editingTitles.length > 0 ? (
                <div className="bg-base-200 p-4 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {editingTitles.map((title, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className={`badge badge-${title.color} gap-1`}>
                          <span>{title.icon}</span>
                          <span>{title.text}</span>
                        </div>
                        <button
                          onClick={() => setEditingTitles(prev => prev.filter((_, i) => i !== index))}
                          className="btn btn-circle btn-xs btn-error"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-base-content/60 text-center py-4">
                  ไม่มียศ (จะแสดง role badge ปกติ)
                </div>
              )}
            </div>

            <div className="alert alert-info mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>ยศเหล่านี้จะแสดงแทน ADMIN/DEV/USER badge และอัปเดตแบบ real-time</span>
            </div>

            <div className="modal-action">
              <button
                onClick={() => setShowTitleModal(false)}
                className="btn btn-ghost"
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  const emptyTitles = [];
                  setEditingTitles(emptyTitles);

                  try {
                    const response = await fetch('/api/admin/titles', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        userId: selectedUser._id,
                        titles: emptyTitles
                      }),
                    });

                    if (response.ok) {
                      const data = await response.json();
                      setUsers(prev => prev.map(user =>
                        user._id === selectedUser._id ? data.user : user
                      ));
                      setShowTitleModal(false);
                      toast.success('ลบยศทั้งหมดสำเร็จ');
                    } else {
                      const error = await response.json();
                      toast.error(error.error || 'เกิดข้อผิดพลาดในการลบยศ');
                    }
                  } catch (error) {
                    console.error('Error removing all titles:', error);
                    toast.error('เกิดข้อผิดพลาดในการลบยศ');
                  }
                }}
                className="btn btn-warning"
              >
                ลบยศทั้งหมด
              </button>
              <button
                onClick={handleUpdateTitles}
                className="btn btn-primary"
              >
                บันทึกยศ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

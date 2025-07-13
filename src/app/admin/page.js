'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '../../components/Toast';

export default function AdminPanel() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user.role !== 'admin') {
      router.push('/unauthorized');
      return;
    }

    fetchUsers();
  }, [session, status, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery)}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const openModal = (user, action) => {
    setSelectedUser(user);
    setModalAction(action);
    setNewUsername(user.username);
    setReason('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setModalAction('');
    setNewUsername('');
    setReason('');
  };

  const handleUserAction = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      let endpoint = `/api/admin/users/${selectedUser._id}`;
      let method = 'PUT';
      let body = { action: modalAction, reason };

      if (modalAction === 'change_username') {
        body.newUsername = newUsername;
      } else if (modalAction === 'delete_user') {
        method = 'DELETE';
        body = { reason };
      }

      console.log('Sending request:', { endpoint, method, body });

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Success result:', result);

        // Show success message based on action
        let successMessage = '';
        switch (modalAction) {
          case 'ban_user':
            successMessage = `Ban ผู้ใช้ ${selectedUser.displayName} สำเร็จ`;
            break;
          case 'unban_user':
            successMessage = `Unban ผู้ใช้ ${selectedUser.displayName} สำเร็จ`;
            break;
          case 'change_username':
            successMessage = `เปลี่ยน Username เป็น ${newUsername} สำเร็จ`;
            break;
          case 'delete_user':
            successMessage = `ลบผู้ใช้ ${selectedUser.displayName} สำเร็จ`;
            break;
          default:
            successMessage = 'ดำเนินการสำเร็จ';
        }

        toast.success(successMessage);
        fetchUsers(); // Refresh the user list
        closeModal();
      } else {
        const error = await response.json();
        console.error('Error response:', error);
        toast.error(error.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error performing action:', error);
      toast.error('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="hero bg-gradient-to-r from-primary to-secondary text-primary-content rounded-lg mb-8">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-4xl font-bold mb-4">
              <svg className="w-12 h-12 inline-block mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin Panel
            </h1>
            <p className="text-lg opacity-90">จัดการผู้ใช้และระบบ</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link href="/admin/badges" className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
          <div className="card-body">
            <h2 className="card-title">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              จัดการ Badge
            </h2>
            <p>เพิ่ม ลบ และจัดการ custom badge ของผู้ใช้</p>
          </div>
        </Link>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              สถิติระบบ
            </h2>
            <p>ผู้ใช้ทั้งหมด: {users.length} คน</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card bg-base-100 shadow-xl mb-8">
        <div className="card-body">
          <h2 className="card-title">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            ค้นหาผู้ใช้
          </h2>
          <form onSubmit={handleSearch}>
            <div className="join w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered join-item flex-1"
                placeholder="ค้นหาผู้ใช้ (username, display name, email)..."
              />
              <button type="submit" className="btn btn-primary join-item">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                ค้นหา
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Users table */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            รายชื่อผู้ใช้ ({users.length} คน)
          </h2>

          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>ผู้ใช้</th>
                  <th>อีเมล</th>
                  <th>บทบาท</th>
                  <th>สถานะ</th>
                  <th>เข้าสู่ระบบล่าสุด</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="hover">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar">
                          <div className="mask mask-squircle w-12 h-12">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.displayName} />
                            ) : (
                              <div className="bg-neutral text-neutral-content w-12 h-12 flex items-center justify-center">
                                <span className="text-lg font-bold">{user.displayName?.charAt(0)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold">{user.displayName}</div>
                          <div className="text-sm opacity-50">@{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm">{user.email}</span>
                    </td>
                    <td>
                      <div className={`badge ${user.role === 'admin' ? 'badge-error' : 'badge-success'}`}>
                        {user.role === 'admin' ? (
                          <>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Admin
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            User
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={`badge ${user.isActive ? 'badge-success' : 'badge-error'}`}>
                        {user.isActive ? (
                          <>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Active
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Banned
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="text-sm">
                        {user.lastLogin ? formatDate(user.lastLogin) : 'ไม่เคย'}
                      </span>
                    </td>
                    <td>
                      {user.role !== 'admin' || user._id === session.user.id ? (
                        <div className="dropdown dropdown-end">
                          <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </div>
                          <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                            <li>
                              <button
                                onClick={() => openModal(user, 'change_username')}
                                className="flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                เปลี่ยน Username
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => openModal(user, user.isActive ? 'ban_user' : 'unban_user')}
                                className={`flex items-center gap-2 ${user.isActive ? 'text-warning' : 'text-success'}`}
                              >
                                {user.isActive ? (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                                    </svg>
                                    Ban ผู้ใช้
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Unban ผู้ใช้
                                  </>
                                )}
                              </button>
                            </li>
                            {user._id !== session.user.id && (
                              <li>
                                <button
                                  onClick={() => openModal(user, 'delete_user')}
                                  className="flex items-center gap-2 text-error"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  ลบผู้ใช้
                                </button>
                              </li>
                            )}
                          </ul>
                        </div>
                      ) : (
                        <div className="badge badge-ghost">ไม่สามารถแก้ไขได้</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-md">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              {modalAction === 'change_username' && (
                <>
                  <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  เปลี่ยน Username
                </>
              )}
              {modalAction === 'ban_user' && (
                <>
                  <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                  </svg>
                  Ban ผู้ใช้
                </>
              )}
              {modalAction === 'unban_user' && (
                <>
                  <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Unban ผู้ใช้
                </>
              )}
              {modalAction === 'delete_user' && (
                <>
                  <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  ลบผู้ใช้
                </>
              )}
            </h3>

            {selectedUser && (
              <div className="alert alert-info mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>ผู้ใช้: <strong>{selectedUser.displayName}</strong> (@{selectedUser.username})</span>
              </div>
            )}

            {modalAction === 'change_username' && (
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-medium">Username ใหม่</span>
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="กรอก username ใหม่"
                />
              </div>
            )}

            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text font-medium">เหตุผล</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="textarea textarea-bordered h-24"
                placeholder="กรอกเหตุผลในการดำเนินการ..."
              />
            </div>

            <div className="modal-action">
              <button
                onClick={closeModal}
                className="btn btn-ghost"
                disabled={actionLoading}
              >
                ยกเลิก
              </button>
              <button
                onClick={handleUserAction}
                disabled={actionLoading}
                className={`btn ${
                  modalAction === 'delete_user' || modalAction === 'ban_user'
                    ? 'btn-error'
                    : modalAction === 'unban_user'
                    ? 'btn-success'
                    : 'btn-primary'
                }`}
              >
                {actionLoading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    กำลังดำเนินการ...
                  </>
                ) : (
                  <>
                    {modalAction === 'change_username' && 'เปลี่ยน Username'}
                    {modalAction === 'ban_user' && 'Ban ผู้ใช้'}
                    {modalAction === 'unban_user' && 'Unban ผู้ใช้'}
                    {modalAction === 'delete_user' && 'ลบผู้ใช้'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

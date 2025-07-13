'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../components/Toast';

export default function CreatePost() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [visibility, setVisibility] = useState('public'); // public, followers, private
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error('ขนาดไฟล์ต้องไม่เกิน 5MB');
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          uploadedUrls.push(data.url);
        } else {
          toast.error('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        }
      }

      setImages(prev => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 4) {
      toast.error('สามารถอัปโหลดรูปภาพได้สูงสุด 4 รูป');
      return;
    }
    handleImageUpload(files);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Allow post with either content or images
    if (!content.trim() && images.length === 0) {
      toast.error('กรุณาใส่เนื้อหาโพสต์หรือรูปภาพ');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim() || '',
          images: images,
          visibility: visibility
        }),
      });

      if (response.ok) {
        toast.success('สร้างโพสต์สำเร็จ');
        router.push('/');
      } else {
        const error = await response.json();
        toast.error(error.error || 'เกิดข้อผิดพลาดในการสร้างโพสต์');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('เกิดข้อผิดพลาดในการสร้างโพสต์');
    } finally {
      setLoading(false);
    }
  };

  const visibilityOptions = [
    { value: 'public', label: 'สาธารณะ', icon: '🌍', description: 'ทุกคนสามารถเห็นโพสต์นี้ได้' },
    { value: 'followers', label: 'เฉพาะผู้ติดตาม', icon: '👥', description: 'เฉพาะผู้ที่ติดตามคุณเท่านั้น' },
    { value: 'private', label: 'ส่วนตัว', icon: '🔒', description: 'เฉพาะคุณเท่านั้นที่เห็นได้' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 to-base-300">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            สร้างโพสต์ใหม่
          </h1>
          <p className="text-base-content/70">แชร์ความคิด ความรู้สึก และช่วงเวลาดีๆ ของคุณ</p>
        </div>

        <div className="card bg-base-100 shadow-2xl border border-base-300">
          <div className="card-body p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-3 pb-4 border-b border-base-200">
                <div className="avatar">
                  <div className="w-12 h-12 rounded-full">
                    {session?.user?.avatar ? (
                      <img src={session.user.avatar} alt={session.user.displayName} />
                    ) : (
                      <div className="bg-primary text-primary-content rounded-full w-12 h-12 flex items-center justify-center">
                        <span className="text-lg font-semibold">{session?.user?.displayName?.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{session?.user?.displayName}</h3>
                  <p className="text-sm text-base-content/60">@{session?.user?.username}</p>
                </div>
              </div>

              {/* Content */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-lg">เนื้อหาโพสต์</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="textarea textarea-bordered h-40 text-base resize-none focus:textarea-primary"
                  placeholder="แชร์ความคิดของคุณ... 💭"
                  maxLength="2000"
                  disabled={loading}
                  dir="ltr"
                  style={{ direction: 'ltr', textAlign: 'left' }}
                />
                <label className="label">
                  <span className="label-text-alt"></span>
                  <span className="label-text-alt">
                    {content.length}/2000 ตัวอักษร
                  </span>
                </label>
              </div>

              {/* Image Upload */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-lg">รูปภาพ</span>
                  <span className="label-text-alt">สูงสุด 4 รูป</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div
                  className="border-2 border-dashed border-base-300 rounded-lg p-6 text-center hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingImages ? (
                    <div className="flex flex-col items-center gap-2">
                      <span className="loading loading-spinner loading-lg text-primary"></span>
                      <p className="text-base-content/60">กำลังอัปโหลดรูปภาพ...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-base-content/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <p className="text-base-content/60">คลิกเพื่อเลือกรูปภาพ</p>
                      <p className="text-xs text-base-content/40">รองรับ JPG, PNG, GIF (สูงสุด 5MB ต่อรูป)</p>
                    </div>
                  )}
                </div>

                {/* Image Preview */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-base-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 btn btn-circle btn-sm btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Visibility Settings */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium text-lg">กลุ่มเป้าหมาย</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {visibilityOptions.map((option) => (
                    <label key={option.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value={option.value}
                        checked={visibility === option.value}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="sr-only"
                      />
                      <div className={`card border-2 transition-all ${
                        visibility === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-base-300 hover:border-primary/50'
                      }`}>
                        <div className="card-body p-4 text-center">
                          <div className="text-2xl mb-2">{option.icon}</div>
                          <h4 className="font-semibold text-sm">{option.label}</h4>
                          <p className="text-xs text-base-content/60 mt-1">{option.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="card-actions justify-between pt-6 border-t border-base-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn btn-ghost btn-lg"
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={loading || (!content.trim() && images.length === 0)}
                >
                  {loading ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      กำลังโพสต์...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      โพสต์
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

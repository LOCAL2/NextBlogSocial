export const formatDate = (dateString) => {
  if (!dateString) return 'เมื่อสักครู่';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'เมื่อสักครู่';
  
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 0) return 'เมื่อสักครู่'; // Future date
  if (diffInSeconds < 60) return 'เมื่อสักครู่';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
  
  try {
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'เมื่อสักครู่';
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return 'ไม่ระบุ';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'ไม่ระบุ';
  
  try {
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return 'ไม่ระบุ';
  }
};

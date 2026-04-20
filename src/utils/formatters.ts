export const formatDateDisplay = (dateStr: any) => {
  if (!dateStr) return '';
  
  // Handle Excel serial dates (numbers)
  if (typeof dateStr === 'number' || (!isNaN(Number(dateStr)) && !String(dateStr).includes('-') && !String(dateStr).includes('/'))) {
    const serial = Number(dateStr);
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const cleanDate = String(dateStr).trim();
  
  // YYYY-MM-DD or DD-MM-YYYY
  if (cleanDate.includes('-')) {
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD -> DD/MM/YYYY
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      } else {
        // DD-MM-YYYY or MM-DD-YYYY (assume DD-MM-YYYY for Spain) -> DD/MM/YYYY
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
    }
  }
  
  // DD/MM/YYYY or YYYY/MM/DD
  if (cleanDate.includes('/')) {
    const parts = cleanDate.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD -> DD/MM/YYYY
        return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
      } else {
        // DD/MM/YYYY -> DD/MM/YYYY
        return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
      }
    }
  }
  
  return cleanDate;
};

export const formatTimeDisplay = (timeStr: any) => {
  if (!timeStr && timeStr !== 0) return '';
  
  // Handle Excel serial times (numbers between 0 and 1)
  if (typeof timeStr === 'number' || (!isNaN(Number(timeStr)) && !String(timeStr).includes(':'))) {
    const serial = Number(timeStr);
    if (serial >= 0 && serial < 1) {
      const totalSeconds = Math.round(serial * 24 * 60 * 60);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    // If it's a whole number, assume it's the hour
    if (Number.isInteger(serial) && serial >= 0 && serial <= 23) {
      return `${String(serial).padStart(2, '0')}:00`;
    }
  }

  const cleanTime = String(timeStr).trim();
  if (cleanTime.includes(':')) {
    const parts = cleanTime.split(':');
    const hours = parts[0].padStart(2, '0');
    const minutes = (parts[1] || '00').padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  if (!isNaN(Number(cleanTime)) && cleanTime.length > 0) {
    const num = Number(cleanTime);
    if (num >= 0 && num <= 23) {
      return `${String(num).padStart(2, '0')}:00`;
    }
  }
  
  return cleanTime;
};

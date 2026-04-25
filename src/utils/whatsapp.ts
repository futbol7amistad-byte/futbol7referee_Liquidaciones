export function getWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
  const encodedText = encodeURIComponent(text);
  
  if (cleanPhone) {
    return `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodedText}`;
  } else {
    return `https://api.whatsapp.com/send/?text=${encodedText}`;
  }
}

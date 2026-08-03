export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

export const formatDate = (date: string | Date) =>
  new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));

export const formatDateShort = (date: string | Date) =>
  new Intl.DateTimeFormat('en-NG', { month: 'short', day: 'numeric' }).format(new Date(date));

export const wagonsRequired = (weightTonnes: number, capacityPerWagon: number) =>
  Math.ceil(weightTonnes / capacityPerWagon);

export const locosRequired = (wagons: number, maxWagonsPerLoco = 20) =>
  Math.ceil(wagons / maxWagonsPerLoco);

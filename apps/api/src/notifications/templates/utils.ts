export const formatMoney = (amount: number | string | null | undefined, currency: string) => {
  const numeric = typeof amount === 'string' ? Number(amount) : (amount ?? 0);
  if (!Number.isFinite(numeric)) {
    return String(amount ?? '');
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(numeric);
  } catch {
    return `$${numeric.toFixed(2)}`;
  }
};

export const formatDate = (value: Date | string | null | undefined) => {
  if (!value) {
    return '';
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

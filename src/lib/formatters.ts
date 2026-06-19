export function formatCurrency(value: number | string, currencyCode: string = 'BRL'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  let locale = 'pt-BR';
  if (currencyCode === 'USD') locale = 'en-US';
  if (currencyCode === 'EUR') locale = 'de-DE';
  if (isNaN(num)) return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(0);
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode }).format(num);
}
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('pt-BR').format(num);
}

export function formatPercent(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0,00%';
  return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num / 100);
}

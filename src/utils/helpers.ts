import { AppConfig, OccupancyData, HotelConfig } from '../types';

// JSON round-trip turns Date objects into ISO strings — this restores them
export function hydrateReport(report: OccupancyData): OccupancyData {
  return {
    ...report,
    dateLabels: report.dateLabels.map(dl => ({
      ...dl,
      date: dl.date && !(dl.date instanceof Date) ? new Date(dl.date as unknown as string) : dl.date,
    })),
  };
}

export function getOccupancyRate(report: OccupancyData, dayIndex: number): number {
  const cap = report.capaciteDay[dayIndex];
  if (cap <= 0) return 0;
  return ((cap - report.libresTotal[dayIndex]) / cap) * 100;
}

export function getRateClass(rate: number, config: AppConfig): 'high' | 'mid' | 'low' {
  if (rate >= config.highOccupancyThreshold) return 'high';
  if (rate >= config.lowOccupancyThreshold) return 'mid';
  return 'low';
}

export function getDayPrice(report: OccupancyData, dayIndex: number, hotel: HotelConfig, config: AppConfig): number {
  if (config.useAveragePriceForRevenue) return hotel.defaultRoomPrice;
  return report.prices[dayIndex] || hotel.defaultRoomPrice;
}

export function getDayOccupied(report: OccupancyData, dayIndex: number): number {
  return report.capaciteDay[dayIndex] - report.libresTotal[dayIndex];
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

import { VehicleType } from '../entities/order.entity';

// 平台计费规则（演示环境统一约定）
export const STORAGE_DAILY_RATE = 3; // 仓储费 3 元/天/件
export const DELIVERY_BASE_FEE: Record<VehicleType, number> = {
  [VehicleType.SMALL_VAN]: 80,
  [VehicleType.MEDIUM_TRUCK]: 150,
  [VehicleType.LARGE_TRUCK]: 260,
};
export const FLOOR_SURCHARGE_PER_FLOOR = 10; // 无电梯时每层加收（1层起算）
export const DISASSEMBLY_FEE = 60; // 拆装费
export const OLD_FURNITURE_REMOVAL_FEE = 50; // 旧家具搬出费
export const OVERRUN_THRESHOLD = 1.2; // 翻新实际成本超过预估 120% 触发预警工单

export function calcDeliveryFee(input: {
  vehicleType: VehicleType;
  floor: number;
  hasElevator: boolean;
  needDisassembly: boolean;
  needOldFurnitureRemoval: boolean;
}): number {
  let fee = DELIVERY_BASE_FEE[input.vehicleType] ?? 100;
  if (!input.hasElevator && input.floor > 1) {
    fee += (input.floor - 1) * FLOOR_SURCHARGE_PER_FLOOR;
  }
  if (input.needDisassembly) fee += DISASSEMBLY_FEE;
  if (input.needOldFurnitureRemoval) fee += OLD_FURNITURE_REMOVAL_FEE;
  return fee;
}

export function calcStorageFee(
  storageStartAt: Date | null,
  until: Date,
): { days: number; fee: number } {
  if (!storageStartAt) return { days: 0, fee: 0 };
  const ms = until.getTime() - new Date(storageStartAt).getTime();
  const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  return { days, fee: days * STORAGE_DAILY_RATE };
}

let seq = 0;
export function bizNo(prefix: string): string {
  seq = (seq + 1) % 10000;
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}${stamp}${String(seq).padStart(3, '0')}${rand}`;
}

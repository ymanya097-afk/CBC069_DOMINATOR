import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from './supabaseClient.ts';
import { Availability, AvailabilitySchedule, DayOfWeek, TimeSlot } from '../types.ts';

const DAYS_ARRAY: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const DEFAULT_SCHEDULE: AvailabilitySchedule = {
  Monday: { Morning: true, Afternoon: true, Evening: true, Night: false },
  Tuesday: { Morning: true, Afternoon: true, Evening: true, Night: false },
  Wednesday: { Morning: true, Afternoon: true, Evening: true, Night: false },
  Thursday: { Morning: true, Afternoon: true, Evening: true, Night: false },
  Friday: { Morning: true, Afternoon: true, Evening: true, Night: false },
  Saturday: { Morning: true, Afternoon: true, Evening: true, Night: true },
  Sunday: { Morning: true, Afternoon: true, Evening: true, Night: false }
};

export const availabilityRepo = {
  async findByMemberId(memberId: string, client?: SupabaseClient): Promise<Availability | null> {
    const sb = getClient(client);
    const { data, error } = await sb
      .from('availability')
      .select('*')
      .eq('member_id', memberId);

    if (error || !data || data.length === 0) {
      return {
        id: `avail-${memberId}`,
        member_id: memberId,
        slots: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)),
        updated_at: new Date().toISOString()
      };
    }

    const slots: AvailabilitySchedule = JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));

    for (const row of data) {
      const dayName = DAYS_ARRAY[row.day_of_week];
      if (dayName && row.slot) {
        if (!slots[dayName]) slots[dayName] = {};
        slots[dayName][row.slot] = row.is_available;
      }
    }

    return {
      id: `avail-${memberId}`,
      member_id: memberId,
      slots,
      updated_at: new Date().toISOString()
    };
  },

  async upsert(memberId: string, schedule: AvailabilitySchedule, client?: SupabaseClient): Promise<Availability> {
    const sb = getClient(client);
    const rows: any[] = [];

    DAYS_ARRAY.forEach((dayName, dayIndex) => {
      const daySlots = schedule[dayName];
      if (daySlots) {
        (['Morning', 'Afternoon', 'Evening', 'Night'] as TimeSlot[]).forEach(slotName => {
          if (daySlots[slotName] !== undefined) {
            rows.push({
              member_id: memberId,
              day_of_week: dayIndex,
              slot: slotName,
              is_available: daySlots[slotName]
            });
          }
        });
      }
    });

    if (rows.length > 0) {
      const { error } = await sb
        .from('availability')
        .upsert(rows, { onConflict: 'member_id,day_of_week,slot' });

      if (error) console.error('Error upserting availability:', error);
    }

    return {
      id: `avail-${memberId}`,
      member_id: memberId,
      slots: schedule,
      updated_at: new Date().toISOString()
    };
  },

  getDefaultSchedule(): AvailabilitySchedule {
    return JSON.parse(JSON.stringify(DEFAULT_SCHEDULE));
  }
};

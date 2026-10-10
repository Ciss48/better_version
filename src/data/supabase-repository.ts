import type { DayLog, ISODate, Mutation, Settings, Task } from '@/domain';
import type { DateRange, Repository } from './repository';
import type { BrowserSupabase } from './supabase/client';
import { createBrowserSupabase } from './supabase/client';
import type { Json } from './supabase/database.types';
import {
  dayLogToRow,
  eventToRow,
  rowToDayLog,
  rowToSettings,
  rowToTask,
  settingsToRow,
  taskToRow,
} from './supabase/mappers';

/** PostgREST's hard per-request cap. */
const PAGE_SIZE = 1000;

/**
 * Talks to Postgres through the generated RPC + PostgREST, under RLS. Every
 * requirement is `memory/phase_05_report.md`'s "Phase 7 — what a Supabase
 * Repository must honour":
 *
 * - `commit` is one `rpc('commit_mutation', …)` call — one transaction, so a
 *   partial write cannot happen (requirement 1).
 * - Upserts hit `on conflict (id) do update` inside the RPC (requirement 2).
 * - The events array keeps its mutation order; `commit_mutation` inserts it
 *   with `jsonb_array_elements(...) with ordinality ... order by ord`, so the
 *   identity `seq` column reproduces that order on read (requirement 4).
 * - `loadTasks`/`loadDayLogs` paginate past PostgREST's 1000-row cap
 *   (requirement 6).
 * - `loadSettings` returns `null`, never a default row (requirement 7).
 */
export class SupabaseRepository implements Repository {
  constructor(private readonly client: BrowserSupabase = createBrowserSupabase()) {}

  private async userId(): Promise<string> {
    const {
      data: { user },
      error,
    } = await this.client.auth.getUser();
    if (error) throw error;
    if (user === null) throw new Error('not authenticated');
    return user.id;
  }

  async loadSettings(): Promise<Settings | null> {
    const userId = await this.userId();
    const { data, error } = await this.client
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data === null ? null : rowToSettings(data);
  }

  async saveSettings(s: Settings): Promise<void> {
    const userId = await this.userId();
    const { error } = await this.client
      .from('user_settings')
      .upsert({ ...settingsToRow(s), user_id: userId }, { onConflict: 'user_id' });
    if (error) throw error;
  }

  async loadTasks(r: DateRange): Promise<Task[]> {
    const userId = await this.userId();
    const tasks: Task[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await this.client
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .gte('plan_date', r.from)
        .lte('plan_date', r.to)
        .order('plan_date', { ascending: true })
        .order('position', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = data ?? [];
      tasks.push(...page.map(rowToTask));
      if (page.length < PAGE_SIZE) return tasks;
      from += PAGE_SIZE;
    }
  }

  async loadDayLogs(r: DateRange): Promise<DayLog[]> {
    const userId = await this.userId();
    const logs: DayLog[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await this.client
        .from('day_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('plan_date', r.from)
        .lte('plan_date', r.to)
        .order('plan_date', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = data ?? [];
      logs.push(...page.map(rowToDayLog));
      if (page.length < PAGE_SIZE) return logs;
      from += PAGE_SIZE;
    }
  }

  async firstPlanDate(): Promise<ISODate | null> {
    const userId = await this.userId();
    const { data, error } = await this.client
      .from('tasks')
      .select('plan_date')
      .eq('user_id', userId)
      .eq('adhoc', false)
      .order('plan_date', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data === null ? null : data.plan_date;
  }

  async commit(m: Mutation, dayLog?: DayLog): Promise<void> {
    // RPC args are typed as Json by the generated types; the upsert/event
    // shapes are plain JSON-serialisable objects, just not literally `Json`.
    const { error } = await this.client.rpc('commit_mutation', {
      p_upserts: m.upserts.map(taskToRow) as unknown as Json,
      p_deletes: m.deletes,
      p_events: m.events.map(eventToRow) as unknown as Json,
      p_day_log: dayLog === undefined ? null : (dayLogToRow(dayLog) as unknown as Json),
    });
    if (error) throw error;
  }

  async reset(): Promise<void> {
    const { error } = await this.client.rpc('reset_my_data');
    if (error) throw error;
  }
}

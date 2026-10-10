import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import type { Mutation, TaskEvent, TaskEventType } from '@/domain';
import type { Database } from '@/data/supabase/database.types';
import { SupabaseRepository } from '@/data/supabase-repository';
import {
  describeRepositoryContract,
  makeTask,
} from '../../src/data/__tests__/repository.contract';

/**
 * Signs in as one of the two throwaway users `global-setup.ts` created, with
 * a plain `supabase-js` client (not `@supabase/ssr`'s browser client, which
 * expects `document` for its cookie fallback and has no reason to run here).
 */
async function signedInClient(user: { email: string; password: string }): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await client.auth.signInWithPassword(user);
  if (error) throw error;
  return client;
}

function mutation(partial: Partial<Mutation> = {}): Mutation {
  return { upserts: [], deletes: [], events: [], notices: [], ...partial };
}

function makeEvent(overrides: Partial<TaskEvent> = {}): TaskEvent {
  return {
    id: crypto.randomUUID(),
    type: 'task_created',
    taskId: null,
    planDate: '2026-10-03',
    occurredAt: '2026-10-03T01:00:00.000Z',
    payload: {},
    ...overrides,
  };
}

const ALL = { from: '2000-01-01', to: '2100-01-01' };

describe('SupabaseRepository — contract', () => {
  let primaryClient: SupabaseClient<Database>;
  let primaryRepo: SupabaseRepository;

  beforeAll(async () => {
    const { primary } = inject('supabaseContractUsers');
    primaryClient = await signedInClient(primary);
    primaryRepo = new SupabaseRepository(primaryClient);
  });

  describeRepositoryContract('SupabaseRepository', () => primaryRepo);

  describe('Supabase-specific requirements', () => {
    beforeEach(async () => {
      await primaryRepo.reset();
    });

    it('atomicity: a commit with an invalid event type rejects and changes nothing', async () => {
      const task = makeTask('2026-10-03');
      const badEvent = { ...makeEvent({ taskId: task.id }), type: 'not_a_real_type' } as unknown as TaskEvent;

      await expect(
        primaryRepo.commit(mutation({ upserts: [task], events: [badEvent] })),
      ).rejects.toThrow();

      expect(await primaryRepo.loadTasks(ALL)).toEqual([]);
      expect(await primaryRepo.loadDayLogs(ALL)).toEqual([]);
    });

    it('pagination: 1,050 tasks committed in batches all come back from loadTasks', async () => {
      const batches = [350, 350, 350];
      for (const size of batches) {
        const tasks = Array.from({ length: size }, (_, i) => makeTask('2026-10-03', { position: i }));
        await primaryRepo.commit(mutation({ upserts: tasks }));
      }
      const loaded = await primaryRepo.loadTasks(ALL);
      expect(loaded).toHaveLength(1050);
      expect(new Set(loaded.map((t) => t.id)).size).toBe(1050);
    });

    it('event order: a 3-event mutation is read back (by seq) in array order', async () => {
      const task = makeTask('2026-10-03');
      const events = [0, 1, 2].map((i) =>
        makeEvent({ taskId: task.id, type: 'task_updated' as TaskEventType, payload: { order: i } }),
      );
      await primaryRepo.commit(mutation({ upserts: [task], events }));

      const { data, error } = await primaryClient
        .from('task_events')
        .select('*')
        .eq('task_id', task.id)
        .order('seq', { ascending: true });
      if (error) throw error;

      expect(data?.map((row) => (row.payload as { order: number }).order)).toEqual([0, 1, 2]);
      expect(data?.map((row) => row.id)).toEqual(events.map((e) => e.id));
    });

    describe('RLS isolation from a second user', () => {
      let secondaryClient: SupabaseClient<Database>;
      let secondaryRepo: SupabaseRepository;

      beforeAll(async () => {
        const { secondary } = inject('supabaseContractUsers');
        secondaryClient = await signedInClient(secondary);
        secondaryRepo = new SupabaseRepository(secondaryClient);
      });

      afterAll(async () => {
        await secondaryRepo.reset();
      });

      it('cannot select another user’s rows, even unfiltered', async () => {
        const task = makeTask('2026-10-03');
        await primaryRepo.commit(mutation({ upserts: [task] }));

        expect(await secondaryRepo.loadTasks(ALL)).toEqual([]);

        // The repository always scopes its own query by the caller's id; this
        // checks the database policy directly, with no such filter applied.
        const { data, error } = await secondaryClient.from('tasks').select('*').eq('id', task.id);
        if (error) throw error;
        expect(data).toEqual([]);
      });

      it('cannot write over another user’s task id via the RPC', async () => {
        const task = makeTask('2026-10-03', { title: 'Của người khác' });
        await primaryRepo.commit(mutation({ upserts: [task] }));

        const stolen = { ...task, title: 'Chiếm đoạt' };
        await expect(secondaryRepo.commit(mutation({ upserts: [stolen] }))).rejects.toThrow();

        const [stillPrimary] = await primaryRepo.loadTasks(ALL);
        expect(stillPrimary.title).toBe('Của người khác');
      });
    });
  });
});

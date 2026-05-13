/**
 * TDD tests for inventory.ts helpers.
 *
 * Spec: R4-3-1..R4-3-6
 *
 * All supabase calls are mocked via the module factory pattern.
 */

// ── supabase mock ─────────────────────────────────────────────────────────────
// We build a chainable mock: from().select().eq().order() etc. all return a
// thenable that resolves to { data, error }.

let mockFromData: unknown[] | null = null;
let mockFromError: { message: string } | null = null;
let mockUpsertError: { message: string } | null = null;
let mockUser: { id: string } | null = { id: 'user-uuid-123' };

const mockOrder = jest.fn().mockImplementation(() => Promise.resolve({ data: mockFromData, error: mockFromError }));
const mockEq = jest.fn().mockImplementation(() => Promise.resolve({ data: mockFromData, error: mockFromError }));
const mockSelect = jest.fn().mockImplementation(() => ({ eq: mockEq, order: mockOrder }));
const mockUpsert = jest.fn().mockImplementation(() => Promise.resolve({ error: mockUpsertError }));
const mockFrom = jest.fn().mockReturnValue({
  select: mockSelect,
  upsert: mockUpsert,
});

const mockGetUser = jest.fn().mockImplementation(() =>
  Promise.resolve({ data: { user: mockUser }, error: null })
);

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// ── imports (after mock) ──────────────────────────────────────────────────────
import {
  setQuantity,
  getMyInventory,
  getAlbumCatalog,
  incrementQuantity,
  decrementQuantity,
} from '../../src/lib/inventory';

// ── helpers ───────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockFromData = null;
  mockFromError = null;
  mockUpsertError = null;
  mockUser = { id: 'user-uuid-123' };

  // Re-wire mocks after clearAllMocks
  mockOrder.mockImplementation(() => Promise.resolve({ data: mockFromData, error: mockFromError }));
  mockEq.mockImplementation(() => Promise.resolve({ data: mockFromData, error: mockFromError }));
  mockSelect.mockImplementation(() => ({ eq: mockEq, order: mockOrder }));
  mockUpsert.mockImplementation(() => Promise.resolve({ error: mockUpsertError }));
  mockFrom.mockReturnValue({ select: mockSelect, upsert: mockUpsert });
  mockGetUser.mockImplementation(() =>
    Promise.resolve({ data: { user: mockUser }, error: null })
  );
});

// ── setQuantity ───────────────────────────────────────────────────────────────
describe('setQuantity', () => {
  it('calls supabase upsert with correct args when quantity is valid', async () => {
    const result = await setQuantity('cromo-uuid', 3);

    expect(result).toEqual({ error: null });
    expect(mockFrom).toHaveBeenCalledWith('inventory_items');
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: 'user-uuid-123', cromo_id: 'cromo-uuid', quantity: 3 },
      { onConflict: 'user_id,cromo_id' }
    );
  });

  it('returns error and does NOT call supabase when quantity is negative', async () => {
    const result = await setQuantity('cromo-uuid', -1);

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Invalid quantity');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('returns error and does NOT call supabase when quantity is non-integer', async () => {
    const result = await setQuantity('cromo-uuid', 1.5);

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Invalid quantity');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('calls upsert with quantity=0 (valid)', async () => {
    const result = await setQuantity('cromo-uuid', 0);

    expect(result).toEqual({ error: null });
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: 'user-uuid-123', cromo_id: 'cromo-uuid', quantity: 0 },
      { onConflict: 'user_id,cromo_id' }
    );
  });

  it('returns Not authenticated error when no auth user', async () => {
    mockUser = null;
    const result = await setQuantity('cromo-uuid', 1);

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('Not authenticated');
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('returns error when supabase upsert fails, and logs with no PII', async () => {
    mockUpsertError = { message: 'RLS violation' };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await setQuantity('cromo-uuid', 2);

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('RLS violation');
    expect(consoleSpy).toHaveBeenCalledWith('[inventory] setQuantity error:', 'RLS violation');
    // Ensure no user_id, email, or phone in log args
    const logArgs = consoleSpy.mock.calls[0].join(' ');
    expect(logArgs).not.toContain('user-uuid-123');
    consoleSpy.mockRestore();
  });
});

// ── getMyInventory ────────────────────────────────────────────────────────────
describe('getMyInventory', () => {
  it('returns empty array when no auth user', async () => {
    mockUser = null;
    const result = await getMyInventory();
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns rows when supabase resolves with data', async () => {
    const rows = [{ id: 'inv-1', cromo_id: 'cromo-1', quantity: 2 }];
    mockEq.mockImplementationOnce(() => Promise.resolve({ data: rows, error: null }));

    const result = await getMyInventory();

    expect(result).toEqual(rows);
    expect(mockFrom).toHaveBeenCalledWith('inventory_items');
  });
});

// ── getAlbumCatalog ───────────────────────────────────────────────────────────
describe('getAlbumCatalog', () => {
  it('calls from cromo_with_country_rarity and orders by n ascending', async () => {
    const rows = [{ id: 'c1', number: 1 }];
    mockOrder.mockImplementationOnce(() => Promise.resolve({ data: rows, error: null }));

    const result = await getAlbumCatalog();

    expect(mockFrom).toHaveBeenCalledWith('cromo_with_country_rarity');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockOrder).toHaveBeenCalledWith('n', { ascending: true });
    expect(result).toEqual(rows);
  });
});

// ── incrementQuantity / decrementQuantity ────────────────────────────────────
describe('incrementQuantity', () => {
  it('calls setQuantity with current+1', async () => {
    await incrementQuantity('cromo-uuid', 2);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 3 }),
      expect.any(Object)
    );
  });
});

describe('decrementQuantity', () => {
  it('calls setQuantity with current-1 clamped to 0', async () => {
    await decrementQuantity('cromo-uuid', 0);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 0 }),
      expect.any(Object)
    );
  });

  it('decrements correctly when current > 0', async () => {
    await decrementQuantity('cromo-uuid', 3);

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: 2 }),
      expect.any(Object)
    );
  });
});

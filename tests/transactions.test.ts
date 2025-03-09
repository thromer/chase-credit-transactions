import { TransactionService } from '../src/transactions';

describe('TransactionService - initialize method', () => {
  test('should initialize correctly with defaultAccountId in first cache entry', async () => {
    const mockSuccessResponse = {
      cache: [{
        response: {
          defaultAccountId: 12345
        }
      }],
      profileId: 67890
    };

    const mockFetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockSuccessResponse)
    });
    const mockRateLimiter = jest.fn(fn => fn());
    
    const service = await TransactionService.create(mockRateLimiter, mockFetcher);
    
    expect(mockFetcher).toHaveBeenCalledWith(
      '/svc/rl/accounts/l4/v1/app/data/list',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-jpmc-channel': 'id=C30',
          'x-jpmc-csrf-token': 'NONE',
        }),
        credentials: 'same-origin'
      })
    );
    
    expect(mockRateLimiter).toHaveBeenCalled();
    
    // @ts-ignore - Accessing private properties for testing
    expect(service.defaultAccountId).toBe(12345);
    // @ts-ignore - Accessing private properties for testing
    expect(service.profileId).toBe(67890);
  });

  // Test successful initialization with defaultAccountId in later cache entry
  test('should initialize correctly with defaultAccountId in later cache entry', async () => {
    const mockSuccessResponse = {
      cache: [
        { response: {} },
        { response: { someOtherField: true } },
        { response: { defaultAccountId: 67890 } }
      ],
      profileId: 12345
    };

    const mockFetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockSuccessResponse)
    });
    const mockRateLimiter = jest.fn(fn => fn());
    
    const service = await TransactionService.create(mockRateLimiter, mockFetcher);
    
    // @ts-ignore - Accessing private properties for testing
    expect(service.defaultAccountId).toBe(67890);
    // @ts-ignore - Accessing private properties for testing
    expect(service.profileId).toBe(12345);
  });

  // Test missing defaultAccountId in all cache entries
  test('should throw error when defaultAccountId is missing from all cache entries', async () => {
    const mockMissingDefaultAccountId = {
      cache: [
        { response: {} },
        { response: { someOtherField: true } },
        { response: { yetAnotherField: 'value' } }
      ],
      profileId: 67890
    };
    
    const mockFetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockMissingDefaultAccountId)
    });
    const mockRateLimiter = jest.fn(fn => fn());
    
    await expect(TransactionService.create(mockRateLimiter, mockFetcher)).rejects.toThrow(
      "API response missing required field: defaultAccountId"
    );
  });

  // Test empty cache array
  test('should throw error when cache array is empty', async () => {
    const mockEmptyCache = {
      cache: [],
      profileId: 67890
    };
    
    const mockFetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockEmptyCache)
    });
    const mockRateLimiter = jest.fn(fn => fn());
    
    await expect(TransactionService.create(mockRateLimiter, mockFetcher)).rejects.toThrow(
      "API response missing required cache data"
    );
  });

  // Test missing profileId
  test('should throw error when profileId is missing', async () => {
    const mockMissingProfileId = {
      cache: [{
        response: {
          defaultAccountId: 12345
        }
      }]
      // profileId is missing
    };
    
    const mockFetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockMissingProfileId)
    });
    const mockRateLimiter = jest.fn(fn => fn());
    
    await expect(TransactionService.create(mockRateLimiter, mockFetcher)).rejects.toThrow(
      "API response missing required field: profileId"
    );
  });

  // Test API error case
  test('should handle API errors', async () => {
    const mockFetcher = jest.fn().mockResolvedValue({
      ok: false,
      status: 500
    });
    const mockRateLimiter = jest.fn(fn => fn());
    
    await expect(TransactionService.create(mockRateLimiter, mockFetcher)).rejects.toThrow(
      "HTTP error! status: 500"
    );
  });
});
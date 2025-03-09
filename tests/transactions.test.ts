import { TransactionService } from '../src/transactions';

describe('TransactionService - initialize method', () => {
  // Mock response for successful case
  const mockSuccessResponse = {
    cache: [{
      response: {
        defaultAccountId: 12345
      }
    }],
    profileId: 67890
  };

  // Test successful initialization
  test('should initialize correctly with valid response', async () => {
    // Setup mocks
    const mockFetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockSuccessResponse)
    });
    const mockRateLimiter = jest.fn(fn => fn());
    
    // Use the static create method instead of constructor
    const service = await TransactionService.create(mockRateLimiter, mockFetcher);
    
    // Verify the fetch was called with correct parameters
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
    
    // Verify the rate limiter was called
    expect(mockRateLimiter).toHaveBeenCalled();
    
    // Verify the properties were set correctly
    // @ts-ignore - Accessing private properties for testing
    expect(service.defaultAccountId).toBe(12345);
    // @ts-ignore - Accessing private properties for testing
    expect(service.profileId).toBe(67890);
  });

  // Test missing defaultAccountId
  test('should throw error when defaultAccountId is missing', async () => {
    // Setup mock with missing defaultAccountId
    const mockMissingDefaultAccountId = {
      cache: [{
        response: {}
      }],
      profileId: 67890
    };
    
    const mockFetcher = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockMissingDefaultAccountId)
    });
    const mockRateLimiter = jest.fn(fn => fn());
    
    // Assert that create throws the expected error
    await expect(TransactionService.create(mockRateLimiter, mockFetcher)).rejects.toThrow(
      "API response missing required field: defaultAccountId"
    );
  });

  // Test missing profileId
  test('should throw error when profileId is missing', async () => {
    // Setup mock with missing profileId
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
    
    // Assert that create throws the expected error
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
    
    // Assert that create propagates the error from fetch
    await expect(TransactionService.create(mockRateLimiter, mockFetcher)).rejects.toThrow(
      "HTTP error! status: 500"
    );
  });
});
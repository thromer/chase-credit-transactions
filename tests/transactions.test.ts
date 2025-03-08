import { Transaction } from '../src/transactions';

describe('Transaction Class', () => {
    let transaction: Transaction;

    beforeEach(() => {
        transaction = new Transaction('1', 100, new Date('2023-01-01'), 'Test transaction');
    });

    test('should create a transaction with correct properties', () => {
        expect(transaction.id).toBe('1');
        expect(transaction.amount).toBe(100);
        expect(transaction.date).toEqual(new Date('2023-01-01'));
        expect(transaction.description).toBe('Test transaction');
    });

    test('should return transaction details', () => {
        const details = transaction.getDetails();
        expect(details).toEqual({
            id: '1',
            amount: 100,
            date: new Date('2023-01-01'),
            description: 'Test transaction',
        });
    });
});
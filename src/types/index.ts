export interface TransactionDetails {
    id: string;
    amount: number;
    date: Date;
    description: string;
}

export interface TransactionReport {
    totalTransactions: number;
    totalAmount: number;
    transactions: TransactionDetails[];
}
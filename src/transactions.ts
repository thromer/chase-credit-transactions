import { Temporal } from "@js-temporal/polyfill";

import { v4 as uuidv4 } from 'uuid'

class Transaction {
    id: string;
    amount: number; // Positive for charges, negative for credits
    postDate: Temporal.PlainDate;
    merchantDbaName: string;
    merchantOrderIdentifier?: string;

    constructor(
        id: string,
        amount: number,
        postDate: Temporal.PlainDate,
        merchantDbaName: string,
        merchantOrderIdentifier?: string
    ) {
        this.id = id;
        this.amount = amount;
        this.postDate = postDate;
        this.merchantDbaName = merchantDbaName;
        if (merchantOrderIdentifier) {
            this.merchantOrderIdentifier = merchantOrderIdentifier;
        }
    }
}

interface ApiResponse {
    cache: Array<{
        response: {
            defaultAccountId: number;
        };
    }>;
    profileId: number;
}

class TransactionService {
    private defaultAccountId!: number;
    private profileId!: number;
    private rateLimiter: (fn: () => Promise<any>) => Promise<any>;
    private fetcher: (
        input: RequestInfo,
        init?: RequestInit
    ) => Promise<Response>;

    private constructor(
        rateLimiter: (fn: () => Promise<any>) => Promise<any>,
        fetcher: (input: RequestInfo, init?: RequestInit) => Promise<Response>
    ) {
        this.rateLimiter = rateLimiter;
        this.fetcher = fetcher;
    }

    static async create(
        rateLimiter: (fn: () => Promise<any>) => Promise<any>,
        fetcher: (input: RequestInfo, init?: RequestInit) => Promise<Response>
    ): Promise<TransactionService> {
        const service = new TransactionService(rateLimiter, fetcher);
        await service.initialize();
        return service;
    }

    private async initialize() {
        const data = await this.fetch<ApiResponse>(
            "POST",
            "/svc/rl/accounts/l4/v1/app/data/list"
        );

        if (!data.cache?.[0]?.response?.defaultAccountId) {
            throw new Error(
                "API response missing required field: defaultAccountId"
            );
        }
        if (!data.profileId) {
            throw new Error("API response missing required field: profileId");
        }

        this.defaultAccountId = data.cache[0].response.defaultAccountId;
        this.profileId = data.profileId;
    }

    async *getTransactions(
        startDate: Temporal.PlainDate,
        endDate: Temporal.PlainDate = Temporal.Now.plainDateISO(
            "America/New_York"
        )
    ): AsyncGenerator<Transaction> {
        const today = Temporal.Now.plainDateISO("America/New_York");

        if (Temporal.PlainDate.compare(endDate, today) > 0) {
            throw new Error("endDate cannot be later than today.");
        }

        if (
            Temporal.PlainDate.compare(
                endDate.subtract({ days: 90 }),
                startDate
            ) > 0
        ) {
            throw new Error("The date range cannot exceed 90 days.");
        }

        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const transactions = await this.rateLimiter(() =>
                this.fetchTransactions(startDate, endDate, page)
            );
            for (const transaction of transactions) {
                yield transaction;
            }
            hasMore = transactions.length > 0;
            page++;
        }
    }

    private async fetchTransactions(
        startDate: Temporal.PlainDate,
        endDate: Temporal.PlainDate,
        page: number
    ): Promise<Transaction[]> {
        const data = await this.fetch<any[]>(
            'GET',
            `https://api.example.com/transactions?start=${startDate.toString()}&end=${endDate.toString()}&page=${page}`
        );
        return data.map(
            (item: any) =>
                new Transaction(
                    item.id,
                    item.amount,
                    Temporal.PlainDate.from(item.postDate),
                    item.merchantDbaName,
                    item.merchantOrderIdentifier
                )
        );
    }

    async addTransactionDetails(transaction: Transaction): Promise<void> {
        const data = await this.fetch<{merchantOrderIdentifier: string}>(
            'GET',
            `https://api.example.com/transactions/${transaction.id}`
        );
        transaction.merchantOrderIdentifier = data.merchantOrderIdentifier;
    }
    
    private async fetch<T>(method: string = 'GET', url: string, init?: RequestInit): Promise<T> {
        const headers = {
            'x-jpmc-channel': 'id=C30',
            'x-jpmc-client-request-id': uuidv4(),
            'x-jpmc-csrf-token': 'NONE',
            ...(init?.headers || {})
        };

        const response = await this.rateLimiter(async () => {
            const resp = await this.fetcher(url, { 
                ...init, 
                method,
                headers,
                credentials: 'same-origin'
            });
            if (!resp.ok) {
                throw new Error(`HTTP error! status: ${resp.status}`);
            }
            return resp;
        });

        return response.json();
    }
}

export { Transaction, TransactionService };

import { Temporal } from "@js-temporal/polyfill";

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
    code: string;
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
    private initialized: boolean = false;
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
        const response = await this.fetcher(
            "https://api.example.com/special-ids"
        );
        const data: ApiResponse = await response.json();

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
        this.initialized = true;
    }

    async *getTransactions(
        startDate: Temporal.PlainDate,
        endDate: Temporal.PlainDate = Temporal.Now.plainDateISO(
            "America/New_York"
        )
    ): AsyncGenerator<Transaction> {
        if (!this.initialized) {
            await this.initialize();
        }

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
        if (!this.initialized) {
            await this.initialize();
        }
        const response = await this.fetcher(
            `https://api.example.com/transactions?start=${startDate.toString()}&end=${endDate.toString()}&page=${page}`
        );
        const data = await response.json();
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
        if (!this.initialized) {
            throw new Error("TransactionService not initialized");
        }
        const response = await this.rateLimiter(() =>
            this.fetcher(
                `https://api.example.com/transactions/${transaction.id}`
            )
        );
        const data = await response.json();
        transaction.merchantOrderIdentifier = data.merchantOrderIdentifier;
    }
}
export { Transaction, TransactionService };

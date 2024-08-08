export class MessageRateLimiter {
    private rateLimitMap: Map<bigint, number>;
    private interval: number;

    constructor() {
        this.rateLimitMap = new Map();
        this.interval = setInterval(() => {
            for (const key of this.rateLimitMap.keys()) {
                this.rateLimitMap.delete(key);
            }
        }, 30000);
    }


    public checkRateLimitForUser(authorId: bigint): boolean {
        let hasRateLimitBeenMeet = false;
        if (!this.rateLimitMap.has(authorId)) {
            this.rateLimitMap.set(authorId, 1);
        } else {
            let limit = this.rateLimitMap.get(authorId);
            if (limit && limit >= 5) {
                hasRateLimitBeenMeet = true;
            }
            limit = limit + 1;
            this.rateLimitMap.set(authorId, limit);
        }
        return hasRateLimitBeenMeet;
    }
}
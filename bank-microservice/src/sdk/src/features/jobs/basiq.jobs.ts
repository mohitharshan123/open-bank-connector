import { Logger } from '@nestjs/common';
import { BASIQ_CONSTANTS } from '../../shared/constants/basiq.constants';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { BasiqTransformer } from '../../shared/transformers/basiq.transformer';
import type { BasiqJob } from '../../shared/types/basiq';
import type { StandardJob } from '../../shared/types/common';

export class BasiqJobs {
    private readonly transformer: BasiqTransformer;
    private readonly baseUrl: string;

    constructor(
        private readonly httpClient: IHttpClient,
        config: { baseUrl?: string },
        private readonly logger: Logger
    ) {
        this.transformer = new BasiqTransformer(this.logger);
        this.baseUrl = config.baseUrl || BASIQ_CONSTANTS.BASE_URL;
    }

    /**
     * Get jobs for a Basiq user
     * If jobId is provided, returns that specific job, otherwise returns all jobs for the user
     */
    async getJobs(userId?: string, jobId?: string): Promise<StandardJob[]> {
        this.logger.debug(`[BasiqJobs] Getting jobs`, { userId, jobId });

        try {
            if (jobId) {
                const endpoint = BASIQ_CONSTANTS.ENDPOINTS.GET_JOB(jobId);
                const response = await this.httpClient.request<BasiqJob>({
                    method: 'GET',
                    url: endpoint,
                    baseURL: this.baseUrl,
                    headers: { 'Content-Type': 'application/json' },
                });
                return this.transformer.transformJobs(response.data);
            } else if (userId) {
                const endpoint = BASIQ_CONSTANTS.ENDPOINTS.GET_JOBS(userId);
                const response = await this.httpClient.request<{ data: BasiqJob[] } | BasiqJob[]>({
                    method: 'GET',
                    url: endpoint,
                    baseURL: this.baseUrl,
                    headers: { 'Content-Type': 'application/json' },
                });
                return this.transformer.transformJobs(response.data);
            } else {
                throw new Error('Basiq userId or jobId is required to get jobs');
            }
        } catch (error: any) {
            this.logger.error(`[BasiqJobs] Failed to get jobs`, {
                error: error.message,
                userId,
                jobId,
                status: error.response?.status,
                responseData: error.response?.data,
            });
            throw new Error(`Failed to get Basiq jobs: ${error.message || 'Unknown error'}`);
        }
    }
}


import { Injectable, Logger } from '@nestjs/common';
import { BASIQ_CONSTANTS } from '../../shared/constants/basiq.constants';
import type { IHttpClient } from '../../shared/interfaces/https-client.interface';
import { BasiqTransformer } from '../../shared/transformers/basiq.transformer';
import type { BasiqJob } from '../../shared/types/basiq';
import type { StandardJob } from '../../shared/types/common';

@Injectable()
export class BasiqJobs {
    private readonly logger = new Logger(BasiqJobs.name);
    private readonly transformer = new BasiqTransformer(this.logger);

    /**
     * Get jobs for a Basiq user
     * If jobId is provided, returns that specific job, otherwise returns all jobs for the user
     */
    async getJobs(httpClient: IHttpClient, config: { baseUrl?: string }, userId?: string, jobId?: string): Promise<StandardJob[]> {
        const baseUrl = config.baseUrl || BASIQ_CONSTANTS.BASE_URL;
        this.logger.debug(`[BasiqJobs] Getting jobs`, { userId, jobId });

        try {
            if (jobId) {
                const endpoint = BASIQ_CONSTANTS.ENDPOINTS.GET_JOB(jobId);
                const response = await httpClient.request<BasiqJob>({
                    method: 'GET',
                    url: endpoint,
                    baseURL: baseUrl,
                    headers: { 'Content-Type': 'application/json' },
                });
                return this.transformer.transformJobs(response.data);
            } else if (userId) {
                const endpoint = BASIQ_CONSTANTS.ENDPOINTS.GET_JOBS(userId);
                const response = await httpClient.request<{ data: BasiqJob[] } | BasiqJob[]>({
                    method: 'GET',
                    url: endpoint,
                    baseURL: baseUrl,
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


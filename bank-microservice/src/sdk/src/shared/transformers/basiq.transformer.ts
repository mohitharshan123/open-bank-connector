import { Injectable, Logger } from '@nestjs/common';
import {
    BasiqAccount,
    BasiqBalance,
    BasiqJob,
} from '../types/basiq';
import {
    StandardAccount,
    StandardBalance,
    StandardJob,
} from '../types/common';
import { BaseTransformer } from './base.transformer';

/**
 * Transformer for Basiq API responses to standard format
 */
@Injectable()
export class BasiqTransformer extends BaseTransformer<
    BasiqAccount,
    BasiqBalance
> {
    private logger: Logger;

    constructor(logger?: Logger) {
        super('basiq');
        this.logger = logger || new Logger(BasiqTransformer.name);
    }

    transformAccounts(accounts: { data: BasiqAccount[] }): StandardAccount[] {
        const accountData = accounts.data || [];
        this.logger.debug(`[BasiqTransformer] Transforming ${accountData.length} account(s)`, {
            accountCount: accountData.length,
        });

        return accountData.map(account => {
            let balance = 0;
            if (account.balance != null) {
                if (typeof account.balance === 'number') {
                    balance = account.balance;
                } else if (typeof account.balance === 'string') {
                    balance = parseFloat(account.balance) || 0;
                }
            }

            const accountName = account.nickname
                || account.name
                || account.accountName
                || account.account_details?.business_details?.business_name_english
                || account.account_details?.business_details?.business_name
                || '';

            const accountNumber = account.account_number
                || account.accountNumber
                || account.id
                || '';

            const currency = account.currency
                || account.account_details?.currency
                || '';

            const type = account.accountType
                || account.type
                || account.account_details?.legal_entity_type?.toLowerCase()
                || '';

            return {
                id: account.id || '',
                accountNumber,
                accountName,
                balance,
                currency,
                type,
                provider: this.providerName,
            };
        });
    }

    transformBalances(balances: BasiqBalance[] | { data: BasiqBalance[] }): StandardBalance[] {
        const balancesData = Array.isArray(balances) ? balances : (balances as any).data || [];

        return balancesData.map((balance: BasiqBalance) => ({
            available: balance.available_amount || 0,
            current: balance.total_amount || 0,
            currency: balance.currency || '',
            provider: this.providerName,
        }));
    }

    transformJobs(jobs: any): StandardJob[] {
        let jobsArray: any[];

        if (Array.isArray(jobs)) {
            jobsArray = jobs;
        } else if (jobs && typeof jobs === 'object' && Array.isArray(jobs.data)) {
            jobsArray = jobs.data;
        } else {
            jobsArray = [jobs];
        }

        this.logger.debug(`[BasiqTransformer] Transforming ${jobsArray.length} job(s)`, {
            jobCount: jobsArray.length,
        });

        return jobsArray.map((job: any) => {
            let status = 'success';
            if (job.steps && Array.isArray(job.steps)) {
                const failedStep = job.steps.find((s: any) => s.status !== 'success');
                if (failedStep) {
                    status = failedStep.status;
                }
            } else if (job.status) {
                status = job.status;
            }

            return {
                id: job.id || '',
                type: job.type || job.jobType || 'unknown',
                status,
                created: job.created || job.createdDate || '',
                updated: job.updated || job.updatedDate || '',
                steps: job.steps,
                provider: this.providerName,
            };
        });
    }
}

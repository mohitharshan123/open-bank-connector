import { HttpService } from '@nestjs/axios';
import { Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { HttpRequestConfig, HttpResponse, IHttpClient } from '../sdk';

export class NestJsHttpAdapter implements IHttpClient {
    private readonly logger = new Logger(NestJsHttpAdapter.name);

    constructor(private readonly httpService: HttpService) { }

    private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
        if (!headers) return {};
        const sanitized = { ...headers };
        if (sanitized['x-api-key']) {
            sanitized['x-api-key'] = '***masked***';
        }
        if (sanitized['Authorization']) {
            sanitized['Authorization'] = sanitized['Authorization']
                .replace(/Bearer\s+.+/, 'Bearer ***masked***')
                .replace(/Basic\s+.+/, 'Basic ***masked***');
        }
        return sanitized;
    }

    async request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
        const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
        const sanitizedHeaders = this.sanitizeHeaders(config.headers);

        this.logger.debug(
            `→ ${config.method?.toUpperCase() || 'REQUEST'} ${fullUrl}`,
            {
                headers: sanitizedHeaders,
                params: config.params,
                hasData: !!config.data,
            },
        );

        try {
            const response = await firstValueFrom(
                this.httpService.request<T>({
                    method: config.method as any,
                    url: config.url,
                    baseURL: config.baseURL,
                    headers: config.headers,
                    params: config.params,
                    data: config.data,
                    timeout: config.timeout,
                }),
            );

            const responseData = response.data;
            const dataPreview = typeof responseData === 'object'
                ? JSON.stringify(responseData).substring(0, 200)
                : String(responseData).substring(0, 200);

            this.logger.log(
                `← ${config.method?.toUpperCase() || 'RESPONSE'} ${fullUrl} ${response.status} ${response.statusText}`,
                {
                    status: response.status,
                    statusText: response.statusText,
                    dataPreview: dataPreview + (dataPreview.length >= 200 ? '...' : ''),
                },
            );

            return {
                data: response.data,
                status: response.status,
                statusText: response.statusText,
                headers: response.headers as Record<string, string>,
            };
        } catch (error: any) {
            this.logger.error(
                `✗ ${config.method?.toUpperCase() || 'REQUEST'} ${fullUrl} FAILED`,
                {
                    error: error.message,
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    responseData: error.response?.data,
                },
            );
            throw error;
        }
    }

    async get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>({
            method: 'GET',
            url,
            ...config,
        });
    }

    async post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>({
            method: 'POST',
            url,
            data,
            ...config,
        });
    }

    async put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>({
            method: 'PUT',
            url,
            data,
            ...config,
        });
    }

    async delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>({
            method: 'DELETE',
            url,
            ...config,
        });
    }
}


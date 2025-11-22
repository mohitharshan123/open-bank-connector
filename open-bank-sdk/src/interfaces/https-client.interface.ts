/**
 * HTTP Client interface for making requests
 * Allows the SDK to work with different HTTP clients (axios, NestJS HttpService, etc.)
 */
export interface IHttpClient {
    request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>>;
    get<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
    post<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
    put<T = any>(url: string, data?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
    delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>>;
}

export interface HttpRequestConfig {
    method?: string;
    url?: string;
    baseURL?: string;
    headers?: Record<string, string>;
    params?: Record<string, any>;
    data?: any;
    timeout?: number;
}

export interface HttpResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
}


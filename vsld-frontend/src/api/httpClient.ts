import axios, { AxiosRequestConfig } from 'axios'

/* eslint-disable @typescript-eslint/no-explicit-any */
enum HTTPMethod {
    GET = 'get',
    POST = 'post',
    PUT = 'put',
    DELETE = 'delete',
}

export default function useHttpClient() {
    async function httpRequest(url: string, method: HTTPMethod, body?: any, config?: AxiosRequestConfig) {

        const axiosConfig: AxiosRequestConfig = {
            url,
            method,
            data: body ?? undefined,
            ...config
        }

        try {
            const response = await axios(axiosConfig)
            return response.data
        } catch (error: any) {
            if (error.response) {
                throw error.response.data
            }
            throw error
        }
    }

    async function httpGet(url: string) {
        return httpRequest(url, HTTPMethod.GET)
    }
    async function httpPost(url: string, body: any, config?: AxiosRequestConfig) {
        return httpRequest(url, HTTPMethod.POST, body, config)
    }
    async function httpPut(url: string, body: any) {
        return httpRequest(url, HTTPMethod.PUT, body)
    }
    async function httpDelete(url: string) {
        return httpRequest(url, HTTPMethod.DELETE)
    }
    return { httpGet, httpPost, httpPut, httpDelete }
}

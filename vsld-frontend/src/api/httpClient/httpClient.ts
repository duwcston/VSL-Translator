/* eslint-disable @typescript-eslint/no-explicit-any */
enum HTTPMethod {
    GET = 'get',
    POST = 'post',
    PUT = 'put',
    DELETE = 'delete',
}

export default function useHttpClient() {
    function createHeader() {
        const headers: { [key: string]: string } = {}
        return headers
    }

    async function httpRequest(url: string, method: HTTPMethod, body?: any) {
        const headers = createHeader()

        const response = await fetch(url, {
            method,
            headers,
            body: body ?? undefined,
        })

        if (!response.ok) throw await response.json()

        try {
            return await response.json()
        } catch {
            return null
        }
    }

    async function httpGet(url: string) {
        return httpRequest(url, HTTPMethod.GET)
    }
    async function httpPost(url: string, body: any) {
        return httpRequest(url, HTTPMethod.POST, body)
    }
    async function httpPut(url: string, body: any) {
        return httpRequest(url, HTTPMethod.PUT, body)
    }
    async function httpDelete(url: string) {
        return httpRequest(url, HTTPMethod.DELETE)
    }
    return { httpGet, httpPost, httpPut, httpDelete }
}

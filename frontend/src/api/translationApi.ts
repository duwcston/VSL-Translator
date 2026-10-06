import useHttpClient from './httpClient'
import { SupportedSignsResponse, TranslationResponse } from '../types/Translation'
import { API_TRANSLATIONS_URL } from './constants'

const url = import.meta.env.VITE_BACKEND_URL

const useTranslationApi = () => {
  const httpClient = useHttpClient()

  async function getSupportedSigns(): Promise<SupportedSignsResponse> {
    return await httpClient.httpGet(`${url}/${API_TRANSLATIONS_URL}/signs`)
  }

  async function translate(labels: string[]): Promise<TranslationResponse> {
    return await httpClient.httpPost(`${url}/${API_TRANSLATIONS_URL}`, { labels })
  }

  return {
    getSupportedSigns,
    translate,
  }
}

export default useTranslationApi

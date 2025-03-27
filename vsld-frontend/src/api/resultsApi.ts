import useHttpClient from './httpClient'
import { DetectionResponse } from '../types/DetectionResponse'

const url = import.meta.env.VITE_BACKEND_URL

const useResultsApi = () => {
  const httpClient = useHttpClient()

  async function getResults() {
    return await httpClient.httpGet(`${url}/yolo/get_predict`)
  }

  async function uploadFile(
    file: File,
  ): Promise<DetectionResponse> {
    const formData = new FormData()
    formData.append('file', file)

    return await httpClient.httpPost(`${url}/yolo/predict`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
    })
  }

  return {
    getResults,
    uploadFile,
  }
}

export default useResultsApi

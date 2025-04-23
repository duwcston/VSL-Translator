import useHttpClient from './httpClient'
import { DetectionResponse } from '../types/DetectionResponse'

const url = import.meta.env.VITE_BACKEND_URL

const useResultsApi = () => {
  const httpClient = useHttpClient()

  async function getResult() {
    return `${url}/yolo/result`
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
    getResult,
    uploadFile,
  }
}

export default useResultsApi

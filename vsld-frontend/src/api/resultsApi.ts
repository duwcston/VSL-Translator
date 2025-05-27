import useHttpClient from './httpClient'
import { DetectionResponse } from '../types/DetectionResponse'

const url = import.meta.env.VITE_BACKEND_URL

const useResultsApi = () => {
  const httpClient = useHttpClient()

  function getResult() {
    return `${url}/v1/detections/result?t=${new Date().getTime()}`
  }
  async function uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<DetectionResponse> {
    const formData = new FormData()
    formData.append('file', file)

    return await httpClient.httpPost(`${url}/v1/detections`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    })
  }

  return {
    getResult,
    uploadFile,
  }
}

export default useResultsApi

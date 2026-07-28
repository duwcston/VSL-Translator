import useHttpClient from './httpClient'
import { JobProgressResponse, UploadJobResponse } from '../types/DetectionResponse'
import { API_DETECTIONS_URL } from './constants'

const url = import.meta.env.VITE_BACKEND_URL

const useResultsApi = () => {
  const httpClient = useHttpClient()

  function getResult() {
    return `${url}/${API_DETECTIONS_URL}/result?t=${new Date().getTime()}`
  }
  async function uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<UploadJobResponse> {
    const formData = new FormData()
    formData.append('file', file)

    return await httpClient.httpPost(`${url}/${API_DETECTIONS_URL}`, formData, {
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

  async function getJobProgress(jobId: string): Promise<JobProgressResponse> {
    return await httpClient.httpGet(`${url}/${API_DETECTIONS_URL}/${jobId}/progress`)
  }

  return {
    getResult,
    uploadFile,
    getJobProgress,
  }
}

export default useResultsApi

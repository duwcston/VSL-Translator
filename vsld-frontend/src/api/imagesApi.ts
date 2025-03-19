import useHttpClient from './httpClient/httpClient'
import { DetectionResponse } from './model/DetectionResponse'

const url = import.meta.env.VITE_BACKEND_URL

const useImagesApi = () => {
  const httpClient = useHttpClient()

  async function getImages() {
    return await httpClient.httpGet(`${url}/yolo/get_predict`)
  }

  async function uploadImage(
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
    getImages,
    uploadImage,
  }
}

export default useImagesApi

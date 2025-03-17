export enum EUploadStatus {
    Idle = 'idle',
    Uploading = 'uploading',
    Success = 'success',
    Error = 'error',
}

export interface FileIntermediate {
    id: string
    file: File
    status: EUploadStatus
    task?: {
        cancel: () => Promise<void>
        retry: () => Promise<void>
    }
}
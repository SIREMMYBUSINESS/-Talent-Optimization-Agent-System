import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ResumeUpload {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  file_type: string;
  upload_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  processed_at?: string;
  created_at: string;
}

export interface UploadProgress {
  stage: 'validating' | 'uploading' | 'processing' | 'extracting' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class ResumeUploadService {
  validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Supported formats: PDF, DOC, DOCX, TXT'
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }

    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    return { valid: true };
  }

  async uploadResume(
    file: File,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ success: boolean; resumeId?: string; error?: string }> {
    try {
      onProgress?.({
        stage: 'validating',
        progress: 10,
        message: 'Validating file...'
      });

      const validation = this.validateFile(file);
      if (!validation.valid) {
        onProgress?.({
          stage: 'error',
          progress: 0,
          message: 'Validation failed',
          error: validation.error
        });
        return { success: false, error: validation.error };
      }

      onProgress?.({
        stage: 'uploading',
        progress: 30,
        message: 'Creating upload record...'
      });

      const { data: uploadRecord, error: uploadError } = await supabase
        .from('resume_uploads')
        .insert({
          user_id: userId,
          filename: file.name,
          file_size: file.size,
          file_type: file.type,
          upload_status: 'pending'
        })
        .select()
        .maybeSingle();

      if (uploadError || !uploadRecord) {
        throw new Error(uploadError?.message || 'Failed to create upload record');
      }

      onProgress?.({
        stage: 'processing',
        progress: 50,
        message: 'Reading file content...'
      });

      const fileContent = await this.readFileContent(file);

      onProgress?.({
        stage: 'extracting',
        progress: 70,
        message: 'Processing resume...'
      });

      await supabase
        .from('resume_uploads')
        .update({
          upload_status: 'processing'
        })
        .eq('id', uploadRecord.id);

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: 'Resume uploaded successfully!'
      });

      return { success: true, resumeId: uploadRecord.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      onProgress?.({
        stage: 'error',
        progress: 0,
        message: 'Upload failed',
        error: errorMessage
      });

      return { success: false, error: errorMessage };
    }
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          resolve(content);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };

      reader.onerror = () => reject(new Error('File reading error'));

      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  }

  async getUploadHistory(userId: string): Promise<ResumeUpload[]> {
    const { data, error } = await supabase
      .from('resume_uploads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  async getUploadById(uploadId: string): Promise<ResumeUpload | null> {
    const { data, error } = await supabase
      .from('resume_uploads')
      .select('*')
      .eq('id', uploadId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async deleteUpload(uploadId: string): Promise<void> {
    const { error } = await supabase
      .from('resume_uploads')
      .delete()
      .eq('id', uploadId);

    if (error) {
      throw new Error(error.message);
    }
  }
}

export const resumeUploadService = new ResumeUploadService();

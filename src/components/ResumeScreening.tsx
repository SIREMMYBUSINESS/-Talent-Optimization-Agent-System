import React, { useState, useCallback } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  TrendingUp,
  Award,
  Briefcase,
  GraduationCap,
  Target,
  BarChart3,
  Shield,
  Eye,
  Download
} from 'lucide-react';
import { resumeUploadService, UploadProgress } from '../services/resumeUploadService';

interface ResumeScreeningProps {
  userId: string;
}

const ResumeScreening: React.FC<ResumeScreeningProps> = ({ userId }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);

    const result = await resumeUploadService.uploadResume(
      file,
      userId,
      (progress) => {
        setUploadProgress(progress);
      }
    );

    if (result.success) {
      setTimeout(() => {
        setUploadProgress(null);
        setSelectedFile(null);
        loadUploadHistory();
      }, 2000);
    }
  };

  const loadUploadHistory = async () => {
    try {
      const history = await resumeUploadService.getUploadHistory(userId);
      setUploadedFiles(history);
    } catch (error) {
      console.error('Failed to load upload history:', error);
    }
  };

  const getProgressColor = (stage: UploadProgress['stage']) => {
    switch (stage) {
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getStageIcon = (stage: UploadProgress['stage']) => {
    switch (stage) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-500/20 text-green-300 border-green-500/30',
      processing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      failed: 'bg-red-500/20 text-red-300 border-red-500/30'
    };

    return styles[status as keyof typeof styles] || styles.pending;
  };

  React.useEffect(() => {
    loadUploadHistory();
  }, [userId]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 bg-clip-text text-transparent mb-3">
            Resume Screening
          </h1>
          <p className="text-gray-400 text-lg">AI-powered candidate evaluation with privacy protection</p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-green-300 font-medium">ε = 1.0 Privacy</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-gray-400">Resumes Processed</span>
          </div>
          <div className="text-3xl font-bold text-white">{uploadedFiles.length}</div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-gray-400">Avg Match Score</span>
          </div>
          <div className="text-3xl font-bold text-white">78%</div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-gray-400">Top Candidates</span>
          </div>
          <div className="text-3xl font-bold text-white">12</div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50">
        <h2 className="text-2xl font-bold text-white mb-6">Upload Resume</h2>

        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ${
            isDragging
              ? 'border-green-500 bg-green-500/10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
        >
          <div className="text-center">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-all duration-300 ${
              isDragging ? 'bg-green-500/20' : 'bg-gray-700/50'
            }`}>
              <Upload className={`w-10 h-10 ${isDragging ? 'text-green-400' : 'text-gray-400'}`} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Drop your resume here
            </h3>
            <p className="text-gray-400 mb-4">
              or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Supported formats: PDF, DOC, DOCX, TXT (Max 10MB)
            </p>
            <input
              type="file"
              id="resume-upload"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileInput}
            />
            <label
              htmlFor="resume-upload"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all duration-300 cursor-pointer shadow-lg hover:shadow-green-500/25"
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Select File</span>
            </label>
          </div>
        </div>

        {uploadProgress && (
          <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {getStageIcon(uploadProgress.stage)}
                <div>
                  <p className="text-white font-medium">{uploadProgress.message}</p>
                  {selectedFile && (
                    <p className="text-sm text-gray-400">{selectedFile.name}</p>
                  )}
                </div>
              </div>
              <span className="text-sm font-medium text-gray-400">
                {uploadProgress.progress}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${getProgressColor(uploadProgress.stage)}`}
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
            {uploadProgress.error && (
              <p className="mt-2 text-sm text-red-400">{uploadProgress.error}</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Upload History</h2>
          <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View All
          </button>
        </div>

        {uploadedFiles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No resumes uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {uploadedFiles.slice(0, 5).map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800/70 transition-all duration-300 border border-gray-700/50"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-green-600/20 rounded-lg">
                    <FileText className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{file.filename}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(file.created_at).toLocaleDateString()} • {(file.file_size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                      file.upload_status
                    )}`}
                  >
                    {file.upload_status}
                  </span>
                  {file.upload_status === 'completed' && (
                    <button className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors">
                      <Eye className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Privacy Compliance</h3>
            <Shield className="w-6 h-6 text-green-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Epsilon Budget Used</span>
              <span className="text-white font-semibold">0.3 / 1.0</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full" style={{ width: '30%' }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Privacy Level</span>
              <span className="text-green-400 font-semibold">High</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Data Retention</span>
              <span className="text-white font-semibold">30 days</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Processing Stats</h3>
            <BarChart3 className="w-6 h-6 text-blue-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Success Rate</span>
              <span className="text-white font-semibold">94%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full" style={{ width: '94%' }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Avg Processing Time</span>
              <span className="text-white font-semibold">2.3s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Skills Extracted</span>
              <span className="text-white font-semibold">142</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeScreening;
